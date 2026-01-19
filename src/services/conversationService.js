const config = require('../config/config');
const { generateSystemPrompt } = require('../config/context');
const SqlitePersistenceService = require('./sqlitePersistenceService');

class ConversationService {
  constructor({ persistenceService } = {}) {
    // Enhanced with persistent storage (Phase 2)
    this.conversations = new Map();
    this.maxContextMessages = config.bot.maxContextMessages;
    this.systemPrompt = generateSystemPrompt();
    this.persistenceService = persistenceService || new SqlitePersistenceService();

    // Load existing conversations from persistent storage
    this.loadPersistedConversations();
  }

  /**
   * Get conversation context for a user/chat
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Array} - Array of message objects
   */
  getContext(chatId) {
    return this.conversations.get(chatId) || [];
  }

  /**
   * Add a message to conversation context
   * @param {string} chatId - WhatsApp chat ID
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {Object} metadata - Additional message metadata
   */
  async addMessage(chatId, role, content, metadata = {}) {
    const startTime = Date.now();
    let context = this.conversations.get(chatId) || [];

    // Add new message with timestamp
    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    context.push(message);

    // Limit context size to prevent performance issues
    if (context.length > this.maxContextMessages * 2) {
      // Keep only the most recent messages
      context = context.slice(-this.maxContextMessages * 2);
    }

    this.conversations.set(chatId, context);

    // Save to persistent storage
    await this.persistenceService.saveConversation(chatId, context, {
      participantCount: 1,
      lastActivity: new Date().toISOString()
    });

    // Record analytics
    await this.persistenceService.recordAnalytics('message', {
      userId: chatId,
      role: role,
      messageLength: content.length,
      responseTime: Date.now() - startTime
    });
  }

  /**
   * Clear conversation context for a user/chat
   * @param {string} chatId - WhatsApp chat ID
   */
  async clearContext(chatId) {
    this.conversations.delete(chatId);
    await this.persistenceService.deleteConversation(chatId);
  }

  /**
   * Get formatted context for API request
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Array} - Formatted messages for API
   */
  getFormattedContext(chatId) {
    const context = this.getContext(chatId);

    const sanitized = context
      .filter((message) => message && typeof message.role === 'string' && typeof message.content === 'string')
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    if (!config.mistral?.includeLocalSystemPrompt) {
      return sanitized;
    }

    return [
      {
        role: 'system',
        content: this.systemPrompt
      },
      ...sanitized
    ];
  }

  /**
   * Update system prompt (useful for dynamic context changes)
   * @param {string} newPrompt - New system prompt
   */
  updateSystemPrompt(newPrompt) {
    this.systemPrompt = newPrompt;
  }

  /**
   * Reload system prompt from context configuration
   */
  reloadSystemPrompt() {
    const { reloadConfig } = require('../config/context');
    reloadConfig();
    this.systemPrompt = generateSystemPrompt();
  }

  /**
   * Get conversation statistics
   * @returns {Object} - Statistics about active conversations
   */
  async getStats() {
    const memoryStats = {
      activeConversations: this.conversations.size,
      totalMessages: Array.from(this.conversations.values())
        .reduce((total, context) => total + context.length, 0)
    };

    const persistentStats = await this.persistenceService.getStorageStats();
    const analyticsReport = await this.persistenceService.getAnalyticsReport(7);

    return {
      ...memoryStats,
      persistent: persistentStats,
      analytics: analyticsReport
    };
  }

  /**
   * Load persisted conversations into memory
   */
  async loadPersistedConversations() {
    try {
      // This will be called during initialization
      // For now, we'll load conversations on-demand to avoid memory issues
      console.log('🔄 Persistence service ready for conversation loading');
    } catch (error) {
      console.error('❌ Error loading persisted conversations:', error.message);
    }
  }

  /**
   * Get conversation context (enhanced with persistence)
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Array} - Array of message objects
   */
  async getContextEnhanced(chatId) {
    // Check memory first
    let context = this.conversations.get(chatId);

    if (!context) {
      // Load from persistent storage
      context = await this.persistenceService.loadConversation(chatId);
      if (context.length > 0) {
        this.conversations.set(chatId, context);
        console.log(`📂 Loaded ${context.length} messages from storage for chat ${chatId}`);
      }
    }

    return context || [];
  }

  /**
   * Get formatted context for API request (enhanced)
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Array} - Formatted messages for API
   */
  async getFormattedContextEnhanced(chatId) {
    const context = await this.getContextEnhanced(chatId);

    const sanitized = (context || [])
      .filter((message) => message && typeof message.role === 'string' && typeof message.content === 'string')
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    if (!config.mistral?.includeLocalSystemPrompt) {
      return sanitized;
    }

    return [
      {
        role: 'system',
        content: this.systemPrompt
      },
      ...sanitized
    ];
  }

  /**
   * Record command usage for analytics
   */
  async recordCommand(command, chatId) {
    await this.persistenceService.recordAnalytics('command', {
      command: command,
      userId: chatId
    });
  }

  /**
   * Record conversation start
   */
  async recordConversationStart(chatId) {
    await this.persistenceService.recordAnalytics('conversation_start', {
      userId: chatId
    });
  }

  /**
   * Record error for analytics
   */
  async recordError(errorType, chatId, errorDetails = {}) {
    await this.persistenceService.recordAnalytics('error', {
      errorType: errorType,
      userId: chatId,
      ...errorDetails
    });
  }

  /**
   * Get analytics report
   */
  async getAnalyticsReport(days = 7) {
    return await this.persistenceService.getAnalyticsReport(days);
  }

  /**
   * Cleanup old conversations
   */
  async cleanupOldData(daysToKeep = 30) {
    return await this.persistenceService.cleanupOldData(daysToKeep);
  }
}

module.exports = ConversationService;
