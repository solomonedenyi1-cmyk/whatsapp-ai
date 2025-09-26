const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('../config/config');
const YueApiService = require('../services/yueApiService');
const ConversationService = require('../services/conversationService');
const MessageService = require('../services/messageService');
const CommandHandler = require('../commands/commandHandler');

class WhatsAppBot {
  constructor() {
    this.client = null;
    this.yueApiService = new YueApiService();
    this.conversationService = new ConversationService();
    this.messageService = new MessageService();
    this.commandHandler = new CommandHandler(this.yueApiService, this.conversationService);
    this.isReady = false;
  }

  /**
   * Initialize the WhatsApp bot
   */
  async initialize() {
    try {
      console.log('🤖 Initializing WhatsApp AI Bot...');
      
      // Create WhatsApp client
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: config.whatsapp.sessionPath
        }),
        puppeteer: config.whatsapp.puppeteerOptions
      });

      // Set up event listeners
      this.setupEventListeners();

      // Initialize the client
      await this.client.initialize();
      
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp bot:', error);
      throw error;
    }
  }

  /**
   * Set up WhatsApp client event listeners
   */
  setupEventListeners() {
    // QR Code for authentication
    this.client.on('qr', (qr) => {
      console.log('📱 Scan this QR code with your WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    // Client ready
    this.client.on('ready', () => {
      console.log('✅ WhatsApp bot is ready!');
      this.isReady = true;
    });

    // Authentication success
    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp authenticated successfully');
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
    });

    // Client disconnected
    this.client.on('disconnected', (reason) => {
      console.log('📱 WhatsApp client disconnected:', reason);
      this.isReady = false;
    });

    // Incoming messages
    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('❌ WhatsApp client error:', error);
    });
  }

  /**
   * Handle incoming WhatsApp messages
   * @param {Object} message - WhatsApp message object
   */
  async handleMessage(message) {
    try {
      // Check if message should be ignored
      if (this.messageService.shouldIgnoreMessage(message)) {
        return;
      }

      const chatId = message.from;
      const messageText = this.messageService.cleanMessage(message.body);

      if (config.env.debug) {
        console.log(`📨 Received message from ${chatId}: ${messageText}`);
      }

      // Show typing indicator
      await this.client.sendSeen(chatId);
      await message.getChat().then(chat => chat.sendStateTyping());

      let response;

      // Check if it's a command
      if (this.messageService.isCommand(messageText)) {
        const { command, args } = this.messageService.parseCommand(messageText);
        response = await this.commandHandler.handleCommand(command, args, chatId);
      } else {
        // Regular message - send to AI
        response = await this.processAIMessage(messageText, chatId);
      }

      // Send response
      await this.sendResponse(chatId, response);

    } catch (error) {
      console.error('❌ Error handling message:', error);
      await this.sendErrorResponse(message.from);
    }
  }

  /**
   * Process message with AI
   * @param {string} messageText - User message
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Promise<string>} - AI response
   */
  async processAIMessage(messageText, chatId) {
    try {
      // Get conversation context
      const context = this.conversationService.getFormattedContext(chatId);
      
      // Add user message to context
      this.conversationService.addMessage(chatId, 'user', messageText);
      
      // Send to AI
      const aiResponse = await this.yueApiService.sendMessage(messageText, context);
      
      // Add AI response to context
      this.conversationService.addMessage(chatId, 'assistant', aiResponse);
      
      return this.messageService.formatResponse(aiResponse);
      
    } catch (error) {
      console.error('❌ Error processing AI message:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
    }
  }

  /**
   * Send response to WhatsApp chat
   * @param {string} chatId - WhatsApp chat ID
   * @param {string} response - Response text
   */
  async sendResponse(chatId, response) {
    try {
      // Split long messages
      const messageParts = this.messageService.splitMessage(response);
      
      for (const part of messageParts) {
        await this.client.sendMessage(chatId, part);
        
        // Small delay between parts to avoid rate limiting
        if (messageParts.length > 1) {
          await this.delay(1000);
        }
      }
      
      if (config.env.debug) {
        console.log(`📤 Sent response to ${chatId}: ${response.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.error('❌ Error sending response:', error);
      throw error;
    }
  }

  /**
   * Send error response
   * @param {string} chatId - WhatsApp chat ID
   */
  async sendErrorResponse(chatId) {
    try {
      const errorMessage = '❌ Ops! Algo deu errado. Tente enviar sua mensagem novamente.';
      await this.client.sendMessage(chatId, errorMessage);
    } catch (error) {
      console.error('❌ Error sending error response:', error);
    }
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get bot status
   * @returns {Object} - Bot status information
   */
  getStatus() {
    return {
      isReady: this.isReady,
      conversations: this.conversationService.getStats(),
      config: {
        modelName: config.yuef.modelName,
        apiUrl: config.yuef.apiUrl,
        maxContext: config.bot.maxContextMessages
      }
    };
  }

  /**
   * Gracefully shutdown the bot
   */
  async shutdown() {
    try {
      console.log('🛑 Shutting down WhatsApp bot...');
      if (this.client) {
        await this.client.destroy();
      }
      console.log('✅ WhatsApp bot shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

module.exports = WhatsAppBot;
