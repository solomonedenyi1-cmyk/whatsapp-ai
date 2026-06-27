const config = require('../config/config');

class CommandHandler {
  constructor(mistralAgentService, mistralConversationService, conversationService, errorHandler = null, performanceOptimizer = null, monitoringService = null, adminService = null) {
    this.mistralAgentService = mistralAgentService;
    this.mistralConversationService = mistralConversationService;
    this.conversationService = conversationService;
    this.errorHandler = errorHandler;
    this.performanceOptimizer = performanceOptimizer;
    this.monitoringService = monitoringService;
    this.adminService = adminService;
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
      // Existing commands
      case 'help':
        return this.handleHelp();
      case 'reset':
        return this.handleReset(chatId);
      case 'clear':
        return this.handleReset(chatId);
      case 'status':
        return await this.handleStatus();
      case 'about':
        return this.handleAbout();
      case 'context':
        return this.handleContext();
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
      case 'admin':
        return await this.handleAdminCommand(args, chatId);
      case 'sqlite':
        return await this.handleSqliteCommand(args, chatId);

      // 🆕 AI Control Commands
      case 'aion':
        return this.handleAIControl('aion', chatId);
      case 'aioff':
        return this.handleAIControl('aioff', chatId);
      case 'aiprivate':
        return this.handleAIControl('aiprivate', chatId);
      case 'aigroup':
        return this.handleAIControl('aigroup', chatId);

      // 🆕 Mode Control Commands
      case 'privateonly':
        return this.handleModeControl('privateonly', chatId);
      case 'grouponly':
        return this.handleModeControl('grouponly', chatId);
      case 'adminonly':
        return this.handleModeControl('adminonly', chatId);
      case 'publicmode':
        return this.handleModeControl('publicmode', chatId);

      // 🆕 Auto-Delete Commands
      case 'autodel':
        return this.handleAutoDelete('autodel', args, chatId);
      case 'autodelon':
        return this.handleAutoDelete('autodelon', args, chatId);
      case 'autodeloff':
        return this.handleAutoDelete('autodeloff', args, chatId);
      case 'autodelall':
        return this.handleAutoDelete('autodelall', args, chatId);
      case 'autodeltime':
        return this.handleAutoDelete('autodeltime', args, chatId);

      // 🆕 Protection Commands
      case 'antispam':
        return this.handleProtection('antispam', chatId);
      case 'antilink':
        return this.handleProtection('antilink', chatId);
      case 'welcome':
        return this.handleProtection('welcome', chatId);
      case 'welcomeset':
        return this.handleProtection('welcomeset', args, chatId);
      case 'welcomeoff':
        return this.handleProtection('welcomeoff', chatId);

      // 🆕 Status Commands (handled by status.js file)
      // These are loaded from the commands folder

      // 🆕 Admin Controls (handled by adminControls.js file)
      // These are loaded from the commands folder

      // 🆕 Ping Command
      case 'ping':
        return this.handlePing();
      case 'pong':
      case 'test':
      case 'latency':
        return this.handlePing();

      // 🆕 Uptime Command
      case 'uptime':
        return this.handleUptime();
      case 'up':
        return this.handleUptime();

      default:
        return `❓ Comando desconhecido: ${command}\n\n` +
          `📋 Comandos disponíveis:\n` +
          `• /help - Mostra esta mensagem de ajuda\n` +
          `• /status - Verifica o status do bot\n` +
          `• /clear - Limpa o histórico da conversa\n` +
          `• /context - Mostra o contexto atual da conversa\n` +
          `• /health - Status de saúde do sistema\n` +
          `• /monitor - Informações de monitoramento\n` +
          `• /performance - Métricas de performance\n` +
          `• /errors - Relatório de erros\n` +
          `• /admin - Comandos administrativos\n` +
          `• /sqlite - Gerenciamento SQLite\n` +
          `• /aion - Liga a IA\n` +
          `• /aioff - Desliga a IA\n` +
          `• /aiprivate - IA em conversas privadas\n` +
          `• /aigroup - IA em grupos\n` +
          `• /privateonly - Apenas conversas privadas\n` +
          `• /grouponly - Apenas grupos\n` +
          `• /adminonly - Apenas administradores\n` +
          `• /publicmode - Todos podem usar\n` +
          `• /autodel - Auto-deletar no grupo\n` +
          `• /autodeltime <s> - Tempo de auto-delete\n` +
          `• /ping - Verifica a velocidade do bot\n` +
          `• /uptime - Tempo de atividade do bot`;
    }
  }

  /**
   * Handle /help command
   */
  handleHelp() {
    return `🤖 *Available Commands*

*Basic Commands:*
• /help - Show this help message
• /status - Check bot and API status
• /about - Information about this bot
• /reset - Clear conversation history
• /clear - Alias for /reset
• /ping - Check bot response speed
• /uptime - Show bot uptime

*AI Control:*
• /aion - Turn AI ON (master toggle)
• /aioff - Turn AI OFF (master toggle)
• /aiprivate - Toggle AI in private chats
• /aigroup - Toggle AI in groups

*Mode Control:*
• /privateonly - Bot only works in private chats
• /grouponly - Bot only works in groups
• /adminonly - Only admins can use commands
• /publicmode - Everyone can use commands

*Context & Analytics:*
• /context - View current AI configuration
• /analytics - View conversation analytics
• /cleanup - Clean up old conversation data

*System Monitoring:*
• /health - System health check
• /monitor - Monitoring dashboard
• /performance - Performance metrics
• /errors - Error logs

*Auto-Delete:*
• /autodel - Toggle auto-delete in group
• /autodeltime <seconds> - Set delete delay

*Protection:*
• /antispam - Toggle anti-spam
• /antilink - Toggle anti-link
• /welcome - Toggle welcome messages
• /welcomeset <message> - Set welcome message

*Admin & Management:*
• /admin - Admin controls
• /sqlite - SQLite management

*Status (NEW!):*
• /status - View and interact with statuses
• Reply to a status then use:
  - /status react ❤️
  - /status reply Nice!
  - /status view
  - /status download

*Tips:*
• Just send a normal message to chat with the AI
• The bot only responds to private messages
• Group messages are automatically ignored
• Use /reset if you want to start fresh

*Need help?* Just ask me anything! 😊`;
  }

  /**
   * Handle AI Control Commands
   */
  handleAIControl(command, chatId) {
    if (!this.adminService) {
      return '❌ Admin service not available';
    }

    const isAdmin = this.adminService.isAdmin(chatId);
    if (!isAdmin) {
      return '🔒 This command is for admins only';
    }

    let response = '';
    switch (command) {
      case 'aion':
        this.adminService.toggleSetting('aiEnabled', true);
        response = '✅ AI Master toggle turned ON';
        break;
      case 'aioff':
        this.adminService.toggleSetting('aiEnabled', false);
        response = '⛔ AI Master toggle turned OFF';
        break;
      case 'aiprivate':
        const privateStatus = this.adminService.toggleSetting('aiPrivateChats');
        response = `✅ AI in private chats: ${privateStatus ? 'ON' : 'OFF'}`;
        break;
      case 'aigroup':
        const groupStatus = this.adminService.toggleSetting('aiGroups');
        response = `✅ AI in groups: ${groupStatus ? 'ON' : 'OFF'}`;
        break;
    }
    return response;
  }

  /**
   * Handle Mode Control Commands
   */
  handleModeControl(command, chatId) {
    if (!this.adminService) {
      return '❌ Admin service not available';
    }

    const isAdmin = this.adminService.isAdmin(chatId);
    if (!isAdmin) {
      return '🔒 This command is for admins only';
    }

    let response = '';
    switch (command) {
      case 'privateonly':
        this.adminService.toggleSetting('privateOnlyMode', true);
        this.adminService.toggleSetting('groupOnlyMode', false);
        response = '✅ Bot set to PRIVATE ONLY mode (only responds in private chats)';
        break;
      case 'grouponly':
        this.adminService.toggleSetting('groupOnlyMode', true);
        this.adminService.toggleSetting('privateOnlyMode', false);
        response = '✅ Bot set to GROUP ONLY mode (only responds in groups)';
        break;
      case 'adminonly':
        const adminStatus = this.adminService.toggleSetting('adminOnlyCommands');
        response = `✅ Admin-only mode: ${adminStatus ? 'ON' : 'OFF'}`;
        break;
      case 'publicmode':
        this.adminService.toggleSetting('adminOnlyCommands', false);
        response = '✅ All commands are now PUBLIC';
        break;
    }
    return response;
  }

  /**
   * Handle Auto-Delete Commands
   */
  handleAutoDelete(command, args, chatId) {
    if (!this.adminService) {
      return '❌ Admin service not available';
    }

    const isAdmin = this.adminService.isAdmin(chatId);
    if (!isAdmin) {
      return '🔒 This command is for admins only';
    }

    switch (command) {
      case 'autodel':
        const isEnabled = this.adminService.isAutoDeleteEnabled(chatId);
        if (isEnabled) {
          this.adminService.removeAutoDeleteGroup(chatId);
          return '⛔ Auto-delete disabled for this group';
        } else {
          this.adminService.addAutoDeleteGroup(chatId);
          return '✅ Auto-delete enabled for this group! Messages will be auto-deleted.';
        }

      case 'autodeltime':
        const seconds = parseInt(args[0]);
        if (isNaN(seconds) || seconds < 1 || seconds > 60) {
          return '❌ Please provide a valid time (1-60 seconds)';
        }
        this.adminService.settings.autoDeleteDelay = seconds * 1000;
        this.adminService.saveSettings();
        return `✅ Auto-delete delay set to ${seconds} seconds`;

      default:
        return '❌ Unknown auto-delete command';
    }
  }

  /**
   * Handle Protection Commands
   */
  handleProtection(command, args, chatId) {
    if (!this.adminService) {
      return '❌ Admin service not available';
    }

    const isAdmin = this.adminService.isAdmin(chatId);
    if (!isAdmin) {
      return '🔒 This command is for admins only';
    }

    switch (command) {
      case 'antispam':
        const spamStatus = this.adminService.toggleSetting('antiSpamEnabled');
        return `✅ Anti-spam: ${spamStatus ? 'ON' : 'OFF'}`;

      case 'antilink':
        const linkStatus = this.adminService.toggleSetting('antiLinkEnabled');
        return `✅ Anti-link: ${linkStatus ? 'ON' : 'OFF'}`;

      case 'welcome':
        const welcomeStatus = this.adminService.toggleSetting('welcomeEnabled');
        return `✅ Welcome messages: ${welcomeStatus ? 'ON' : 'OFF'}`;

      case 'welcomeset':
        const message = args.join(' ');
        if (!message) {
          return '❌ Please provide a welcome message\nExample: /welcomeset Welcome to the group! 🎉';
        }
        // Store welcome message in settings
        this.adminService.settings.welcomeMessage = message;
        this.adminService.saveSettings();
        return `✅ Welcome message set to: "${message}"`;

      case 'welcomeoff':
        this.adminService.toggleSetting('welcomeEnabled', false);
        return '⛔ Welcome messages turned OFF';

      default:
        return '❌ Unknown protection command';
    }
  }

  /**
   * Handle Ping Command
   */
  handlePing() {
    const startTime = Date.now();
    const latency = Date.now() - startTime;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Africa/Lagos'
    }).toLowerCase();

    return `╭─❍ *PONG!*\n│ ❕ ${latency}ms\n│ ⚡  _online_\n╰─ 📄 \`\`\`${timeStr}\`\`\``;
  }

  /**
   * Handle Uptime Command
   */
  handleUptime() {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    let uptimeStr = '';
    if (days > 0) uptimeStr += `${days}d `;
    if (hours > 0) uptimeStr += `${hours}h `;
    if (minutes > 0) uptimeStr += `${minutes}m `;
    uptimeStr += `${seconds}s`;

    return `╭─❍ *📡 UPTIME*\n│\n│ ⏱️ ${uptimeStr}\n│\n│ 🕐 Started: ${new Date(Date.now() - uptime * 1000).toLocaleString()}\n╰──────────────────`;
  }

  /**
   * Handle /reset command
   */
  async handleReset(chatId) {
    if (chatId) {
      if (config.mistral.useConversations && this.mistralConversationService) {
        await this.mistralConversationService.deleteConversation(chatId);
      }
      await this.conversationService.clearContext(chatId);
      return '🔄 *Conversation reset!*\n\nYour chat history has been cleared from both memory and storage. We can start fresh! 😊';
    }
    return '❌ Unable to reset conversation context.';
  }

  /**
   * Handle /status command
   */
  async handleStatus() {
    try {
      const testResponse = await this.mistralAgentService.checkApiStatus();
      const apiStatusText = testResponse ? 'Connected' : 'Disconnected';
      const statusEmoji = testResponse ? '✅' : '❌';

      const stats = await this.conversationService.getStats();

      // Get admin settings if available
      let adminSettings = '';
      if (this.adminService) {
        const settings = this.adminService.getSettingsStatus();
        adminSettings = `\n*Controls:*\n• AI Master: ${settings.ai.enabled}\n• AI Groups: ${settings.ai.groups}\n• AI Private: ${settings.ai.privateChats}\n• Auto-Delete: ${settings.autoDelete.enabled}`;
      }

      return `📊 *Bot Status*

*Mistral Agent API:* ${statusEmoji} ${apiStatusText}
*Active conversations:* ${stats.activeConversations}
*Total messages:* ${stats.totalMessages}
*Agent ID:* ${config.mistral.agentId}

*Persistence:*
• Stored conversations: ${stats.persistent.conversations || 0}
• Total users: ${stats.persistent.users || 0}
• Analytics messages: ${stats.persistent.totalMessages || 0}

*Analytics (7 days):*
• Daily average: ${Math.round((stats.analytics.summary?.totalMessages || 0) / 7)} msgs/day
• Total users: ${stats.analytics.summary?.totalUsers || 0}
• Popular commands: ${Object.keys(stats.analytics.popularCommands || {}).slice(0, 3).join(', ') || 'None'}
${adminSettings}
*System:* Running with enhanced features 🚀`;

    } catch (error) {
      return `📊 *Bot Status*

*Mistral Agent API:* ❌ Error
*Error:* ${error.message}

*System:* Operational with API issues ⚠️`;
    }
  }

  /**
   * Handle /about command
   */
  handleAbout() {
    return `🤖 *${config.bot.name}*

*About this bot:*
This is an AI assistant integrated with WhatsApp, powered by Mistral Agents.

*Features:*
• Natural conversations configured via your Mistral Agent instructions
• Maintains conversation context
• Fast and intelligent responses
• Familiar WhatsApp interface
• Customizable AI persona and domain knowledge (via Mistral Agent instructions)

*Technology:*
• Mistral Agent ID: ${config.mistral.agentId}
• Platform: Node.js + WhatsApp Web

*Developed:* September 2025
*Version:* 1.2.0

For more information, use /help`;
  }

  /**
   * Handle /context command
   */
  handleContext() {
    return `🎭 *Current Bot Context*

*Mistral:*
• Agent ID: ${config.mistral.agentId}
• Conversations API: ${config.mistral.useConversations ? 'enabled' : 'disabled'}
• Conversation store: ${config.mistral.conversationStore ? 'enabled' : 'disabled'}
• Handoff execution: ${config.mistral.conversationHandoffExecution}

*Bot:*
• Name: ${config.bot.name}
• Max context messages: ${config.bot.maxContextMessages}
• Message split length: ${config.bot.messageSplitLength}

*Note:* Update the Mistral Agent instructions to customize the assistant behavior.`;
  }

  /**
   * Handle /analytics command
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
   */
  async handleCleanup() {
    try {
      const result = await this.conversationService.persistenceService.cleanupOldData();

      return `🧹 *Data Cleanup Complete*

📊 *Cleanup Results:*
• Conversations cleaned: ${result.cleanedConversations || 0}
• Analytics entries cleaned: ${result.cleanedAnalytics || 0}
• Total space freed: ${result.spaceSaved || 'Unknown'}

✅ Old data (30+ days) has been removed to optimize storage.`;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return '❌ Error occurred during data cleanup. Please try again later.';
    }
  }

  /**
   * Handle /health command
   */
  async handleHealth() {
    try {
      if (!this.monitoringService) {
        return '❌ Monitoring service not available.';
      }

      const mistralOk = await this.mistralAgentService.checkApiStatus();

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

      response += `🧠 *Mistral Agent API:* ${mistralOk ? '✅ Connected' : '❌ Disconnected'}\n\n`;

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

      if (dashboard.errors) {
        response += `🚨 *Errors:*\n`;
        response += `• Total: ${dashboard.errors.total}\n`;
        response += `• Recent: ${dashboard.errors.recent}\n\n`;
      }

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
   */
  async handlePerformance() {
    try {
      if (!this.performanceOptimizer) {
        return '❌ Performance optimizer not available.';
      }

      const stats = this.performanceOptimizer.getPerformanceStats();

      let response = `⚡ *Performance Metrics*\n\n`;

      if (stats.memory) {
        response += `🧠 *Memory Usage:*\n`;
        response += `• Current: ${Math.round(stats.memory.current)}MB\n`;
        response += `• Peak: ${Math.round(stats.memory.peak)}MB\n`;
        response += `• Average: ${Math.round(stats.memory.average)}MB\n\n`;
      }

      if (stats.responseTime) {
        response += `⏱️ *Response Times:*\n`;
        response += `• Average: ${Math.round(stats.responseTime.average)}ms\n`;
        response += `• Fastest: ${Math.round(stats.responseTime.min)}ms\n`;
        response += `• Slowest: ${Math.round(stats.responseTime.max)}ms\n\n`;
      }

      if (stats.cache) {
        response += `💾 *Cache Performance:*\n`;
        response += `• Hit Rate: ${Math.round(stats.cache.hitRate * 100)}%\n`;
        response += `• Entries: ${stats.cache.size}\n`;
        response += `• Memory: ${Math.round(stats.cache.memoryUsage)}MB\n\n`;
      }

      return response;
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      return '❌ Error occurred while retrieving performance data.';
    }
  }

  /**
   * Handle /errors command
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

      if (errorStats.byComponent && Object.keys(errorStats.byComponent).length > 0) {
        response += `🔧 *Errors by Component:*\n`;
        Object.entries(errorStats.byComponent).forEach(([component, count]) => {
          response += `• ${component}: ${count}\n`;
        });
        response += `\n`;
      }

      if (errorStats.byType && Object.keys(errorStats.byType).length > 0) {
        response += `📋 *Errors by Type:*\n`;
        Object.entries(errorStats.byType).forEach(([type, count]) => {
          response += `• ${type}: ${count}\n`;
        });
        response += `\n`;
      }

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
   * Handle /admin command
   */
  async handleAdminCommand(args, chatId) {
    try {
      if (!this.adminService) {
        return '❌ Admin service not available.';
      }

      const subCommand = args[0] || 'status';

      switch (subCommand) {
        case 'status':
          const adminStats = this.adminService.getAdminStats();
          return `🔐 *Admin Status*

📊 *Command Usage:*
• Total Commands: ${adminStats.totalCommands}
• Admin Commands: ${adminStats.adminCommands}
• Denied Commands: ${adminStats.deniedCommands}

👥 *Admin Numbers:*
${adminStats.adminNumbers.map(num => `• ${num}`).join('\n')}

🚫 *Admin-Only Commands:*
${adminStats.adminOnlyCommands.map(cmd => `• /${cmd}`).join('\n')}

📋 *Settings:*
${Object.entries(adminStats.settings || {}).map(([key, value]) => `• ${key}: ${JSON.stringify(value)}`).join('\n')}`;

        case 'stats':
          const stats = this.adminService.getCommandStats();
          let response = `📈 *Admin Command Statistics*\n\n`;

          if (stats.byCommand && Object.keys(stats.byCommand).length > 0) {
            response += `📋 *Usage by Command:*\n`;
            Object.entries(stats.byCommand)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .forEach(([cmd, count]) => {
                response += `• /${cmd}: ${count} times\n`;
              });
          }

          return response;

        default:
          return `❓ Unknown admin subcommand: ${subCommand}\n\n` +
            `Available subcommands:\n` +
            `• /admin status - Show admin status\n` +
            `• /admin stats - Show command statistics`;
      }
    } catch (error) {
      console.error('❌ Error in admin command:', error);
      return '❌ Error occurred while processing admin command.';
    }
  }

  /**
   * Handle /sqlite command
   */
  async handleSqliteCommand(args, chatId) {
    try {
      const subCommand = args[0] || 'status';

      switch (subCommand) {
        case 'status':
          return `💾 *SQLite Service Status*

🔧 *Implementation:*
SQLite is the persistence backend for this bot.

Database file: ./data/whatsapp-ai.sqlite

📊 *Features:*
• Optimized database schema
• Prepared statements for performance
• Automatic cleanup and maintenance
• Analytics and reporting

⚡ *Performance Benefits:*
• Durable local storage
• Better concurrent access via WAL
• Automatic indexing for common queries
• ACID compliance

🚀 *Migration:*
SQLite is already enabled by default. No migration flow is required.`;

        case 'migrate':
          return `🔄 *SQLite Migration*

SQLite is already enabled by default.

There is no migration flow to run.`;

        case 'performance':
          return `⚡ *SQLite Performance Notes*

SQLite is the recommended persistence backend for this bot.

✅ *Why SQLite:*
• Avoids loading an entire JSON file into memory
• Better concurrent access via WAL
• Indexes and queryable storage for analytics

ℹ *Note:*
Exact performance depends on hardware, disk, and workload.`;

        default:
          return `❓ Unknown SQLite subcommand: ${subCommand}\n\n` +
            `Available subcommands:\n` +
            `• /sqlite status - Show SQLite status\n` +
            `• /sqlite migrate - Migration information\n` +
            `• /sqlite performance - Performance notes`;
      }
    } catch (error) {
      console.error('❌ Error in SQLite command:', error);
      return '❌ Error occurred while processing SQLite command.';
    }
  }
}

module.exports = CommandHandler;
