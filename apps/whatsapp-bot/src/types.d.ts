declare module '@whatsapp-ai/core' {
  export class WhatsAppBotCore {
    constructor();
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    getStatus(): any;
  }
}