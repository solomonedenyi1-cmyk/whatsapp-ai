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
      
      case 'analytics':
        return await this.handleAnalytics();
      
      case 'cleanup':
        return await this.handleCleanup();
      
      default:
        return this.handleUnknownCommand(command);
    }
  }

  /**
   * Handle /help command
   * @returns {string} - Help message with available commands
   */
  handleHelp() {
    return `🤖 *Available Commands*

*Basic Commands:*
• /help - Show this help message
• /status - Check bot and API status (with analytics)
• /about - Information about this bot
• /reset - Clear conversation history

*Context Management:*
• /context - View current AI configuration
• /reload - Reload AI context from config.json

*Analytics & Reports:*
• /analytics - View conversation analytics report
• /cleanup - Clean up old conversation data

*Usage Tips:*
• Just send a normal message to chat with the AI
• The AI remembers our conversation context permanently
• Conversations are automatically saved and restored
• Use /reset if you want to start fresh
• Edit config.json to customize the AI's personality

*Need help?* Just ask me anything! 😊`;
  }

  /**
   * Handle /reset command
   * @returns {string} - Reset confirmation
   */
  async handleReset() {
    const chatId = this.currentChatId;
    if (chatId) {
      await this.conversationService.clearContext(chatId);
      return '🔄 *Conversation reset!*\n\nYour chat history has been cleared from both memory and storage. We can start fresh! 😊';
    }
    return '❌ Unable to reset conversation context.';
  }

  /**
   * Handle /status command
   * @returns {string} - Bot status information
   */
  async handleStatus() {
    try {
      // Test API connection
      const testResponse = await this.yueApiService.testConnection();
      const apiStatusText = testResponse ? 'Connected' : 'Disconnected';
      const statusEmoji = testResponse ? '✅' : '❌';
      
      const stats = await this.conversationService.getStats();
      
      return `📊 *Bot Status*

*Yue-F API:* ${statusEmoji} ${apiStatusText}
*Active conversations:* ${stats.activeConversations}
*Total messages:* ${stats.totalMessages}
*Model:* ${config.yuef.modelName}
*API URL:* ${config.yuef.apiUrl}

*Persistence:*
• Stored conversations: ${stats.persistent.conversations || 0}
• Total users: ${stats.persistent.users || 0}
• Analytics messages: ${stats.persistent.totalMessages || 0}

*Analytics (7 days):*
• Daily average: ${Math.round((stats.analytics.summary?.totalMessages || 0) / 7)} msgs/day
• Total users: ${stats.analytics.summary?.totalUsers || 0}
• Popular commands: ${Object.keys(stats.analytics.popularCommands || {}).slice(0, 3).join(', ') || 'None'}

*System:* Running with enhanced features 🚀`;
      
    } catch (error) {
      return `📊 *Bot Status*

*Yue-F API:* ❌ Error
*Error:* ${error.message}

*System:* Operational with API issues ⚠️`;
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
• Gender: ${businessContext.identity.gender}
• Role: ${businessContext.identity.role}
• Personality: ${businessContext.identity.personality}

*Business:*
• Company: ${businessContext.business.name}
• Services: ${businessContext.business.services.length} configured
• Products: ${businessContext.business.products.length} configured

*Owner:*
• ${businessContext.owner.name}, ${businessContext.owner.title}

*Note:* Edit config.json in the root directory to customize the AI's knowledge and personality.`;
  }

  /**
   * Handle /reload command
   * @returns {string} - Reload confirmation
   */
  handleReload() {
    this.conversationService.reloadSystemPrompt();
    return '🔄 *AI context reloaded!*\n\nThe AI has been updated with the latest configuration from config.json';
  }

  /**
   * Handle /analytics command
   * @returns {string} - Analytics report
   */
  async handleAnalytics() {
    try {
      const report = await this.conversationService.getAnalyticsReport(7);
      
      const dailyStatsText = Object.entries(report.dailyStats || {})
        .slice(-3)
        .map(([date, stats]) => `• ${date}: ${stats.messages} msgs, ${stats.conversations} convs`)
        .join('\n') || 'No data available';
      
      const commandsText = Object.entries(report.popularCommands || {})
        .slice(0, 5)
        .map(([cmd, count]) => `• /${cmd}: ${count}x`)
        .join('\n') || 'No commands recorded';
      
      return `📈 *Analytics Report (7 days)*

*Summary:*
• Total messages: ${report.summary?.totalMessages || 0}
• Total conversations: ${report.summary?.totalConversations || 0}
• Total users: ${report.summary?.totalUsers || 0}
• Average response time: ${Math.round(report.averageResponseTime || 0)}ms

*Recent Activity:*
${dailyStatsText}

*Popular Commands:*
${commandsText}

*Errors:*
${Object.keys(report.errorStats || {}).length > 0 ? 
  Object.entries(report.errorStats).map(([type, count]) => `• ${type}: ${count}x`).join('\n') : 
  '• No errors recorded ✅'}`;
  
    } catch (error) {
      return `❌ *Analytics Error*\n\nUnable to generate report: ${error.message}`;
    }
  }

  /**
   * Handle /cleanup command
   * @returns {string} - Cleanup confirmation
   */
  async handleCleanup() {
    try {
      const cleaned = await this.conversationService.cleanupOldData(30);
      return `🧹 *Data Cleanup Complete*\n\nCleaned up ${cleaned} old conversations (older than 30 days).\n\nStorage optimized! ✨`;
    } catch (error) {
      return `❌ *Cleanup Error*\n\nUnable to cleanup data: ${error.message}`;
    }
  }

  /**
   * Handle unknown command
   * @param {string} command - Unknown command name
   * @returns {string} - Error message
   */
  handleUnknownCommand(command) {
    return `❓ *Unknown command: /${command}*

Type /help to see available commands.`;
  }
}

module.exports = CommandHandler;
