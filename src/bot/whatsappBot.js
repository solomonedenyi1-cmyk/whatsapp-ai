const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('../config/config');
const MistralAgentService = require('../services/mistralAgentService');
const ConversationService = require('../services/conversationService');
const MessageService = require('../services/messageService');
const CommandHandler = require('../commands/commandHandler');
const ErrorHandler = require('../services/errorHandler');
const PerformanceOptimizer = require('../services/performanceOptimizer');
const MonitoringService = require('../services/monitoringService');
const TimeoutHandler = require('../services/timeoutHandler');
const AdminService = require('../services/adminService');
const PerformanceOptimizations = require('../services/performanceOptimizations');

class WhatsAppBot {
  constructor() {
    this.client = null;

    // Initialize Phase 3 services
    this.errorHandler = new ErrorHandler();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.monitoringService = new MonitoringService(this.errorHandler, this.performanceOptimizer);

    // Initialize Phase 3.5 services
    this.timeoutHandler = new TimeoutHandler();
    this.adminService = new AdminService();
    this.performanceOptimizations = new PerformanceOptimizations();

    // Initialize existing services with error handling
    this.mistralAgentService = new MistralAgentService();
    this.conversationService = new ConversationService();
    this.messageService = new MessageService();
    this.commandHandler = new CommandHandler(
      this.mistralAgentService,
      this.conversationService,
      this.errorHandler,
      this.performanceOptimizer,
      this.monitoringService,
      this.adminService
    );

    this.isReady = false;
    this.startTime = Date.now();
  }

  async safeSendSeen(chatId, chat) {
    try {
      if (chat && typeof chat.sendSeen === 'function') {
        await chat.sendSeen();
        return;
      }

      if (chatId && typeof chatId === 'string' && chatId.endsWith('@lid')) {
        return;
      }

      if (this.client && typeof this.client.sendSeen === 'function') {
        await this.client.sendSeen(chatId);
      }
    } catch (error) {
      if (config.env.debug) {
        console.warn(`⚠️ Could not send seen for ${chatId}:`, error?.message || error);
      }
    }
  }

  async safeSendMessage(chatId, text, message = null, chat = null) {
    const methods = [];

    if (message && typeof message.reply === 'function') {
      methods.push(async () => message.reply(text));
    }

    if (chat && typeof chat.sendMessage === 'function') {
      methods.push(async () => chat.sendMessage(text));
    }

    if (this.client && typeof this.client.sendMessage === 'function') {
      methods.push(async () => this.client.sendMessage(chatId, text));
    }

    let lastError = null;
    for (const fn of methods) {
      try {
        await fn();
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No available method to send message');
  }

  async safeSendTyping(chat, chatId) {
    try {
      if (chat && typeof chat.sendStateTyping === 'function') {
        await chat.sendStateTyping();
      }
    } catch (error) {
      if (config.env.debug) {
        console.warn(`⚠️ Could not send typing state for ${chatId}:`, error?.message || error);
      }
    }
  }

  /**
   * Initialize the WhatsApp bot
   */
  async initialize() {
    try {
      console.log('🤖 Initializing WhatsApp AI Bot...');

      // Update component status
      await this.monitoringService.updateComponentStatus('whatsappBot', 'initializing');

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

      // Update component status
      await this.monitoringService.updateComponentStatus('whatsappBot', 'ready');

    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp bot:', error);
      await this.errorHandler.handleError(error, {
        component: 'whatsappBot',
        operation: 'initialize'
      });
      await this.monitoringService.updateComponentStatus('whatsappBot', 'error', { error: error.message });
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
    const startTime = Date.now();

    try {
      // Check if message should be ignored
      if (this.messageService.shouldIgnoreMessage(message)) {
        return;
      }

      const chatId = message.from;
      const messageText = this.messageService.cleanMessage(message.body);

      const chat = await message.getChat();

      if (config.env.debug) {
        console.log(`📨 Received message from ${chatId}: ${messageText}`);
      }

      // Record performance metrics
      this.performanceOptimizer.recordMessageReceived(chatId, messageText.length);

      // Show typing indicator
      await this.safeSendSeen(chatId, chat);
      await this.safeSendTyping(chat, chatId);

      let response;

      // Check if it's a command
      if (this.messageService.isCommand(messageText)) {
        const { command, args } = this.messageService.parseCommand(messageText);

        // Check admin access for commands
        const accessCheck = this.adminService.validateAdminAccess(chatId, command);
        if (!accessCheck.allowed) {
          response = accessCheck.message;
        } else {
          response = await this.commandHandler.handleCommand(command, args, chatId);
        }
      } else {
        // Regular message - send to AI with timeout handling and performance optimizations
        response = await this.performanceOptimizations.optimizeMessageProcessing(
          chatId,
          messageText,
          (msg) => this.processAIMessageWithTimeout(msg, chatId, chat)
        );
      }

      // Send response
      await this.sendResponse(chatId, response, message, chat);

      // Record response time
      const responseTime = Date.now() - startTime;
      this.performanceOptimizer.recordResponseTime(responseTime);

    } catch (error) {
      console.error('❌ Error handling message:', error);
      await this.errorHandler.handleError(error, {
        component: 'whatsappBot',
        operation: 'handleMessage',
        chatId: message.from,
        messageText: message.body?.substring(0, 100)
      });
      await this.sendErrorResponse(message.from, message);
    }
  }

  /**
   * Process message with AI with timeout handling
   * @param {string} messageText - User message
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Promise<string>} - AI response
   */
  async processAIMessageWithTimeout(messageText, chatId, chat) {
    const requestId = `${chatId}_${Date.now()}`;

    try {
      // Register request for timeout monitoring
      this.timeoutHandler.registerRequest(requestId, requestId, messageText);

      // Set up timeout message handler
      this.timeoutHandler.once('sendTimeoutMessage', async (data) => {
        if (data.chatId === chatId) {
          await this.sendResponse(chatId, data.message, null, chat);
        }
      });

      // Get conversation context
      const context = this.conversationService.getFormattedContext(chatId);

      // Add user message to context
      await this.conversationService.addMessage(chatId, 'user', messageText);

      // Update API status
      await this.monitoringService.updateComponentStatus('mistralAgent', 'processing');

      // Send to AI (this may take a long time)
      let responseReceived = false;
      const warningCallback = async () => {
        try {
          // Only send warning if response hasn't been received yet
          if (!responseReceived) {
            await this.sendResponse(chatId, '⏰ Sua mensagem está demorando mais que o esperado. Estou processando e responderei em breve!', null, chat);
          }
        } catch (error) {
          console.error('❌ Error sending warning message:', error);
        }
      };

      const aiResponse = await this.mistralAgentService.sendMessage(messageText, context, warningCallback);
      responseReceived = true; // Mark that response was received

      // Complete the timeout request
      const duration = this.timeoutHandler.completeRequest(requestId);

      // Update API status
      await this.monitoringService.updateComponentStatus('mistralAgent', 'ready');

      // Add AI response to context
      await this.conversationService.addMessage(chatId, 'assistant', aiResponse);

      return this.messageService.formatResponse(aiResponse);

    } catch (error) {
      console.error('❌ Error processing AI message:', error);

      // Complete the timeout request on error
      this.timeoutHandler.completeRequest(requestId);

      await this.errorHandler.handleError(error, {
        component: 'mistralAgent',
        operation: 'processMessage',
        chatId,
        messageLength: messageText.length
      });
      await this.monitoringService.updateComponentStatus('mistralAgent', 'error', { error: error.message });
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
    }
  }

  /**
   * Process message with AI (legacy method for compatibility)
   * @param {string} messageText - User message
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Promise<string>} - AI response
   */
  async processAIMessage(messageText, chatId) {
    return this.processAIMessageWithTimeout(messageText, chatId);
  }

  /**
   * Send response to WhatsApp chat
   * @param {string} chatId - WhatsApp chat ID
   * @param {string} response - Response text
   */
  async sendResponse(chatId, response, message = null, chat = null) {
    try {
      // Split long messages
      const messageParts = this.messageService.splitMessage(response);

      for (const part of messageParts) {
        await this.safeSendMessage(chatId, part, message, chat);

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
  async sendErrorResponse(chatId, message = null) {
    try {
      const errorMessage = '❌ Ops! Algo deu errado. Tente enviar sua mensagem novamente.';

      await this.safeSendMessage(chatId, errorMessage, message, null);
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
  async getStatus() {
    const conversationStats = await this.conversationService.getStats();
    const performanceStats = this.performanceOptimizer.getPerformanceStats();
    const errorStats = this.errorHandler.getErrorStats();
    const monitoringDashboard = await this.monitoringService.getMonitoringDashboard();

    return {
      isReady: this.isReady,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      conversations: conversationStats,
      performance: performanceStats,
      errors: errorStats,
      monitoring: monitoringDashboard,
      config: {
        agentId: config.mistral.agentId,
        includeLocalSystemPrompt: config.mistral.includeLocalSystemPrompt,
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

      // Update component status
      await this.monitoringService.updateComponentStatus('whatsappBot', 'shutting_down');

      // Shutdown Phase 3 services
      await this.monitoringService.shutdown();
      await this.performanceOptimizer.shutdown();
      await this.errorHandler.shutdown();

      // Shutdown Phase 3.5 services
      await this.timeoutHandler.shutdown();
      await this.performanceOptimizations.shutdown();

      // Shutdown WhatsApp client
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
