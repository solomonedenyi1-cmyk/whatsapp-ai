const config = require('../config/config');

let mistralModulePromise = null;

async function loadMistralModule() {
    if (!mistralModulePromise) {
        mistralModulePromise = import('@mistralai/mistralai');
    }

    return mistralModulePromise;
}

function normalizeMistralContent(content) {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        const parts = content
            .map((item) => {
                if (typeof item === 'string') {
                    return item;
                }

                const text = item?.text;
                if (typeof text === 'string') {
                    return text;
                }

                const value = item?.content;
                if (typeof value === 'string') {
                    return value;
                }

                return null;
            })
            .filter((v) => typeof v === 'string' && v.trim().length > 0);

        return parts.join('\n');
    }

    if (content && typeof content === 'object') {
        const text = content?.text;
        if (typeof text === 'string') {
            return text;
        }
    }

    return '';
}

function getMistralToolCalls(message) {
    const candidates = [message?.tool_calls, message?.toolCalls];
    const nonEmpty = candidates.find((value) => Array.isArray(value) && value.length > 0);
    if (nonEmpty) {
        return nonEmpty;
    }

    const anyArray = candidates.find((value) => Array.isArray(value));
    return anyArray || [];
}

function getMistralToolCallId(toolCall) {
    const candidate = toolCall?.id ?? toolCall?.tool_call_id ?? toolCall?.toolCallId;
    if (typeof candidate === 'string') {
        return candidate;
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return String(candidate);
    }

    return null;
}

class MistralAgentService {
    constructor({ mistralClient } = {}) {
        this.apiKey = config.mistral.apiKey;
        this.agentId = config.mistral.agentId;
        this.timeout = config.mistral.timeout;
        this.warningTimeout = config.mistral.warningTimeout;

        this.client = mistralClient || null;
    }

    validateConfig() {
        if (!this.apiKey) {
            throw new Error('Missing MISTRAL_API_KEY in environment.');
        }

        if (!this.agentId) {
            throw new Error('Missing MISTRAL_AGENT_ID in environment.');
        }
    }

    async sendChatMessageWithTools(messages, { tools, dispatcher, warningCallback = null } = {}) {
        let warningTimer = null;
        let warningSent = false;

        const toolMessages = [];
        const maxIterations = 12;

        try {
            this.validateConfig();

            if (!Array.isArray(tools)) {
                throw new Error('Tools must be an array');
            }

            if (!dispatcher || typeof dispatcher.dispatchToolCall !== 'function') {
                throw new Error('Dispatcher with dispatchToolCall(toolCall) is required');
            }

            if (warningCallback) {
                warningTimer = setTimeout(() => {
                    if (!warningSent) {
                        warningSent = true;
                        console.log('⏰ 5-minute warning sent to user');
                        warningCallback();
                    }
                }, this.warningTimeout);
            }

            const client = await this.getClient();

            let result = await client.agents.complete({
                agentId: this.agentId,
                messages,
                tools,
                stream: false,
            });

            let message = result?.choices?.[0]?.message;

            for (let i = 0; i < maxIterations; i += 1) {
                const toolCalls = getMistralToolCalls(message);
                if (toolCalls.length === 0) {
                    break;
                }

                if (config.env?.debug) {
                    console.log('mistral.tool_calls', toolCalls.map((toolCall) => ({
                        id: toolCall?.id,
                        tool_call_id: toolCall?.tool_call_id,
                        toolCallId: toolCall?.toolCallId,
                        functionName: toolCall?.function?.name,
                    })));
                }

                messages.push(message);

                const toolResults = await Promise.all(
                    toolCalls.map(async (toolCall) => {
                        const functionName = toolCall?.function?.name;
                        try {
                            const value = await dispatcher.dispatchToolCall(toolCall);
                            return {
                                toolCall,
                                functionName,
                                content: JSON.stringify(value),
                            };
                        } catch (error) {
                            const safeError = {
                                success: false,
                                error: error?.message || String(error),
                            };

                            return {
                                toolCall,
                                functionName,
                                content: JSON.stringify(safeError),
                            };
                        }
                    })
                );

                for (const toolResult of toolResults) {
                    const toolCallId = getMistralToolCallId(toolResult.toolCall);
                    if (typeof toolCallId !== 'string' || toolCallId.trim().length === 0) {
                        const functionName = toolResult?.functionName;
                        const error = new Error(`Missing tool_call_id for tool result (${functionName || 'unknown'})`);
                        error.details = {
                            toolCallKeys: toolResult?.toolCall && typeof toolResult.toolCall === 'object'
                                ? Object.keys(toolResult.toolCall)
                                : null,
                        };
                        throw error;
                    }

                    const toolMessage = {
                        role: 'tool',
                        name: toolResult.functionName,
                        content: toolResult.content,
                        tool_call_id: toolCallId,
                        toolCallId: toolCallId,
                    };

                    toolMessages.push(toolMessage);
                    messages.push(toolMessage);
                }

                result = await client.agents.complete({
                    agentId: this.agentId,
                    messages,
                    tools,
                    stream: false,
                });

                message = result?.choices?.[0]?.message;
            }

            if (warningTimer) {
                clearTimeout(warningTimer);
                warningTimer = null;
            }

            const normalized = normalizeMistralContent(message?.content);
            if (typeof normalized === 'string' && normalized.trim().length > 0) {
                return { content: normalized, toolMessages };
            }

            if (config.env?.debug) {
                console.log('mistral.invalid_content', {
                    contentType: typeof message?.content,
                    isArray: Array.isArray(message?.content),
                    contentPreview: JSON.stringify(message?.content)?.slice(0, 400),
                });
            }

            throw new Error('Invalid response format from Mistral Agents API');
        } catch (error) {
            if (warningTimer) {
                clearTimeout(warningTimer);
                warningTimer = null;
            }

            console.error('Error calling Mistral Agents API:', error.message);
            return { content: this.getFallbackResponse(error), toolMessages };
        } finally {
            if (warningTimer) {
                clearTimeout(warningTimer);
            }
        }
    }

    async getClient() {
        if (this.client) {
            return this.client;
        }

        this.validateConfig();

        const mod = await loadMistralModule();
        const Mistral = mod?.Mistral || mod?.default?.Mistral || mod?.default;

        if (!Mistral) {
            throw new Error('Failed to load @mistralai/mistralai SDK (Mistral export not found).');
        }

        this.client = new Mistral({ apiKey: this.apiKey });
        return this.client;
    }

    async sendChatMessage(messages, warningCallback = null) {
        let warningTimer = null;
        let warningSent = false;

        try {
            this.validateConfig();

            if (warningCallback) {
                warningTimer = setTimeout(() => {
                    if (!warningSent) {
                        warningSent = true;
                        console.log('⏰ 5-minute warning sent to user');
                        warningCallback();
                    }
                }, this.warningTimeout);
            }

            const client = await this.getClient();
            const result = await client.agents.complete({
                agentId: this.agentId,
                messages,
                stream: false,
            });

            if (warningTimer) {
                clearTimeout(warningTimer);
                warningTimer = null;
            }

            const normalized = normalizeMistralContent(result?.choices?.[0]?.message?.content);
            if (typeof normalized === 'string' && normalized.trim().length > 0) {
                return normalized;
            }

            if (config.env?.debug) {
                const raw = result?.choices?.[0]?.message?.content;
                console.log('mistral.invalid_content', {
                    contentType: typeof raw,
                    isArray: Array.isArray(raw),
                    contentPreview: JSON.stringify(raw)?.slice(0, 400),
                });
            }

            throw new Error('Invalid response format from Mistral Agents API');
        } catch (error) {
            if (warningTimer) {
                clearTimeout(warningTimer);
                warningTimer = null;
            }

            console.error('Error calling Mistral Agents API:', error.message);
            return this.getFallbackResponse(error);
        } finally {
            if (warningTimer) {
                clearTimeout(warningTimer);
            }
        }
    }

    async sendMessage(userMessage, conversationHistory = [], warningCallback = null) {
        const messages = [...conversationHistory, { role: 'user', content: userMessage }];
        return this.sendChatMessage(messages, warningCallback);
    }

    async sendMessageWithTools(userMessage, conversationHistory = [], { tools, dispatcher, warningCallback = null } = {}) {
        const messages = [...conversationHistory, { role: 'user', content: userMessage }];
        return this.sendChatMessageWithTools(messages, { tools, dispatcher, warningCallback });
    }

    getFallbackResponse(error) {
        const fallbackMessages = [
            'Desculpe, estou enfrentando dificuldades técnicas no momento. Tente novamente em alguns instantes.',
            'Ops! Parece que há um problema com minha conexão. Por favor, tente novamente.',
            'Estou temporariamente indisponível. Tente enviar sua mensagem novamente em breve.',
        ];

        const randomIndex = Math.floor(Math.random() * fallbackMessages.length);
        return fallbackMessages[randomIndex];
    }

    async checkApiStatus() {
        try {
            const client = await this.getClient();
            const result = await client.agents.complete({
                agentId: this.agentId,
                messages: [{ role: 'user', content: 'ping' }],
                stream: false,
            });

            return Boolean(result?.choices?.[0]?.message?.content);
        } catch (error) {
            console.error('Mistral Agents API health check failed:', error.message);
            return false;
        }
    }

    async testConnection() {
        return this.checkApiStatus();
    }
}

module.exports = MistralAgentService;
