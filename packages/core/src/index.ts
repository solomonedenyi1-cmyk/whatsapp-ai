// Core functionality for WhatsApp AI Bot
// This package contains the main bot logic and services

import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { configManager } from "@whatsapp-ai/config";
import { MistralSDK } from "@whatsapp-ai/mistral-sdk";

// Import types
type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export class WhatsAppBotCore {
  private client: Client | null;
  private mistralSDK: MistralSDK;
  private isReady: boolean;
  private startTime: number;

  constructor() {
    this.client = null;
    this.isReady = false;
    this.startTime = Date.now();
    
    // Initialize Mistral SDK
    const envConfig = configManager.getEnvConfig();
    this.mistralSDK = new MistralSDK({
      apiKey: envConfig.mistralApiKey
    });
  }

  /**
   * Initialize the WhatsApp bot
   */
  async initialize(): Promise<void> {
    try {
      console.log("🤖 Initializing WhatsApp AI Bot...");
      
      const envConfig = configManager.getEnvConfig();
      
      // Create WhatsApp client
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: envConfig.whatsappSessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu"
          ]
        }
      });

      // Set up event listeners
      this.setupEventListeners();

      // Initialize the client
      await this.client.initialize();
      
      console.log("✅ WhatsApp bot initialized successfully!");
      
    } catch (error) {
      console.error("❌ Failed to initialize WhatsApp bot:", error);
      throw error;
    }
  }

  /**
   * Set up WhatsApp client event listeners
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // QR Code for authentication
    this.client.on("qr", (qr: string) => {
      console.log("📱 Scan this QR code with your WhatsApp:");
      qrcode.generate(qr, { small: true });
    });

    // Client ready
    this.client.on("ready", () => {
      console.log("✅ WhatsApp bot is ready!");
      this.isReady = true;
    });

    // Authentication success
    this.client.on("authenticated", () => {
      console.log("🔐 WhatsApp authenticated successfully");
    });

    // Authentication failure
    this.client.on("auth_failure", (msg: string) => {
      console.error("❌ WhatsApp authentication failed:", msg);
    });

    // Client disconnected
    this.client.on("disconnected", (reason: string) => {
      console.log("📱 WhatsApp client disconnected:", reason);
      this.isReady = false;
    });

    // Incoming messages
    this.client.on("message", async (message: any) => {
      await this.handleMessage(message);
    });

    // Error handling
    this.client.on("error", (error: Error) => {
      console.error("❌ WhatsApp client error:", error);
    });
  }

  /**
   * Handle incoming WhatsApp messages
   * @param message WhatsApp message object
   */
  private async handleMessage(message: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Check if message should be ignored
      if (this.shouldIgnoreMessage(message)) {
        return;
      }

      const chatId = message.from;
      const messageText = this.cleanMessage(message.body);

      const envConfig = configManager.getEnvConfig();
      if (envConfig.debug) {
        console.log(`📨 Received message from ${chatId}: ${messageText}`);
      }

      // Show typing indicator
      if (this.client) {
        await this.client.sendSeen(chatId);
        const chat = await message.getChat();
        await chat.sendStateTyping();
      }

      // Check if it's a command
      if (this.isCommand(messageText)) {
        const response = await this.handleCommand(messageText, chatId);
        await this.sendResponse(chatId, response);
      } else {
        // Regular message - send to AI
        const response = await this.processAIMessage(messageText, chatId);
        await this.sendResponse(chatId, response);
      }

      // Log response time
      const responseTime = Date.now() - startTime;
      if (envConfig.debug) {
        console.log(`⏱️ Response time: ${responseTime}ms`);
      }

    } catch (error) {
      console.error("❌ Error handling message:", error);
      await this.sendErrorResponse(message.from);
    }
  }

  /**
   * Process message with AI
   * @param messageText User message
   * @param chatId WhatsApp chat ID
   * @returns AI response
   */
  private async processAIMessage(messageText: string, chatId: string): Promise<string> {
    try {
      // Generate system prompt
      const systemPrompt = configManager.generateSystemPrompt();
      
      // Create conversation context
      const contextMessages: Message[] = [
        { role: "system", content: systemPrompt }
      ];

      // Add AI response to context
      const aiResponse = await this.mistralSDK.sendMessage(messageText, contextMessages);
      
      return this.formatResponse(aiResponse);
      
    } catch (error) {
      console.error("❌ Error processing AI message:", error);
      return "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.";
    }
  }

  /**
   * Handle commands
   * @param commandText Command text
   * @param chatId WhatsApp chat ID
   * @returns Command response
   */
  private async handleCommand(commandText: string, chatId: string): Promise<string> {
    const envConfig = configManager.getEnvConfig();
    const command = commandText.trim().toLowerCase();

    // Check admin access for sensitive commands
    if (command.startsWith("/") && !this.isAdmin(chatId)) {
      return "❌ Acesso negado. Este comando requer privilégios de administrador.";
    }

    // Handle different commands
    switch (command) {
      case "/help":
        return this.getHelpMessage();
      case "/status":
        return this.getStatusMessage();
      case "/about":
        return this.getAboutMessage();
      case "/reload":
        configManager.reloadConfig();
        return "✅ Configuração recarregada com sucesso!";
      case "/context":
        return this.getContextInfo();
      default:
        return "❌ Comando desconhecido. Use /help para ver comandos disponíveis.";
    }
  }

  /**
   * Check if user is admin
   * @param chatId WhatsApp chat ID
   * @returns True if user is admin
   */
  private isAdmin(chatId: string): boolean {
    const envConfig = configManager.getEnvConfig();
    return chatId === envConfig.adminWhatsAppNumber;
  }

  /**
   * Get help message
   * @returns Help message
   */
  private getHelpMessage(): string {
    return `📋 *Comandos Disponíveis*:

🔹 /help - Mostrar esta mensagem de ajuda
🔹 /status - Verificar status do bot
🔹 /about - Informações sobre o bot
🔹 /reload - Recarregar configuração
🔹 /context - Ver configuração atual`;
  }

  /**
   * Get status message
   * @returns Status message
   */
  private getStatusMessage(): string {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const envConfig = configManager.getEnvConfig();
    
    return `📊 *Status do Bot*:

🤖 *Bot*: ${this.isReady ? "🟢 Online" : "🔴 Offline"}
⏱️ *Tempo de atividade*: ${uptime} segundos
📱 *Modelo AI*: mistral-large-latest
🔒 *Ambiente*: ${envConfig.nodeEnv}`;
  }

  /**
   * Get about message
   * @returns About message
   */
  private getAboutMessage(): string {
    const businessContext = configManager.getBusinessContext();
    
    return `📋 *Sobre o Bot*:

🤖 *Nome*: ${businessContext.identity.name}
🏢 *Empresa*: ${businessContext.business.name}
🌐 *Website*: ${businessContext.business.website}
📧 *Email*: ${businessContext.business.email}

*Descrição*: ${businessContext.business.description}`;
  }

  /**
   * Get context information
   * @returns Context information
   */
  private getContextInfo(): string {
    const businessContext = configManager.getBusinessContext();
    const envConfig = configManager.getEnvConfig();
    
    return `📋 *Configuração Atual*:

🤖 *Identidade AI*:
- Nome: ${businessContext.identity.name}
- Gênero: ${businessContext.identity.gender}
- Personalidade: ${businessContext.identity.personality}

🏢 *Negócio*:
- Nome: ${businessContext.business.name}
- Descrição: ${businessContext.business.description}

📱 *Configuração*:
- Mensagens de contexto: ${envConfig.maxContextMessages}
- Tamanho máximo de mensagem: ${envConfig.messageSplitLength}`;
  }

  /**
   * Check if message should be ignored
   * @param message WhatsApp message object
   * @returns True if message should be ignored
   */
  private shouldIgnoreMessage(message: any): boolean {
    // Ignore messages from ourselves
    if (message.fromMe) return true;
    
    // Ignore empty messages
    if (!message.body || message.body.trim() === "") return true;
    
    // Ignore system messages
    if (message.type !== "chat") return true;
    
    return false;
  }

  /**
   * Clean message text
   * @param text Message text
   * @returns Cleaned text
   */
  private cleanMessage(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\n\r\t]/g, " ");
  }

  /**
   * Check if message is a command
   * @param text Message text
   * @returns True if message is a command
   */
  private isCommand(text: string): boolean {
    return text.trim().startsWith("/");
  }

  /**
   * Format response for WhatsApp
   * @param text Response text
   * @returns Formatted text
   */
  private formatResponse(text: string): string {
    const envConfig = configManager.getEnvConfig();
    
    // Split long messages
    if (text.length > envConfig.messageSplitLength) {
      const parts = [];
      for (let i = 0; i < text.length; i += envConfig.messageSplitLength) {
        parts.push(text.substring(i, i + envConfig.messageSplitLength));
      }
      return parts.join("\n\n---\n\n");
    }
    
    return text;
  }

  /**
   * Send response to WhatsApp chat
   * @param chatId WhatsApp chat ID
   * @param response Response text
   */
  private async sendResponse(chatId: string, response: string): Promise<void> {
    if (!this.client) return;

    try {
      // Split long messages
      const messageParts = this.splitMessage(response);
      
      for (const part of messageParts) {
        await this.client.sendMessage(chatId, part);
        
        // Small delay between parts to avoid rate limiting
        if (messageParts.length > 1) {
          await this.delay(1000);
        }
      }
      
      const envConfig = configManager.getEnvConfig();
      if (envConfig.debug) {
        console.log(`📤 Sent response to ${chatId}: ${response.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.error("❌ Error sending response:", error);
      throw error;
    }
  }

  /**
   * Send error response
   * @param chatId WhatsApp chat ID
   */
  private async sendErrorResponse(chatId: string): Promise<void> {
    if (!this.client) return;

    try {
      const errorMessage = "❌ Ops! Algo deu errado. Tente enviar sua mensagem novamente.";
      await this.client.sendMessage(chatId, errorMessage);
    } catch (error) {
      console.error("❌ Error sending error response:", error);
    }
  }

  /**
   * Split long messages
   * @param text Message text
   * @returns Array of message parts
   */
  private splitMessage(text: string): string[] {
    const envConfig = configManager.getEnvConfig();
    const parts = [];
    
    for (let i = 0; i < text.length; i += envConfig.messageSplitLength) {
      parts.push(text.substring(i, i + envConfig.messageSplitLength));
    }
    
    return parts;
  }

  /**
   * Utility function to add delay
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get bot status
   * @returns Bot status information
   */
  getStatus(): any {
    const conversationStats = { active: 0, total: 0 };
    const performanceStats = { avgResponseTime: 0 };
    const errorStats = { total: 0 };
    
    return {
      isReady: this.isReady,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      conversations: conversationStats,
      performance: performanceStats,
      errors: errorStats,
      config: {
        modelName: "mistral-large-latest",
        maxContext: configManager.getEnvConfig().maxContextMessages
      }
    };
  }

  /**
   * Gracefully shutdown the bot
   */
  async shutdown(): Promise<void> {
    try {
      console.log("🛑 Shutting down WhatsApp bot...");
      
      if (this.client) {
        await this.client.destroy();
      }
      
      console.log("✅ WhatsApp bot shutdown complete");
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
    }
  }
}

