const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const config = require('../config/config');
const MistralApiService = require('../services/mistralApiService');
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
    this.isInitializing = false;
    this.reconnectTimeoutId = null;

    // Initialize Phase 3 services
    this.errorHandler = new ErrorHandler();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.monitoringService = new MonitoringService(this.errorHandler, this.performanceOptimizer);

    // Initialize Phase 3.5 services
    this.timeoutHandler = new TimeoutHandler();
    this.adminService = new AdminService();
    this.performanceOptimizations = new PerformanceOptimizations();

    // Initialize existing services with error handling
    this.mistralApiService = new MistralApiService();
    this.mistralAgentService = new MistralAgentService();
    this.conversationService = new ConversationService();
    this.messageService = new MessageService();
    this.commandHandler = new CommandHandler(
      this.mistralApiService,
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

  async cleanupClient() {
    const client = this.client;
    if (!client) {
      return;
    }

    try {
      client.removeAllListeners();
      await client.destroy();
    } catch (cleanupError) {
      console.warn('⚠️ [whatsappBot] Error cleaning up client:', cleanupError.message);
    } finally {
      this.client = null;
      this.isReady = false;
    }
  }

  /**
   * Initialize the WhatsApp bot
   */
  async initialize() {
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      console.log('🤖 Initializing WhatsApp AI Bot...');

      // Update component status
      await this.monitoringService.updateComponentStatus('whatsappBot', 'initializing');

      // Ensure previous client is cleaned up before creating a new one
      if (this.client) {
        await this.cleanupClient();
      }

      const sessionPathAbs = path.resolve(process.cwd(), config.whatsapp.sessionPath);
      fs.mkdirSync(sessionPathAbs, { recursive: true });

      // Create WhatsApp client
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: sessionPathAbs
        }),
        puppeteer: config.whatsapp.puppeteerOptions
      });

      // Set up event listeners
      this.setupEventListeners();

      // Initialize the client and wait for ready
      console.log('📱 Initializing WhatsApp client...');

      const initPromise = this.client.initialize();
      const readyPromise = this.waitForClientReady();
      const initTimeoutMs = Number(config.whatsapp.initializationTimeoutMs || 0);

      if (initTimeoutMs > 0) {
        await Promise.race([
          Promise.all([initPromise, readyPromise]),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`WhatsApp client initialization timed out after ${Math.round(initTimeoutMs / 1000)} seconds`));
            }, initTimeoutMs);
          })
        ]);
      } else {
        await Promise.all([initPromise, readyPromise]);
      }

      // Update component status
      await this.monitoringService.updateComponentStatus('whatsappBot', 'ready');
      console.log('✅ WhatsApp client initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp bot:', error);
      await this.errorHandler.handleError(error, {
        component: 'whatsappBot',
        operation: 'initialize'
      });
      await this.monitoringService.updateComponentStatus('whatsappBot', 'error', { error: error.message });
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  waitForClientReady() {
    return new Promise((resolve, reject) => {
      const client = this.client;
      if (!client) {
        reject(new Error('WhatsApp client is not initialized'));
        return;
      }

      let qrTimeoutId = null;
      const qrTimeoutMs = Number(config.whatsapp.qrScanTimeoutMs || 0);

      const cleanup = () => {
        client.off('ready', onReady);
        client.off('auth_failure', onAuthFailure);
        client.off('error', onError);
        client.off('qr', onQr);
        if (qrTimeoutId) {
          clearTimeout(qrTimeoutId);
          qrTimeoutId = null;
        }
      };

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onAuthFailure = (msg) => {
        cleanup();
        reject(new Error(`WhatsApp authentication failed: ${msg}`));
      };

      const onError = (err) => {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      const onQr = () => {
        if (qrTimeoutMs <= 0 || qrTimeoutId) {
          return;
        }

        qrTimeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`WhatsApp QR scan timed out after ${Math.round(qrTimeoutMs / 1000)} seconds`));
        }, qrTimeoutMs);
      };

      client.on('qr', onQr);
      client.once('ready', onReady);
      client.once('auth_failure', onAuthFailure);
      client.once('error', onError);
    });
  }

  /**
   * Set up WhatsApp client event listeners
   */
  setupEventListeners() {
    // QR Code for authentication
    this.client.on('qr', (qr) => {
      console.log('📱 Scan this QR code with your WhatsApp:');
      console.log('💡 Open WhatsApp on your phone -> Settings -> Linked Devices -> Link a Device');
      qrcode.generate(qr, { small: true });
    });

    // Loading screen event
    this.client.on('loading_screen', (percent, message) => {
      console.log(`📱 Loading: ${percent}% - ${message}`);
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

    // Incoming messages
    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('❌ WhatsApp client error:', error.message);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
      this.isReady = false;
    });

    this.client.on('disconnected', async (reason) => {
      console.log('📱 WhatsApp client disconnected:', reason);
      this.isReady = false;

      await this.cleanupClient();
      this.scheduleReconnect('disconnected');
    });

    this.client.on('auth_failure', async (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      this.isReady = false;

      if (config.whatsapp.autoClearSessionOnAuthFailure) {
        await this.clearSessionData();
      }

      await this.cleanupClient();

      this.scheduleReconnect('auth_failure');
    });
  }

  scheduleReconnect(reason) {
    if (this.reconnectTimeoutId) {
      return;
    }

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      console.log(`🔄 Attempting to reconnect (${reason})...`);
      this.initialize().catch(reconnectError => {
        console.error('❌ Reconnection failed:', reconnectError.message);
      });
    }, 5000);
  }

  async clearSessionData() {
    const sessionPath = path.resolve(process.cwd(), config.whatsapp.sessionPath);

    try {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      fs.mkdirSync(sessionPath, { recursive: true });
      console.log('🔄 Session data cleared successfully');
    } catch (clearError) {
      console.error('❌ Error clearing session:', clearError.message);
    }
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
      await this.monitoringService.updateComponentStatus('mistralApi', 'processing');

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

      const aiResponse = config.mistral.useAgent
        ? await this.mistralAgentService.sendAgentMessage(messageText, warningCallback)
        : await this.mistralApiService.sendMessage(messageText, context, warningCallback);
      responseReceived = true; // Mark that response was received

      // Complete the timeout request
      const duration = this.timeoutHandler.completeRequest(requestId);

      // Update API status
      await this.monitoringService.updateComponentStatus('mistralApi', 'ready');

      // Add AI response to context
      await this.conversationService.addMessage(chatId, 'assistant', aiResponse);

      return this.messageService.formatResponse(aiResponse);

    } catch (error) {
      console.error('❌ Error processing AI message:', error);

      // Complete the timeout request on error
      this.timeoutHandler.completeRequest(requestId);

      await this.errorHandler.handleError(error, {
        component: 'mistralApi',
        operation: 'processMessage',
        chatId,
        messageLength: messageText.length
      });
      await this.monitoringService.updateComponentStatus('mistralApi', 'error', { error: error.message });
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
        modelName: config.mistral.modelName,
        apiUrl: 'Mistral API',
        maxContext: config.bot.maxContextMessages,
        useAgent: config.mistral.useAgent,
        agentName: config.mistral.agentName
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

      // Shutdown Mistral Agent service
      if (this.mistralAgentService) {
        this.mistralAgentService.cleanup();
      }

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
