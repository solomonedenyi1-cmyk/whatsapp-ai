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
const LightweightCache = require('../services/lightweightCache');
const InputValidator = require('../services/inputValidator');
const RateLimiter = require('../services/rateLimiter');
const SecurityManager = require('../services/securityManager');

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
    this.lightweightCache = new LightweightCache();
    
    // Initialize security services
    this.inputValidator = new InputValidator();
    this.rateLimiter = new RateLimiter();
    this.securityManager = new SecurityManager();
    
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
      this.adminService,
      this.securityManager,
      this.rateLimiter
    );
    
    this.isReady = false;
    this.startTime = Date.now();
  }

  /**
   * Initialize the WhatsApp bot
   */
  async initialize() {
    try {
      console.log('🤖 Initializing WhatsApp AI Bot...');
      
      // Update component status
      await this.monitoringService.updateComponentStatus('whatsappBot', 'initializing');
      
      // Configure security services with admin numbers
      const adminNumbers = [config.admin.whatsappNumber];
      this.rateLimiter.setAdminNumbers(adminNumbers);
      this.securityManager.setAdminNumbers(adminNumbers);
      
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
   * Handle incoming messages
   */
  async handleMessage(message) {
    try {
      const chatId = message.from;
      const messageText = message.body;
      
      // Skip messages from status broadcast
      if (chatId === 'status@broadcast') {
        return;
      }

      console.log(`📨 Message from ${chatId}: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`);

      // Apply rate limiting
      const rateLimitResult = this.rateLimiter.checkLimit(chatId, messageText.startsWith('/'));
      if (!rateLimitResult.allowed) {
        await this.sendMessage(chatId, rateLimitResult.message);
        return;
      }

      // Validate and sanitize input
      const validationResult = this.inputValidator.validateMessage(messageText);
      if (!validationResult.isValid) {
        console.log(`🚫 Message blocked: ${validationResult.reason}`);
        await this.sendMessage(chatId, validationResult.message || '❌ Mensagem contém conteúdo não permitido.');
        return;
      }

      // Use sanitized message for processing
      const sanitizedMessage = validationResult.sanitized || messageText;

      // Check if message is a command
      if (sanitizedMessage.startsWith('/')) {
        await this.handleCommand(message, sanitizedMessage);
        return;
      }

      // Check cache for static queries first
      const cacheKey = this.lightweightCache.generateCacheKey(sanitizedMessage);
      const cachedResponse = this.lightweightCache.get(cacheKey);
      
      if (cachedResponse) {
        console.log('📋 Serving response from cache');
        await this.sendMessage(chatId, cachedResponse);
        return;
      }

      // Get conversation context
      const context = await this.conversationService.getContext(chatId);
      
      // Add current message to context
      context.push({
        role: 'user',
        content: sanitizedMessage,
        timestamp: new Date().toISOString()
      });

      // Get AI response with timeout handling
      const response = await this.timeoutHandler.handleWithTimeout(
        () => this.yueApiService.generateResponse(sanitizedMessage, context),
        chatId,
        sanitizedMessage
      );

      if (response) {
        // Cache static responses
        if (this.lightweightCache.shouldCache(sanitizedMessage, response)) {
          this.lightweightCache.set(cacheKey, response);
        }

        // Send response
        await this.sendMessage(chatId, response);

        // Update conversation context
        await this.conversationService.addMessage(chatId, 'user', sanitizedMessage);
        await this.conversationService.addMessage(chatId, 'assistant', response);
      }

    } catch (error) {
      console.error('❌ Error handling message:', error);
      await this.errorHandler.handleError(error, {
        component: 'whatsappBot',
        operation: 'handleMessage',
        chatId: message.from,
        messageText: message.body
      });
      
      // Send error response to user
      await this.sendErrorResponse(message.from, 'processing_error');
    }
  }

  /**
   * Handle command messages with security validation
   */
  async handleCommand(message, sanitizedMessage) {
    const chatId = message.from;
    const command = sanitizedMessage.substring(1); // Remove '/' prefix
    
    // Validate command with security manager
    const securityResult = this.securityManager.validateAdminAccess(chatId, command);
    
    if (!securityResult.allowed && securityResult.requiresAuth) {
      await this.sendMessage(chatId, securityResult.message);
      return;
    }
    
    // Process command through command handler
    await this.commandHandler.handleCommand(message);
  }

  /**
   * Send message with proper method name
   */
  async sendMessage(chatId, message) {
    try {
      await this.client.sendMessage(chatId, message);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Process AI message with timeout (legacy method)
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
      let responseReceived = false;
      const warningCallback = async () => {
        try {
          // Only send warning if response hasn't been received yet
          if (!responseReceived) {
            await this.client.sendMessage(chatId, '⏳ Só um momento... Estou processando sua solicitação. O servidor está um pouco lento hoje, mas estou trabalhando nisso!');
            console.log('⏰ Warning message sent to user');
          }
        } catch (error) {
          console.error('❌ Error sending warning message:', error);
        }
      };
      
      const aiResponse = await this.yueApiService.sendMessage(messageText, context, warningCallback);
      responseReceived = true; // Mark that response was received
      
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
      const businessConfig = require('../../config.json');
      return businessConfig.error_messages?.processing_error || 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
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
      const businessConfig = require('../../config.json');
      const errorMessage = businessConfig.error_messages?.general_error || '❌ Ops! Algo deu errado. Tente enviar sua mensagem novamente.';
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
      await this.lightweightCache.shutdown();
      
      // Shutdown security services
      await this.inputValidator.shutdown();
      await this.rateLimiter.shutdown();
      await this.securityManager.shutdown();
      
      // Cleanup YueApiService connections
      if (this.yueApiService) {
        await this.yueApiService.cleanup();
      }
      
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
