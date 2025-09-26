const config = require('../config/config');

class CommandHandler {
  constructor(yueApiService, conversationService) {
    this.yueApiService = yueApiService;
    this.conversationService = conversationService;
  }

  /**
   * Handle a command message
   * @param {string} command - Command name
   * @param {Array} args - Command arguments
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Promise<string>} - Command response
   */
  async handleCommand(command, args, chatId) {
    switch (command) {
      case 'help':
        return this.handleHelp();
      
      case 'reset':
        return this.handleReset(chatId);
      
      case 'status':
        return await this.handleStatus();
      
      case 'about':
        return this.handleAbout();
      
      case 'context':
        return this.handleContext();
      
      case 'reload':
        return this.handleReload();
      
      default:
        return this.handleUnknownCommand(command);
    }
  }

  /**
   * Handle /help command
   * @returns {string} - Help message
   */
  handleHelp() {
    return `🤖 *${config.bot.name} - Available Commands*

*Basic Commands:*
• /help - Show this help message
• /reset - Clear conversation history
• /status - Check bot and API status
• /about - Information about the bot
• /context - Show current AI context/persona
• /reload - Reload AI context configuration

*How to use:*
• Send any message to chat with the AI
• Use the commands above to control the bot
• The bot maintains conversation context automatically

*Tips:*
• Long messages are automatically split
• Emoji-only messages are ignored
• The bot responds only to text messages`;
  }

  /**
   * Handle /reset command
   * @param {string} chatId - WhatsApp chat ID
   * @returns {string} - Reset confirmation message
   */
  handleReset(chatId) {
    this.conversationService.clearContext(chatId);
    return '🔄 *Conversation context cleared!*\n\nYou can start a new conversation. Previous history has been removed.';
  }

  /**
   * Handle /status command
   * @returns {Promise<string>} - Status message
   */
  async handleStatus() {
    try {
      const apiStatus = await this.yueApiService.checkApiStatus();
      const stats = this.conversationService.getStats();
      
      const statusEmoji = apiStatus ? '✅' : '❌';
      const apiStatusText = apiStatus ? 'Online' : 'Offline';
      
      return `📊 *Bot Status*

*Yue-F API:* ${statusEmoji} ${apiStatusText}
*Active conversations:* ${stats.activeConversations}
*Total messages:* ${stats.totalMessages}
*Model:* ${config.yuef.modelName}
*Version:* 1.1.0

*Settings:*
• API timeout: ${config.yuef.timeout}ms
• Max context: ${config.bot.maxContextMessages} messages
• Max message size: ${config.bot.messageSplitLength} characters`;
    } catch (error) {
      return '❌ *Error checking status*\n\nCould not verify API status at the moment.';
    }
  }

  /**
   * Handle /about command
   * @returns {string} - About message
   */
  handleAbout() {
    return `🤖 *${config.bot.name}*

*About this bot:*
This is an AI assistant integrated with WhatsApp, powered by Yue-F AI model.

*Features:*
• Natural conversations with business context
• Maintains conversation context
• Fast and intelligent responses
• Familiar WhatsApp interface
• Customizable AI persona and knowledge base

*Technology:*
• Model: Yue-F (via Ollama)
• API: ${config.yuef.apiUrl}
• Platform: Node.js + WhatsApp Web

*Developed:* September 2025
*Version:* 1.1.0 (Phase 1 + Context System)

For more information, use /help`;
  }

  /**
   * Handle /context command
   * @returns {string} - Context information
   */
  handleContext() {
    const { businessContext } = require('../config/context');
    return `🎭 *Current AI Context*

*Identity:*
• Name: ${businessContext.identity.name}
• Role: ${businessContext.identity.role}
• Personality: ${businessContext.identity.personality}

*Business:*
• Company: ${businessContext.business.name}
• Services: ${businessContext.business.services.length} configured
• Products: ${businessContext.business.products.length} configured

*Owner:*
• ${businessContext.owner.name}, ${businessContext.owner.title}

*Note:* Edit src/config/context.js to customize the AI's knowledge and personality.`;
  }

  /**
   * Handle /reload command
   * @returns {string} - Reload confirmation
   */
  handleReload() {
    this.conversationService.reloadSystemPrompt();
    return '🔄 *AI context reloaded!*\n\nThe AI has been updated with the latest configuration from context.js';
  }

  /**
   * Handle unknown command
   * @param {string} command - Unknown command name
   * @returns {string} - Error message
   */
  handleUnknownCommand(command) {
    return `❓ *Unknown command: /${command}*

Use /help to see available commands.`;
  }
}

module.exports = CommandHandler;
