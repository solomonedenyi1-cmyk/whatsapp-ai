const config = require('../config/config');

let mistralModulePromise = null;

async function loadMistralModule() {
    if (!mistralModulePromise) {
        mistralModulePromise = import('@mistralai/mistralai');
    }

    return mistralModulePromise;
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

            const content = result?.choices?.[0]?.message?.content;
            if (typeof content === 'string' && content.trim().length > 0) {
                return content;
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
