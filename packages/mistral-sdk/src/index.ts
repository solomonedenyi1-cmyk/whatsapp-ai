// Mistral SDK Wrapper for WhatsApp AI Bot
// This package provides a clean interface to the Mistral AI API

import { Mistral } from "@mistralai/mistralai";
import { z } from "zod";

// Configuration schema for Mistral SDK
const MistralConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().default("mistral-large-latest"),
  timeout: z.number().default(30000),
  maxRetries: z.number().default(3)
});

type MistralConfig = z.infer<typeof MistralConfigSchema>;

// Message schema
const MessageSchema = z.object({
  role: z.union([z.literal("user"), z.literal("assistant"), z.literal("system")]),
  content: z.string()
});

type Message = z.infer<typeof MessageSchema>;

// Response schema
const MistralResponseSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.string(),
        content: z.string()
      }),
      finish_reason: z.string()
    })
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  })
});

type MistralResponse = z.infer<typeof MistralResponseSchema>;

export class MistralSDK {
  private client: Mistral;
  private config: MistralConfig;

  constructor(config: Partial<MistralConfig> = {}) {
    this.config = MistralConfigSchema.parse({
      apiKey: process.env.MISTRAL_API_KEY || config.apiKey,
      model: config.model || "mistral-large-latest",
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3
    });

    if (!this.config.apiKey) {
      throw new Error("Mistral API key is required. Set MISTRAL_API_KEY environment variable.");
    }

    this.client = new Mistral({
      apiKey: this.config.apiKey
    });
  }

  /**
   * Send a chat message to Mistral AI
   * @param messages Array of message objects
   * @param options Additional options
   * @returns AI response
   */
  async chatComplete(messages: Message[], options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: "text" | "json_object" };
  } = {}): Promise<string> {
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
    } catch (error) {
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
  async sendMessage(userMessage: string, context: Message[] = []): Promise<string> {
    const messages: Message[] = [
      ...context,
      { role: "user", content: userMessage }
    ];

    return this.chatComplete(messages);
  }

  /**
   * Check if API is available
   * @returns True if API is available
   */
  async checkApiStatus(): Promise<boolean> {
    try {
      // Simple API call to check connectivity
      await this.client.chat.complete({
        model: this.config.model,
        messages: [{ role: "user", content: "ping" }],
        maxTokens: 1
      });
      return true;
    } catch (error) {
      console.error("API health check failed:", error);
      return false;
    }
  }

  /**
   * Handle errors from Mistral API
   * @param error Error object
   * @returns User-friendly error
   */
  private handleError(error: unknown): Error {
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
  getConfig(): MistralConfig {
    return { ...this.config, apiKey: "***" };
  }
}

// Export types for external use
export type { Message, MistralConfig, MistralResponse };