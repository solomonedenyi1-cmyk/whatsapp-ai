const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('../config/config');
const YueApiService = require('../services/yueApiService');
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
    this.yueApiService = new YueApiService();
    this.conversationService = new ConversationService();
    this.messageService = new MessageService();
    this.commandHandler = new CommandHandler(
      this.yueApiService, 
      this.conversationService,
      this.errorHandler,
      this.performanceOptimizer,
      this.monitoringService,
      this.adminService
    );
    
    this.isReady = false;
    this.startTime = Date.now();
  }

  /**
   * Initialize the WhatsApp bot with retry logic
   */
  async initialize() {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Initializing WhatsApp AI Bot... (Attempt ${attempt}/${maxRetries})`);
        
        // Update component status
        await this.monitoringService.updateComponentStatus('whatsappBot', 'initializing');
        
        // Clean up any existing client
        if (this.client) {
          try {
            await this.client.destroy();
          } catch (cleanupError) {
            console.warn('⚠️ Error cleaning up previous client:', cleanupError.message);
          }
          this.client = null;
        }

        // Wait a bit before retry
        if (attempt > 1) {
          console.log(`⏳ Waiting ${attempt * 2} seconds before retry...`);
          await this.delay(attempt * 2000);
        }

        // Create WhatsApp client with enhanced options
        this.client = new Client({
          authStrategy: new LocalAuth({
            dataPath: config.whatsapp.sessionPath
          }),
          puppeteer: {
            ...config.whatsapp.puppeteerOptions,
            // Add retry-specific options
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false
          }
        });

        // Set up event listeners
        this.setupEventListeners();

        // Initialize the client with timeout
        const initPromise = this.client.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Client initialization timeout')), 120000);
        });

        await Promise.race([initPromise, timeoutPromise]);
        
        // Update component status
        await this.monitoringService.updateComponentStatus('whatsappBot', 'ready');
        
        console.log('✅ WhatsApp bot initialized successfully');
        return;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Failed to initialize WhatsApp bot (attempt ${attempt}/${maxRetries}):`, error.message);
        
        await this.errorHandler.handleError(error, {
          component: 'whatsappBot',
          operation: 'initialize',
          attempt: attempt
        });

        if (attempt === maxRetries) {
          await this.monitoringService.updateComponentStatus('whatsappBot', 'error', { error: error.message });
          break;
        }
      }
    }

    throw new Error(`Failed to initialize WhatsApp bot after ${maxRetries} attempts. Last error: ${lastError.message}`);
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

      if (config.env.debug) {
        console.log(`📨 Received message from ${chatId}: ${messageText}`);
      }

      // Record performance metrics
      this.performanceOptimizer.recordMessageReceived(chatId, messageText.length);

      // Show typing indicator
      await this.client.sendSeen(chatId);
      await message.getChat().then(chat => chat.sendStateTyping());

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
          (msg) => this.processAIMessageWithTimeout(msg, chatId)
        );
      }

      // Send response
      await this.sendResponse(chatId, response);

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
      await this.sendErrorResponse(message.from);
    }
  }

  /**
   * Process message with AI with timeout handling
   * @param {string} messageText - User message
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Promise<string>} - AI response
   */
  async processAIMessageWithTimeout(messageText, chatId) {
    const requestId = `${chatId}_${Date.now()}`;
    
    try {
      // Register request for timeout monitoring
      this.timeoutHandler.registerRequest(requestId, requestId, messageText);
      
      // Set up timeout message handler
      this.timeoutHandler.once('sendTimeoutMessage', async (data) => {
        if (data.chatId === chatId) {
          await this.sendResponse(chatId, data.message);
        }
      });
      
      // Get conversation context
      const context = this.conversationService.getFormattedContext(chatId);
      
      // Add user message to context
      await this.conversationService.addMessage(chatId, 'user', messageText);
      
      // Update API status
      await this.monitoringService.updateComponentStatus('yueApi', 'processing');
      
      // Send to AI (this may take a long time)
      const aiResponse = await this.yueApiService.sendMessage(messageText, context);
      
      // Complete the timeout request
      const duration = this.timeoutHandler.completeRequest(requestId);
      
      // Update API status
      await this.monitoringService.updateComponentStatus('yueApi', 'ready');
      
      // Add AI response to context
      await this.conversationService.addMessage(chatId, 'assistant', aiResponse);
      
      return this.messageService.formatResponse(aiResponse);
      
    } catch (error) {
      console.error('❌ Error processing AI message:', error);
      
      // Complete the timeout request on error
      this.timeoutHandler.completeRequest(requestId);
      
      await this.errorHandler.handleError(error, {
        component: 'yueApi',
        operation: 'processMessage',
        chatId,
        messageLength: messageText.length
      });
      await this.monitoringService.updateComponentStatus('yueApi', 'error', { error: error.message });
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
