const config = require('../config/config');
const { generateSystemPrompt } = require('../config/context');

class ConversationService {
  constructor() {
    // Store conversation contexts in memory (for Phase 1)
    // In production, this should be persisted to a database
    this.conversations = new Map();
    this.maxContextMessages = config.bot.maxContextMessages;
    this.systemPrompt = generateSystemPrompt();
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
   */
  addMessage(chatId, role, content) {
    let context = this.conversations.get(chatId) || [];
    
    // Add new message
    context.push({ role, content });
    
    // Limit context size to prevent performance issues
    if (context.length > this.maxContextMessages * 2) {
      // Keep only the most recent messages
      context = context.slice(-this.maxContextMessages * 2);
    }
    
    this.conversations.set(chatId, context);
  }

  /**
   * Clear conversation context for a user/chat
   * @param {string} chatId - WhatsApp chat ID
   */
  clearContext(chatId) {
    this.conversations.delete(chatId);
  }

  /**
   * Get formatted context for API request
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Array} - Formatted messages for API
   */
  getFormattedContext(chatId) {
    const context = this.getContext(chatId);
    
    // Always include the business context system prompt
    return [
      {
        role: 'system',
        content: this.systemPrompt
      },
      ...context
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
  getStats() {
    return {
      activeConversations: this.conversations.size,
      totalMessages: Array.from(this.conversations.values())
        .reduce((total, context) => total + context.length, 0)
    };
  }
}

module.exports = ConversationService;
