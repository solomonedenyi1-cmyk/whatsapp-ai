"use strict";
// Mistral SDK Wrapper for WhatsApp AI Bot
// This package provides a clean interface to the Mistral AI API
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralSDK = void 0;
const mistralai_1 = require("@mistralai/mistralai");
const zod_1 = require("zod");
// Configuration schema for Mistral SDK
const MistralConfigSchema = zod_1.z.object({
    apiKey: zod_1.z.string().min(1, "API key is required"),
    model: zod_1.z.string().default("mistral-large-latest"),
    timeout: zod_1.z.number().default(30000),
    maxRetries: zod_1.z.number().default(3)
});
// Message schema
const MessageSchema = zod_1.z.object({
    role: zod_1.z.union([zod_1.z.literal("user"), zod_1.z.literal("assistant"), zod_1.z.literal("system")]),
    content: zod_1.z.string()
});
// Response schema
const MistralResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    object: zod_1.z.string(),
    created: zod_1.z.number(),
    model: zod_1.z.string(),
    choices: zod_1.z.array(zod_1.z.object({
        index: zod_1.z.number(),
        message: zod_1.z.object({
            role: zod_1.z.string(),
            content: zod_1.z.string()
        }),
        finish_reason: zod_1.z.string()
    })),
    usage: zod_1.z.object({
        prompt_tokens: zod_1.z.number(),
        completion_tokens: zod_1.z.number(),
        total_tokens: zod_1.z.number()
    })
});
class MistralSDK {
    constructor(config = {}) {
        this.config = MistralConfigSchema.parse({
            apiKey: process.env.MISTRAL_API_KEY || config.apiKey,
            model: config.model || "mistral-large-latest",
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3
        });
        if (!this.config.apiKey) {
            throw new Error("Mistral API key is required. Set MISTRAL_API_KEY environment variable.");
        }
        this.client = new mistralai_1.Mistral({
            apiKey: this.config.apiKey
        });
    }
    /**
     * Send a chat message to Mistral AI
     * @param messages Array of message objects
     * @param options Additional options
     * @returns AI response
     */
    async chatComplete(messages, options = {}) {
        try {
            const response = await this.client.chat.complete({
                model: options.model || this.config.model,
                messages: messages,
                temperature: options.temperature || 0.7,
                maxTokens: options.maxTokens,
                responseFormat: options.responseFormat
            });
            const validatedResponse = MistralResponseSchema.parse(response);
            if (validatedResponse.choices && validatedResponse.choices.length > 0) {
                return validatedResponse.choices[0].message.content;
            }
            throw new Error("No response from Mistral AI");
        }
        catch (error) {
            console.error("Error calling Mistral AI:", error);
            throw this.handleError(error);
        }
    }
    /**
     * Send a simple text message
     * @param userMessage User message
     * @param context Previous conversation context
     * @returns AI response
     */
    async sendMessage(userMessage, context = []) {
        const messages = [
            ...context,
            { role: "user", content: userMessage }
        ];
        return this.chatComplete(messages);
    }
    /**
     * Check if API is available
     * @returns True if API is available
     */
    async checkApiStatus() {
        try {
            // Simple API call to check connectivity
            await this.client.chat.complete({
                model: this.config.model,
                messages: [{ role: "user", content: "ping" }],
                maxTokens: 1
            });
            return true;
        }
        catch (error) {
            console.error("API health check failed:", error);
            return false;
        }
    }
    /**
     * Handle errors from Mistral API
     * @param error Error object
     * @returns User-friendly error
     */
    handleError(error) {
        if (error instanceof Error) {
            if (error.message.includes("401")) {
                return new Error("Invalid API key. Please check your MISTRAL_API_KEY.");
            }
            if (error.message.includes("429")) {
                return new Error("Rate limit exceeded. Please try again later.");
            }
            if (error.message.includes("500")) {
                return new Error("Mistral AI service is temporarily unavailable.");
            }
        }
        return new Error("Failed to communicate with Mistral AI.");
    }
    /**
     * Get current configuration
     * @returns Current configuration
     */
    getConfig() {
        return { ...this.config, apiKey: "***" };
    }
}
exports.MistralSDK = MistralSDK;
