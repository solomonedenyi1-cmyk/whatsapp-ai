const config = require('../config/config');

class CommandHandler {
  constructor(yueApiService, conversationService, errorHandler = null, performanceOptimizer = null, monitoringService = null) {
    this.yueApiService = yueApiService;
    this.conversationService = conversationService;
    this.errorHandler = errorHandler;
    this.performanceOptimizer = performanceOptimizer;
    this.monitoringService = monitoringService;
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
      
      case 'health':
        return await this.handleHealth();
      
      case 'monitor':
        return await this.handleMonitor();
      
      case 'performance':
        return await this.handlePerformance();
      
      case 'errors':
        return await this.handleErrors();
      
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

*System Monitoring:*
• /health - System health check and status
• /monitor - Comprehensive monitoring dashboard
• /performance - Performance metrics and optimization
• /errors - Error logs and system diagnostics

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
  async handleReset(chatId) {
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
   * @returns {string} - Cleanup results
   */
  async handleCleanup() {
    try {
      const result = await this.conversationService.persistenceService.cleanupOldData();
      
      return `🧹 *Data Cleanup Complete*

` +
             `📊 *Cleanup Results:*
` +
             `• Conversations cleaned: ${result.cleanedConversations || 0}
` +
             `• Analytics entries cleaned: ${result.cleanedAnalytics || 0}
` +
             `• Total space freed: ${result.spaceSaved || 'Unknown'}

` +
             `✅ Old data (30+ days) has been removed to optimize storage.`;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return '❌ Error occurred during data cleanup. Please try again later.';
    }
  }

  /**
   * Handle /health command
   * @returns {string} - System health status
   */
  async handleHealth() {
    try {
      if (!this.monitoringService) {
        return '❌ Monitoring service not available.';
      }

      const healthData = await this.monitoringService.performHealthCheck();
      
      const healthEmoji = {
        'healthy': '✅',
        'degraded': '⚠️',
        'unhealthy': '🚨'
      };
      
      const emoji = healthEmoji[healthData.systemHealth] || '❓';
      
      let response = `${emoji} *System Health Check*\n\n`;
      response += `🏥 *Overall Status:* ${healthData.systemHealth.toUpperCase()}\n`;
      response += `⏰ *Last Check:* ${new Date(healthData.timestamp).toLocaleString()}\n\n`;
      
      if (healthData.checks) {
        response += `📊 *Component Status:*\n`;
        
        if (healthData.checks.memory) {
          const memStatus = healthData.checks.memory.status === 'healthy' ? '✅' : '⚠️';
          response += `${memStatus} Memory: ${healthData.checks.memory.usage}MB\n`;
        }
        
        if (healthData.checks.performance) {
          const perfStatus = healthData.checks.performance.status === 'healthy' ? '✅' : '⚠️';
          response += `${perfStatus} Performance: ${healthData.checks.performance.avgResponseTime}ms avg\n`;
        }
        
        if (healthData.checks.errors) {
          const errorStatus = healthData.checks.errors.status === 'healthy' ? '✅' : '⚠️';
          response += `${errorStatus} Errors: ${healthData.checks.errors.recentErrors} recent\n`;
        }
        
        if (healthData.checks.components) {
          response += `\n🔧 *Components:*\n`;
          Object.entries(healthData.checks.components).forEach(([name, status]) => {
            const statusEmoji = status === 'ready' ? '✅' : status === 'error' ? '❌' : '⚠️';
            response += `${statusEmoji} ${name}: ${status}\n`;
          });
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error getting health status:', error);
      return '❌ Error occurred while checking system health.';
    }
  }

  /**
   * Handle /monitor command
   * @returns {string} - Monitoring dashboard
   */
  async handleMonitor() {
    try {
      if (!this.monitoringService) {
        return '❌ Monitoring service not available.';
      }

      const dashboard = await this.monitoringService.getMonitoringDashboard();
      
      let response = `📊 *Monitoring Dashboard*\n\n`;
      response += `🏥 *System Health:* ${dashboard.systemHealth.toUpperCase()}\n`;
      response += `⏱️ *Uptime:* ${Math.floor(dashboard.uptime / 3600)}h ${Math.floor((dashboard.uptime % 3600) / 60)}m\n`;
      response += `📅 *Started:* ${new Date(dashboard.startTime).toLocaleString()}\n\n`;
      
      // Performance metrics
      if (dashboard.performance) {
        response += `⚡ *Performance:*\n`;
        if (dashboard.performance.memory?.current) {
          response += `• Memory: ${Math.round(dashboard.performance.memory.current)}MB\n`;
        }
        if (dashboard.performance.responseTime?.average) {
          response += `• Avg Response: ${Math.round(dashboard.performance.responseTime.average)}ms\n`;
        }
        if (dashboard.performance.cache?.hitRate !== undefined) {
          response += `• Cache Hit Rate: ${Math.round(dashboard.performance.cache.hitRate * 100)}%\n`;
        }
        response += `\n`;
      }
      
      // Error summary
      if (dashboard.errors) {
        response += `🚨 *Errors:*\n`;
        response += `• Total: ${dashboard.errors.total}\n`;
        response += `• Recent: ${dashboard.errors.recent}\n\n`;
      }
      
      // Alerts
      if (dashboard.alerts) {
        response += `🔔 *Alerts:*\n`;
        response += `• Total: ${dashboard.alerts.total}\n`;
        response += `• Unacknowledged: ${dashboard.alerts.unacknowledged}\n`;
        
        if (dashboard.alerts.recent && dashboard.alerts.recent.length > 0) {
          response += `\n📋 *Recent Alerts:*\n`;
          dashboard.alerts.recent.slice(0, 3).forEach(alert => {
            const alertEmoji = { low: '💡', medium: '⚠️', high: '🚨', critical: '🔥' };
            response += `${alertEmoji[alert.severity]} ${alert.message}\n`;
          });
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error getting monitoring dashboard:', error);
      return '❌ Error occurred while retrieving monitoring data.';
    }
  }

  /**
   * Handle /performance command
   * @returns {string} - Performance metrics
   */
  async handlePerformance() {
    try {
      if (!this.performanceOptimizer) {
        return '❌ Performance optimizer not available.';
      }

      const stats = this.performanceOptimizer.getPerformanceStats();
      
      let response = `⚡ *Performance Metrics*\n\n`;
      
      // Memory stats
      if (stats.memory) {
        response += `🧠 *Memory Usage:*\n`;
        response += `• Current: ${Math.round(stats.memory.current)}MB\n`;
        response += `• Peak: ${Math.round(stats.memory.peak)}MB\n`;
        response += `• Average: ${Math.round(stats.memory.average)}MB\n\n`;
      }
      
      // Response time stats
      if (stats.responseTime) {
        response += `⏱️ *Response Times:*\n`;
        response += `• Average: ${Math.round(stats.responseTime.average)}ms\n`;
        response += `• Fastest: ${Math.round(stats.responseTime.min)}ms\n`;
        response += `• Slowest: ${Math.round(stats.responseTime.max)}ms\n\n`;
      }
      
      // Cache performance
      if (stats.cache) {
        response += `💾 *Cache Performance:*\n`;
        response += `• Hit Rate: ${Math.round(stats.cache.hitRate * 100)}%\n`;
        response += `• Entries: ${stats.cache.size}\n`;
        response += `• Memory: ${Math.round(stats.cache.memoryUsage)}MB\n\n`;
      }
      
      // Message queue
      if (stats.messageQueue) {
        response += `📬 *Message Queue:*\n`;
        response += `• Current Size: ${stats.messageQueue.size}\n`;
        response += `• Processed: ${stats.messageQueue.processed}\n`;
        response += `• Average Wait: ${Math.round(stats.messageQueue.averageWaitTime)}ms\n`;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      return '❌ Error occurred while retrieving performance data.';
    }
  }

  /**
   * Handle /errors command
   * @returns {string} - Error logs and diagnostics
   */
  async handleErrors() {
    try {
      if (!this.errorHandler) {
        return '❌ Error handler not available.';
      }

      const errorStats = this.errorHandler.getErrorStats();
      
      let response = `🚨 *Error Diagnostics*\n\n`;
      response += `📊 *Error Summary:*\n`;
      response += `• Total Errors: ${errorStats.total}\n`;
      response += `• Recent (24h): ${errorStats.recent?.length || 0}\n\n`;
      
      // Error by component
      if (errorStats.byComponent && Object.keys(errorStats.byComponent).length > 0) {
        response += `🔧 *Errors by Component:*\n`;
        Object.entries(errorStats.byComponent).forEach(([component, count]) => {
          response += `• ${component}: ${count}\n`;
        });
        response += `\n`;
      }
      
      // Error by type
      if (errorStats.byType && Object.keys(errorStats.byType).length > 0) {
        response += `📋 *Errors by Type:*\n`;
        Object.entries(errorStats.byType).forEach(([type, count]) => {
          response += `• ${type}: ${count}\n`;
        });
        response += `\n`;
      }
      
      // Recent errors
      if (errorStats.recent && errorStats.recent.length > 0) {
        response += `🕐 *Recent Errors:*\n`;
        errorStats.recent.slice(0, 5).forEach((error, index) => {
          const time = new Date(error.timestamp).toLocaleTimeString();
          response += `${index + 1}. [${time}] ${error.component}: ${error.message.substring(0, 50)}...\n`;
        });
      } else {
        response += `✅ No recent errors found!`;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error getting error diagnostics:', error);
      return '❌ Error occurred while retrieving error data.';
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
