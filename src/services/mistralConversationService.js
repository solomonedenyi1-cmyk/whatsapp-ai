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

function safeJsonStringify(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return JSON.stringify({ success: false, error: 'Unable to serialize tool result' });
    }
}

function getOutputType(output) {
    return output?.type || output?.Type;
}

function getToolCallId(output) {
    return output?.toolCallId || output?.tool_call_id || output?.toolCallID || output?.toolCallid;
}

function getFunctionName(output) {
    return output?.name;
}

function getFunctionArgs(output) {
    return output?.arguments;
}

function isFunctionCallOutput(output) {
    return getOutputType(output) === 'function.call';
}

function isMessageOutput(output) {
    return getOutputType(output) === 'message.output';
}

function extractLastAssistantMessage(outputs) {
    if (!Array.isArray(outputs) || outputs.length === 0) {
        return null;
    }

    for (let i = outputs.length - 1; i >= 0; i -= 1) {
        const out = outputs[i];
        if (isMessageOutput(out)) {
            return out;
        }
    }

    return null;
}

class MistralConversationService {
    constructor({ mistralClient, persistenceService } = {}) {
        this.apiKey = config.mistral.apiKey;
        this.agentId = config.mistral.agentId;

        this.store = config.mistral.conversationStore;
        this.handoffExecution = config.mistral.conversationHandoffExecution;
        this.warningTimeout = config.mistral.warningTimeout;

        this.client = mistralClient || null;
        this.persistenceService = persistenceService || null;
    }

    validateConfig() {
        if (!this.apiKey) {
            throw new Error('Missing MISTRAL_API_KEY in environment.');
        }

        if (!this.agentId) {
            throw new Error('Missing MISTRAL_AGENT_ID in environment.');
        }

        if (!this.persistenceService) {
            throw new Error('Missing persistenceService for conversation id storage.');
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

    async getConversationId(chatId) {
        this.validateConfig();
        return await this.persistenceService.loadMistralConversationId(chatId);
    }

    async setConversationId(chatId, conversationId) {
        this.validateConfig();
        await this.persistenceService.saveMistralConversationId(chatId, conversationId);
    }

    async clearConversationId(chatId) {
        this.validateConfig();
        await this.persistenceService.clearMistralConversationId(chatId);
    }

    async deleteConversation(chatId) {
        this.validateConfig();

        const conversationId = await this.getConversationId(chatId);
        if (!conversationId) {
            return false;
        }

        try {
            const client = await this.getClient();
            await client.beta.conversations.delete({ conversationId });
        } catch (error) {
            if (config.env?.debug) {
                console.warn('⚠️ Failed to delete remote conversation:', error?.message || error);
            }
        } finally {
            await this.clearConversationId(chatId);
        }

        return true;
    }

    async sendMessage(
        chatId,
        userMessage,
        {
            tools = [],
            dispatcher = null,
            instructions = null,
            warningCallback = null,
        } = {}
    ) {
        const hasDispatcher = Boolean(dispatcher && typeof dispatcher.dispatchToolCall === 'function');

        const requestedTools = Array.isArray(tools) && tools.length > 0 ? tools : undefined;

        this.validateConfig();

        const client = await this.getClient();

        let warningTimer = null;
        let warningSent = false;

        const store = Boolean(this.store);
        const handoffExecution = this.handoffExecution;

        const firstInput = [{ role: 'user', content: userMessage }];

        let conversationId = await this.getConversationId(chatId);
        let response;

        if (warningCallback) {
            warningTimer = setTimeout(() => {
                if (!warningSent) {
                    warningSent = true;
                    warningCallback();
                }
            }, this.warningTimeout);
        }

        try {
            if (!conversationId) {
                try {
                    response = await client.beta.conversations.start({
                        agentId: this.agentId,
                        inputs: firstInput,
                        store,
                        handoffExecution,
                        instructions: typeof instructions === 'string' && instructions.trim().length > 0 ? instructions : undefined,
                        tools: requestedTools,
                        stream: false,
                    });
                } catch (error) {
                    const message = error?.message || '';
                    const status = error?.status || error?.statusCode;
                    const looksLikeValidation = status === 422 || message.toLowerCase().includes('validation');

                    if (requestedTools && looksLikeValidation) {
                        if (config.env?.debug) {
                            console.warn('⚠️ Conversations.start rejected tools payload, retrying without tools');
                        }

                        response = await client.beta.conversations.start({
                            agentId: this.agentId,
                            inputs: firstInput,
                            store,
                            handoffExecution,
                            instructions: typeof instructions === 'string' && instructions.trim().length > 0 ? instructions : undefined,
                            stream: false,
                        });
                    } else {
                        throw error;
                    }
                }
                conversationId = response?.conversationId;
                if (conversationId) {
                    await this.setConversationId(chatId, conversationId);
                }
            } else {
                response = await client.beta.conversations.append({
                    conversationId,
                    conversationAppendRequest: {
                        inputs: firstInput,
                        store,
                        handoffExecution,
                        stream: false,
                    },
                });

                if (response?.conversationId && response.conversationId !== conversationId) {
                    conversationId = response.conversationId;
                    await this.setConversationId(chatId, conversationId);
                }
            }

            if (config.env?.debug) {
                const outputTypes = Array.isArray(response?.outputs)
                    ? response.outputs.map((out) => getOutputType(out))
                    : [];

                console.log('mistral.conversation.response', {
                    chatId,
                    conversationId,
                    store,
                    handoffExecution,
                    outputTypes,
                });
            }

            const maxIterations = 12;

            for (let i = 0; i < maxIterations; i += 1) {
                const outputs = response?.outputs;
                const functionCalls = Array.isArray(outputs)
                    ? outputs.filter((out) => isFunctionCallOutput(out))
                    : [];

                if (functionCalls.length === 0) {
                    break;
                }

                if (!hasDispatcher) {
                    throw new Error('Tool dispatcher is required to handle function.call outputs from Mistral Conversations API');
                }

                const toolInputs = await Promise.all(
                    functionCalls.map(async (call) => {
                        const toolCallId = getToolCallId(call);
                        const name = getFunctionName(call);
                        const args = getFunctionArgs(call);

                        if (!toolCallId || typeof toolCallId !== 'string') {
                            throw new Error(`Missing toolCallId for function call (${name || 'unknown'})`);
                        }

                        let parsedArgs = {};
                        if (typeof args === 'string' && args.trim().length > 0) {
                            parsedArgs = JSON.parse(args);
                        } else if (args && typeof args === 'object') {
                            parsedArgs = args;
                        }

                        let result;
                        try {
                            result = await dispatcher.dispatchToolCall({
                                toolCallId,
                                id: toolCallId,
                                function: {
                                    name,
                                    arguments: JSON.stringify(parsedArgs),
                                },
                            });
                        } catch (error) {
                            result = { success: false, error: error?.message || String(error) };
                        }

                        return {
                            type: 'function.result',
                            toolCallId,
                            tool_call_id: toolCallId,
                            result: safeJsonStringify(result),
                        };
                    })
                );

                response = await client.beta.conversations.append({
                    conversationId,
                    conversationAppendRequest: {
                        inputs: toolInputs,
                        store,
                        handoffExecution,
                        stream: false,
                    },
                });

                if (response?.conversationId && response.conversationId !== conversationId) {
                    conversationId = response.conversationId;
                    await this.setConversationId(chatId, conversationId);
                }
            }

            const message = extractLastAssistantMessage(response?.outputs);
            const normalized = normalizeMistralContent(message?.content);

            if (typeof normalized === 'string' && normalized.trim().length > 0) {
                return normalized;
            }

            throw new Error('Invalid response format from Mistral Conversations API');
        } finally {
            if (warningTimer) {
                clearTimeout(warningTimer);
            }
        }
    }
}

module.exports = MistralConversationService;
