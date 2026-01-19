const config = require('../config/config');

/**
 * Admin Service
 * 
 * Handles admin-only commands and access control
 * Only allows specific WhatsApp numbers to use admin commands
 */

class AdminService {
  constructor() {
    // Admin WhatsApp numbers (loaded from environment configuration)
    const configured = Array.isArray(config.admin?.whatsappNumbers) && config.admin.whatsappNumbers.length > 0
      ? config.admin.whatsappNumbers
      : [config.admin?.whatsappNumber];

    this.adminNumbers = configured
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0)
      .map((value) => {
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          return value.slice(1, -1).trim();
        }
        return value;
      })
      .map((value) => (value.includes('@') ? value : `${value}@c.us`));

    // Admin-only commands - ALL commands are now admin-only for security
    this.adminCommands = [
      'help',
      'reset',
      'clear',
      'status',
      'about',
      'context',
      'analytics',
      'cleanup',
      'health',
      'monitor',
      'performance',
      'errors',
      'admin',
      'sqlite'
    ];

    // Command usage tracking
    this.commandUsage = new Map();

    console.log('🔐 Admin service initialized');
    console.log(`👤 Admin numbers: ${this.adminNumbers.length}`);
    console.log(`🛡️ Protected commands: ${this.adminCommands.length}`);
  }

  /**
   * Check if a number is admin
   */
  isAdmin(chatId) {
    const normalizedChatId = typeof chatId === 'string' ? chatId.trim() : '';
    const isAdmin = normalizedChatId.length > 0 && this.adminNumbers.includes(normalizedChatId);

    if (!isAdmin && config.env?.debug) {
      console.log('admin.access_denied_debug', {
        chatId: normalizedChatId,
        configuredAdmins: this.adminNumbers,
      });
    }

    return isAdmin;
  }

  /**
   * Check if a command is admin-only
   */
  isAdminCommand(command) {
    return this.adminCommands.includes(command.toLowerCase());
  }

  /**
   * Validate admin access for command
   */
  validateAdminAccess(chatId, command) {
    const isAdminCmd = this.isAdminCommand(command);
    const isAdminUser = this.isAdmin(chatId);

    // Track command usage
    this.trackCommandUsage(chatId, command, isAdminCmd, isAdminUser);

    if (isAdminCmd && !isAdminUser) {
      return {
        allowed: false,
        reason: 'admin_required',
        message: this.getAccessDeniedMessage(command)
      };
    }

    return {
      allowed: true,
      isAdmin: isAdminUser,
      isAdminCommand: isAdminCmd
    };
  }

  /**
   * Get access denied message
   */
  getAccessDeniedMessage(command) {
    const messages = [
      `🔒 O comando /${command} é restrito apenas para administradores.`,
      `🛡️ Acesso negado. Apenas administradores podem usar /${command}.`,
      `⛔ Comando /${command} não disponível para usuários regulares.`,
      `🚫 Você não tem permissão para usar o comando /${command}.`
    ];

    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex] + '\n\n💡 Use /help para ver os comandos disponíveis.';
  }

  /**
   * Track command usage
   */
  trackCommandUsage(chatId, command, isAdminCmd, isAdminUser) {
    const key = `${chatId}:${command}`;
    const usage = this.commandUsage.get(key) || {
      chatId,
      command,
      count: 0,
      lastUsed: null,
      isAdminCommand: isAdminCmd,
      isAdminUser: isAdminUser,
      deniedCount: 0
    };

    usage.count++;
    usage.lastUsed = new Date().toISOString();

    if (isAdminCmd && !isAdminUser) {
      usage.deniedCount++;
    }

    this.commandUsage.set(key, usage);
  }

  /**
   * Add admin number
   */
  addAdmin(phoneNumber) {
    const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;

    if (!this.adminNumbers.includes(formattedNumber)) {
      this.adminNumbers.push(formattedNumber);
      console.log(`👤 Admin added: ${formattedNumber}`);
      return true;
    }

    return false; // Already exists
  }

  /**
   * Remove admin number
   */
  removeAdmin(phoneNumber) {
    const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
    const index = this.adminNumbers.indexOf(formattedNumber);

    if (index > -1) {
      this.adminNumbers.splice(index, 1);
      console.log(`👤 Admin removed: ${formattedNumber}`);
      return true;
    }

    return false; // Not found
  }

  /**
   * Add admin command
   */
  addAdminCommand(command) {
    const lowerCommand = command.toLowerCase();

    if (!this.adminCommands.includes(lowerCommand)) {
      this.adminCommands.push(lowerCommand);
      console.log(`🛡️ Admin command added: ${lowerCommand}`);
      return true;
    }

    return false; // Already exists
  }

  /**
   * Remove admin command
   */
  removeAdminCommand(command) {
    const lowerCommand = command.toLowerCase();
    const index = this.adminCommands.indexOf(lowerCommand);

    if (index > -1) {
      this.adminCommands.splice(index, 1);
      console.log(`🛡️ Admin command removed: ${lowerCommand}`);
      return true;
    }

    return false; // Not found
  }

  /**
   * Get admin statistics
   */
  getAdminStats() {
    const stats = {
      totalAdmins: this.adminNumbers.length,
      totalAdminCommands: this.adminCommands.length,
      totalCommandUsage: this.commandUsage.size,
      adminNumbers: [...this.adminNumbers],
      adminCommands: [...this.adminCommands]
    };

    // Calculate usage statistics
    let totalUsage = 0;
    let totalDenied = 0;
    const commandStats = {};
    const userStats = {};

    for (const usage of this.commandUsage.values()) {
      totalUsage += usage.count;
      totalDenied += usage.deniedCount;

      // Command statistics
      if (!commandStats[usage.command]) {
        commandStats[usage.command] = { count: 0, denied: 0 };
      }
      commandStats[usage.command].count += usage.count;
      commandStats[usage.command].denied += usage.deniedCount;

      // User statistics
      if (!userStats[usage.chatId]) {
        userStats[usage.chatId] = {
          count: 0,
          denied: 0,
          isAdmin: usage.isAdminUser,
          lastUsed: usage.lastUsed
        };
      }
      userStats[usage.chatId].count += usage.count;
      userStats[usage.chatId].denied += usage.deniedCount;

      // Update last used if more recent
      if (usage.lastUsed > userStats[usage.chatId].lastUsed) {
        userStats[usage.chatId].lastUsed = usage.lastUsed;
      }
    }

    stats.usage = {
      totalCommands: totalUsage,
      totalDenied: totalDenied,
      denialRate: totalUsage > 0 ? (totalDenied / totalUsage) * 100 : 0,
      byCommand: commandStats,
      byUser: userStats
    };

    return stats;
  }

  /**
   * Get command usage for specific user
   */
  getUserCommandUsage(chatId) {
    const userUsage = [];

    for (const [key, usage] of this.commandUsage.entries()) {
      if (usage.chatId === chatId) {
        userUsage.push(usage);
      }
    }

    return userUsage.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
  }

  /**
   * Clean old usage data
   */
  cleanupUsageData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days default
    const cutoff = new Date(Date.now() - maxAge);
    let cleaned = 0;

    for (const [key, usage] of this.commandUsage.entries()) {
      if (new Date(usage.lastUsed) < cutoff) {
        this.commandUsage.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old command usage records`);
    }

    return cleaned;
  }

  /**
   * Export admin configuration
   */
  exportConfig() {
    return {
      adminNumbers: [...this.adminNumbers],
      adminCommands: [...this.adminCommands],
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import admin configuration
   */
  importConfig(config) {
    try {
      if (config.adminNumbers && Array.isArray(config.adminNumbers)) {
        this.adminNumbers = [...config.adminNumbers];
      }

      if (config.adminCommands && Array.isArray(config.adminCommands)) {
        this.adminCommands = [...config.adminCommands];
      }

      console.log('📥 Admin configuration imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Error importing admin configuration:', error);
      return false;
    }
  }

  /**
   * Generate admin report
   */
  generateAdminReport() {
    const stats = this.getAdminStats();
    const now = new Date();

    let report = `🔐 *Admin Access Report*\n`;
    report += `📅 Generated: ${now.toLocaleString()}\n\n`;

    report += `👥 *Admin Configuration:*\n`;
    report += `• Total Admins: ${stats.totalAdmins}\n`;
    report += `• Protected Commands: ${stats.totalAdminCommands}\n\n`;

    if (stats.usage.totalCommands > 0) {
      report += `📊 *Usage Statistics:*\n`;
      report += `• Total Commands: ${stats.usage.totalCommands}\n`;
      report += `• Access Denied: ${stats.usage.totalDenied}\n`;
      report += `• Denial Rate: ${stats.usage.denialRate.toFixed(1)}%\n\n`;

      // Top commands
      const topCommands = Object.entries(stats.usage.byCommand)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5);

      if (topCommands.length > 0) {
        report += `🔝 *Most Used Commands:*\n`;
        topCommands.forEach(([cmd, data], index) => {
          report += `${index + 1}. /${cmd}: ${data.count} uses`;
          if (data.denied > 0) {
            report += ` (${data.denied} denied)`;
          }
          report += `\n`;
        });
      }
    } else {
      report += `📊 *Usage Statistics:*\nNo command usage recorded yet.\n`;
    }

    return report;
  }

  /**
   * Validate admin setup
   */
  validateSetup() {
    const issues = [];

    if (this.adminNumbers.length === 0) {
      issues.push('No admin numbers configured');
    }

    if (this.adminCommands.length === 0) {
      issues.push('No admin commands configured');
    }

    // Check for invalid admin numbers
    for (const number of this.adminNumbers) {
      if (!number.includes('@c.us')) {
        issues.push(`Invalid admin number format: ${number}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

module.exports = AdminService;
