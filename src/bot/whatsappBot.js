const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/config');
const MistralAgentService = require('../services/mistralAgentService');
const MistralConversationService = require('../services/mistralConversationService');
const ConversationService = require('../services/conversationService');
const MessageService = require('../services/messageService');
const CommandHandler = require('../commands/commandHandler');
const ErrorHandler = require('../services/errorHandler');
const PerformanceOptimizer = require('../services/performanceOptimizer');
const MonitoringService = require('../services/monitoringService');
const TimeoutHandler = require('../services/timeoutHandler');
const AdminService = require('../services/adminService');
const PerformanceOptimizations = require('../services/performanceOptimizations');
const { createToolDispatcher } = require('../services/agentTools');
const MistralAudioService = require('../services/mistralAudioService');
const EdgeTtsService = require('../services/edgeTtsService');
const { safeSendSeen, safeSendMessage, safeSendMedia } = require('./whatsappTransport');
const { resolveStableChatId } = require('./chatIdResolver');
const { generateRequestId } = require('../utils/requestContext');

class WhatsAppBot {
  constructor() {
    this.client = null;

    this.errorHandler = new ErrorHandler();
    this.performanceOptimizer = new PerformanceOptimizer();
    this.monitoringService = new MonitoringService(this.errorHandler, this.performanceOptimizer);

    this.timeoutHandler = new TimeoutHandler();
    this.adminService = new AdminService();
    this.performanceOptimizations = new PerformanceOptimizations();

    // Initialize existing services with error handling
    this.mistralAgentService = new MistralAgentService();
    this.conversationService = new ConversationService();
    this.mistralConversationService = new MistralConversationService({
      persistenceService: this.conversationService.persistenceService,
    });
    this.mistralAudioService = new MistralAudioService();
    this.edgeTtsService = new EdgeTtsService();
    this.messageService = new MessageService();
    this.commandHandler = new CommandHandler(
      this.mistralAgentService,
      this.mistralConversationService,
      this.conversationService,
      this.errorHandler,
      this.performanceOptimizer,
      this.monitoringService,
      this.adminService
    );

    this.setupTimeoutListeners();

    this.isReady = false;
    this.startTime = Date.now();
  }

  setupTimeoutListeners() {
    this.timeoutHandler.on('sendTimeoutMessage', async (data) => {
      try {
        if (!data?.chatId || !data?.message) {
          return;
        }

        await this.sendResponse(data.chatId, data.message, null, null);
      } catch (error) {
        console.error('❌ Error sending timeout message:', error);
      }
    });
  }

  async safeSendSeen(chatId, chat) {
    await safeSendSeen(chatId, chat, this.client, config.env.debug);
  }

  async safeSendMessage(chatId, text, message = null, chat = null) {
    await safeSendMessage(chatId, text, {
      message,
      chat,
      client: this.client,
      debug: config.env.debug,
    });
  }

  async safeSendMedia(chatId, media, options = {}, message = null, chat = null) {
    await safeSendMedia(chatId, media, options, {
      message,
      chat,
      client: this.client,
      debug: config.env.debug,
    });
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

  async cleanupChromiumProfileLocks() {
    try {
      const dataPath = path.resolve(config.whatsapp.sessionPath);
      const profileDir = path.join(dataPath, 'session');

      const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];

      await Promise.all(
        lockFiles.map(async (filename) => {
          const filePath = path.join(profileDir, filename);
          try {
            await fs.unlink(filePath);
          } catch (error) {
            if (error && error.code !== 'ENOENT') {
              throw error;
            }
          }
        })
      );
    } catch (error) {
      if (config.env.debug) {
        console.warn('⚠️ Could not cleanup Chromium profile lock files:', error?.message || error);
      }
    }
  }

  /**
   * Initialize the WhatsApp bot
   */
  async initialize() {
    try {
      console.log('🤖 Initializing WhatsApp AI Bot...');

      await this.cleanupChromiumProfileLocks();

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
    const rawChatId = message?.from || 'chat';
    const requestId = generateRequestId(rawChatId);

    try {
      // Check if message should be ignored
      if (this.messageService.shouldIgnoreMessage(message)) {
        return;
      }

      const chatId = message.from;
      const messageText = this.messageService.cleanMessage(message.body || '');

      const chat = await message.getChat();

      const stableChatId = await resolveStableChatId({
        rawChatId: chatId,
        message,
        chat,
      });
      const contextChatId = stableChatId || chatId;

      if (config.env.debug && contextChatId !== chatId) {
        console.log(`🔁 chat id normalized: ${chatId} -> ${contextChatId}`);
      }

      if (config.env.debug) {
        console.log(`[${requestId}] 📨 Received message from ${chatId}: ${messageText}`);
      }

      // Record performance metrics
      this.performanceOptimizer.recordMessageReceived(contextChatId, messageText.length);

      // Show typing indicator
      await this.safeSendSeen(chatId, chat);
      await this.safeSendTyping(chat, chatId);

      let response;
      const shouldReplyWithAudio = Boolean(config.tts?.enabled) && (message.type === 'ptt' || message.type === 'audio');

      // Check if it's a command
      if (message.type === 'chat' && this.messageService.isCommand(messageText)) {
        const { command, args } = this.messageService.parseCommand(messageText);

        // Check admin access for commands
        const accessCheck = this.adminService.validateAdminAccess(contextChatId, command);
        if (!accessCheck.allowed) {
          response = accessCheck.message;
        } else {
          response = await this.commandHandler.handleCommand(command, args, contextChatId);
        }
      } else {
        // Regular message - send to AI with timeout handling and performance optimizations
        let inputText = messageText;

        if (message.type === 'ptt' || message.type === 'audio') {
          const transcriptionEnabled = Boolean(config.mistral?.audioTranscription?.enabled);
          if (!transcriptionEnabled) {
            response = 'No momento, a transcrição de áudio está desativada. Pode enviar em texto?';
          } else {
            try {
              const media = await message.downloadMedia();
              const mimeType = media?.mimetype;
              const data = media?.data;

              if (!mimeType || typeof data !== 'string' || data.trim().length === 0) {
                throw new Error('Unable to download audio media');
              }

              const buffer = Buffer.from(data, 'base64');

              const transcription = await this.mistralAudioService.transcribeAudio({
                buffer,
                mimeType,
                fileName: media?.filename,
                model: config.mistral?.audioTranscription?.model,
                language: config.mistral?.audioTranscription?.language,
              });

              const transcribedText = transcription?.text;
              if (typeof transcribedText !== 'string' || transcribedText.trim().length === 0) {
                throw new Error('Empty transcription');
              }

              inputText = transcribedText.trim();

              if (config.env.debug) {
                console.log(`[${requestId}] 🎙️ Transcribed audio: ${inputText.substring(0, 120)}...`);
              }
            } catch (error) {
              console.error('❌ Error transcribing audio message:', error?.message || error);
              response = 'Desculpe, não consegui transcrever o áudio. Pode tentar novamente ou enviar em texto?';
            }
          }
        }

        if (typeof response !== 'string') {
          response = await this.performanceOptimizations.optimizeMessageProcessing(
            contextChatId,
            inputText,
            (msg) => this.processAIMessageWithTimeout(msg, chatId, chat, contextChatId)
          );
        }
      }

      // Send response
      if (shouldReplyWithAudio && typeof response === 'string') {
        try {
          const { MessageMedia } = require('whatsapp-web.js');
          const { buffer, mimeType } = await this.edgeTtsService.synthesizeToBuffer(response);
          const base64 = buffer.toString('base64');
          const media = new MessageMedia(mimeType, base64, 'reply.ogg');
          await this.safeSendMedia(chatId, media, { sendAudioAsVoice: true }, message, chat);
        } catch (error) {
          if (config.env.debug) {
            console.warn('⚠️ Failed to generate/send TTS audio, falling back to text:', error?.message || error);
          }
          await this.sendResponse(chatId, response, message, chat);
        }
      } else {
        await this.sendResponse(chatId, response, message, chat);
      }

      // Record response time
      const responseTime = Date.now() - startTime;
      this.performanceOptimizer.recordResponseTime(responseTime);

    } catch (error) {
      console.error('❌ Error handling message:', error);
      await this.errorHandler.handleError(error, {
        component: 'whatsappBot',
        operation: 'handleMessage',
        requestId,
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
  async processAIMessageWithTimeout(messageText, chatId, chat, contextChatId = chatId) {
    const requestId = generateRequestId(contextChatId);

    try {
      // Register request for timeout monitoring
      this.timeoutHandler.registerRequest(chatId, requestId, messageText);

      // Add user message to local context storage (analytics/persistence)
      await this.conversationService.addMessage(contextChatId, 'user', messageText);

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

      const hasCal = Boolean(config.cal?.apiKey && config.cal?.eventTypeId);
      const enableEmailTool = Boolean(
        config.resend?.apiKey &&
        config.resend?.fromEmail &&
        config.resend?.fromName
      );

      // Booking tool always sends email confirmation, so it requires both Cal and Resend configured
      const enableBookingTool = Boolean(hasCal && enableEmailTool);

      let aiResponse;
      if (config.mistral.useConversations) {
        const allowedTools = new Set(['obter_data_hora_atual']);
        if (enableBookingTool) {
          allowedTools.add('interpretar_data_hora');
          allowedTools.add('criar_agendamento');
        }
        if (enableEmailTool) {
          allowedTools.add('enviar_email_confirmacao');
        }

        const dispatcher = createToolDispatcher({ allowedTools });
        try {
          aiResponse = await this.mistralConversationService.sendMessage(
            contextChatId,
            messageText,
            {
              dispatcher,
              warningCallback,
            }
          );
        } catch (error) {
          if (config.env?.debug) {
            console.warn('⚠️ Conversations API failed, falling back to Agents API:', error?.message || error);
          }

          const context = this.conversationService.getFormattedContext(contextChatId);
          const result = await this.mistralAgentService.sendMessageWithDispatcher(messageText, context, {
            dispatcher,
            warningCallback,
          });
          aiResponse = result?.content;
        }
      } else {
        const context = this.conversationService.getFormattedContext(contextChatId);
        const allowedTools = new Set(['obter_data_hora_atual']);
        if (enableBookingTool) {
          allowedTools.add('interpretar_data_hora');
          allowedTools.add('criar_agendamento');
        }
        if (enableEmailTool) {
          allowedTools.add('enviar_email_confirmacao');
        }

        const dispatcher = createToolDispatcher({ allowedTools });
        const result = await this.mistralAgentService.sendMessageWithDispatcher(messageText, context, {
          dispatcher,
          warningCallback,
        });
        aiResponse = result?.content;
      }
      responseReceived = true; // Mark that response was received

      // Complete the timeout request
      const duration = this.timeoutHandler.completeRequest(requestId);

      // Update API status
      await this.monitoringService.updateComponentStatus('mistralAgent', 'ready');

      // Add AI response to context
      await this.conversationService.addMessage(contextChatId, 'assistant', aiResponse);

      return this.messageService.formatResponse(aiResponse);

    } catch (error) {
      console.error('❌ Error processing AI message:', error);

      // Complete the timeout request on error
      this.timeoutHandler.completeRequest(requestId);

      await this.errorHandler.handleError(error, {
        component: 'mistralAgent',
        operation: 'processMessage',
        requestId,
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
    const responseTime = ((Date.now() - this.startTime) / 1000).toFixed(2);

    return {
      status: 'healthy',
      responseTime: `${responseTime}s`,
      timestamp: new Date().toISOString(),
      services: {
        whatsapp: this.client ? 'connected' : 'disconnected',
        mistral: await this.mistralAgentService.checkApiStatus() ? 'connected' : 'disconnected',
        persistence: this.conversationService ? 'active' : 'inactive'
      },
      monitoring: monitoringDashboard,
      config: {
        agentId: config.mistral.agentId,
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

      await this.monitoringService.shutdown();
      await this.performanceOptimizer.shutdown();
      await this.errorHandler.shutdown();

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
