declare module '@whatsapp-ai/config' {
  export const configManager: any;
  export type EnvConfig = any;
  export type BusinessContext = any;
  export type SystemPromptConfig = any;
  export type CompleteConfig = any;
}

declare module '@whatsapp-ai/mistral-sdk' {
  export class MistralSDK {
    constructor(config?: any);
    sendMessage(userMessage: string, context?: any[]): Promise<string>;
    chatComplete(messages: any[], options?: any): Promise<string>;
    checkApiStatus(): Promise<boolean>;
    getConfig(): any;
  }
  export type Message = any;
  export type MistralConfig = any;
  export type MistralResponse = any;
}