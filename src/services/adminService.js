const config = require('../config/config');
const fs = require('fs');
const path = require('path');

/**
 * Admin Service - Full Control System
 * Handles admin-only commands, access control, and bot management
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

    // 🆕 ALL COMMANDS ARE PUBLIC - Empty array = no restrictions
    this.adminCommands = [];

    // 🆕 Bot control settings with status controls
    this.settings = {
      // AI Chat controls
      aiEnabled: true,           // Master AI toggle
      aiPrivateChats: true,      // AI responds in private chats
      aiGroups: false,           // AI responds in groups (default: OFF)
      
      // Auto-delete controls
      autoDeleteEnabled: false,   // Master auto-delete toggle
      autoDeleteGroups: [],       // Specific groups to auto-delete messages
      autoDeleteDelay: 5000,      // Delay before deleting (5 seconds)
      
      // Message controls
      welcomeEnabled: false,      // Welcome messages
      antiSpamEnabled: false,    // Anti-spam protection
      antiLinkEnabled: false,    // Anti-link protection
      
      // Admin controls
      adminOnlyCommands: false,   // If true, only admins can use commands
      
      // Group controls
      groupOnlyMode: false,       // If true, only works in groups
      privateOnlyMode: true,      // If true, only works in private chats
      
      // 🆕 Status controls
      statusEnabled: false,           // Enable/disable status handling
      statusAutoReact: false,         // Auto-react to statuses
      statusAutoReply: false,         // Auto-reply to statuses
      statusReplyMessage: '👀 Nice status!', // Default reply message
      statusEmojis: ['❤️', '👀', '🔥', '💯', '✨', '👍', '😂', '😍'], // Reaction emojis
      statusViewOn: false,            // View statuses (mark as seen)
      statusForward: false,           // Forward statuses to admin
    };

    // Load settings from file
    this.settingsFile = path.join(process.cwd(), 'data', 'admin-settings.json');
    this.loadSettings();

    // Command usage tracking
    this.commandUsage = new Map();
    this.pendingDeletions = new Map(); // Track messages to delete

    console.log('🔐 Admin service initialized');
    console.log(`👤 Admin numbers: ${this.adminNumbers.length}`);
    console.log('ℹ️  All commands are public');
    console.log('📋 Bot controls loaded');
  }

  /**
   * Load settings from file
   */
  loadSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
        this.settings = { ...this.settings, ...data };
        console.log('📂 Settings loaded from file');
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error.message);
    }
  }

  /**
   * Save settings to file
   */
  saveSettings() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
      console.log('💾 Settings saved to file');
    } catch (error) {
      console.error('❌ Error saving settings:', error.message);
    }
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
    // If adminOnlyCommands is true, all commands are admin-only
    if (this.settings.adminOnlyCommands) {
      return true;
    }
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

    // If adminOnlyCommands is true, only admins can use any command
    if (this.settings.adminOnlyCommands && !isAdminUser) {
      return {
        allowed: false,
        reason: 'admin_required',
        message: `🔒 O bot está em modo admin-only. Apenas administradores podem usar comandos.`
      };
    }

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
   * Get all control commands with descriptions
   */
  getControlCommands() {
    return {
      // AI Control Commands
      'aion': 'Turn AI ON (master toggle)',
      'aioff': 'Turn AI OFF (master toggle)',
      'aiprivate': 'Toggle AI responses in private chats',
      'aigroup': 'Toggle AI responses in groups',
      
      // Auto-Delete Commands
      'autodel': 'Toggle auto-delete for current group',
      'autodelon': 'Turn auto-delete ON for this group',
      'autodeloff': 'Turn auto-delete OFF for this group',
      'autodelall': 'Enable auto-delete for all groups',
      'autodeltime <seconds>': 'Set auto-delete delay (default: 5s)',
      
      // Welcome Commands
      'welcome': 'Toggle welcome messages',
      'welcomeset <message>': 'Set welcome message',
      'welcomeoff': 'Turn welcome OFF',
      
      // Anti-Spam Commands
      'antispam': 'Toggle anti-spam protection',
      'antilink': 'Toggle anti-link protection',
      
      // Mode Commands
      'privateonly': 'Make bot only work in private chats',
      'grouponly': 'Make bot only work in groups',
      'adminonly': 'Make commands admin-only',
      'publicmode': 'Make all commands public',
      
      // Clear Commands
      'clearall': 'Clear all conversations',
      'cleargroup': 'Clear all group conversations',
      'clearprivate': 'Clear all private conversations',
      
      // Status Commands
      'status': 'Show bot status and settings',
      'stats': 'Show bot statistics',
      
      // Group Management
      'join <group_link>': 'Join a group via invite link',
      'leave <group_id>': 'Leave a group',
      'groups': 'List all groups the bot is in',
      
      // Auto-Reply Commands
      'autoreply': 'Toggle auto-reply for this chat',
      'setreply <trigger>|<response>': 'Set custom auto-reply',
      'listreplies': 'List all custom auto-replies',
      'delreply <id>': 'Delete a custom auto-reply',
      
      // Broadcast Commands
      'broadcast <message>': 'Send a broadcast message to all chats',
      'bcgroups <message>': 'Send broadcast to all groups',
      'bcprivate <message>': 'Send broadcast to all private chats',
      
      // Maintenance Commands
      'cleanup': 'Clean up old data',
      'restart': 'Restart the bot',
      'update': 'Update the bot',
      'backup': 'Create a backup of settings',
      'reset': 'Reset all settings to default'
    };
  }

  /**
   * Get formatted settings status
   */
  getSettingsStatus() {
    return {
      ai: {
        enabled: this.settings.aiEnabled ? '✅ ON' : '❌ OFF',
        privateChats: this.settings.aiPrivateChats ? '✅ ON' : '❌ OFF',
        groups: this.settings.aiGroups ? '✅ ON' : '❌ OFF'
      },
      autoDelete: {
        enabled: this.settings.autoDeleteEnabled ? '✅ ON' : '❌ OFF',
        groups: this.settings.autoDeleteGroups.length > 0 ? `✅ ${this.settings.autoDeleteGroups.length} groups` : '❌ OFF',
        delay: `${this.settings.autoDeleteDelay / 1000}s`
      },
      modes: {
        privateOnly: this.settings.privateOnlyMode ? '✅ ON' : '❌ OFF',
        groupOnly: this.settings.groupOnlyMode ? '✅ ON' : '❌ OFF',
        adminOnly: this.settings.adminOnlyCommands ? '✅ ON' : '❌ OFF'
      },
      protection: {
        antiSpam: this.settings.antiSpamEnabled ? '✅ ON' : '❌ OFF',
        antiLink: this.settings.antiLinkEnabled ? '✅ ON' : '❌ OFF',
        welcome: this.settings.welcomeEnabled ? '✅ ON' : '❌ OFF'
      },
      // 🆕 Status settings
      status: {
        enabled: this.settings.statusEnabled ? '✅ ON' : '❌ OFF',
        autoReact: this.settings.statusAutoReact ? '✅ ON' : '❌ OFF',
        autoReply: this.settings.statusAutoReply ? '✅ ON' : '❌ OFF',
        viewOn: this.settings.statusViewOn ? '✅ ON' : '❌ OFF',
        forward: this.settings.statusForward ? '✅ ON' : '❌ OFF',
        replyMessage: this.settings.statusReplyMessage,
        emojis: this.settings.statusEmojis.join(', '),
      }
    };
  }

  /**
   * Toggle a setting
   */
  toggleSetting(setting, value = null) {
    if (setting in this.settings) {
      if (value !== null) {
        this.settings[setting] = value;
      } else {
        this.settings[setting] = !this.settings[setting];
      }
      this.saveSettings();
      return this.settings[setting];
    }
    return null;
  }

  /**
   * Add group to auto-delete list
   */
  addAutoDeleteGroup(groupId) {
    if (!this.settings.autoDeleteGroups.includes(groupId)) {
      this.settings.autoDeleteGroups.push(groupId);
      this.settings.autoDeleteEnabled = true;
      this.saveSettings();
      return true;
    }
    return false;
  }

  /**
   * Remove group from auto-delete list
   */
  removeAutoDeleteGroup(groupId) {
    const index = this.settings.autoDeleteGroups.indexOf(groupId);
    if (index > -1) {
      this.settings.autoDeleteGroups.splice(index, 1);
      if (this.settings.autoDeleteGroups.length === 0) {
        this.settings.autoDeleteEnabled = false;
      }
      this.saveSettings();
      return true;
    }
    return false;
  }

  /**
   * Check if a group has auto-delete enabled
   */
  isAutoDeleteEnabled(groupId) {
    return this.settings.autoDeleteEnabled && 
           this.settings.autoDeleteGroups.includes(groupId);
  }

  /**
   * Schedule a message for deletion
   */
  scheduleDeletion(chatId, messageId, delay = null) {
    const deleteDelay = delay || this.settings.autoDeleteDelay;
    const timer = setTimeout(async () => {
      try {
        if (global.sock) {
          await global.sock.sendMessage(chatId, { delete: messageId });
          console.log(`🗑️ Deleted message in ${chatId}`);
        }
        this.pendingDeletions.delete(messageId);
      } catch (error) {
        console.error('❌ Failed to delete message:', error.message);
      }
    }, deleteDelay);
    
    this.pendingDeletions.set(messageId, timer);
    return true;
  }

  /**
   * Cancel pending deletion
   */
  cancelDeletion(messageId) {
    if (this.pendingDeletions.has(messageId)) {
      clearTimeout(this.pendingDeletions.get(messageId));
      this.pendingDeletions.delete(messageId);
      return true;
    }
    return false;
  }

  // 🆕 Status control methods

  /**
   * Get status settings
   */
  getStatusSettings() {
    return {
      enabled: this.settings.statusEnabled ? '✅ ON' : '❌ OFF',
      autoReact: this.settings.statusAutoReact ? '✅ ON' : '❌ OFF',
      autoReply: this.settings.statusAutoReply ? '✅ ON' : '❌ OFF',
      viewOn: this.settings.statusViewOn ? '✅ ON' : '❌ OFF',
      forward: this.settings.statusForward ? '✅ ON' : '❌ OFF',
      replyMessage: this.settings.statusReplyMessage,
      emojis: this.settings.statusEmojis.join(', '),
    };
  }

  /**
   * Toggle status viewing
   */
  toggleStatusView() {
    this.settings.statusViewOn = !this.settings.statusViewOn;
    this.saveSettings();
    return this.settings.statusViewOn;
  }

  /**
   * Toggle status forwarding
   */
  toggleStatusForward() {
    this.settings.statusForward = !this.settings.statusForward;
    this.saveSettings();
    return this.settings.statusForward;
  }

  /**
   * Get random emoji for status reaction
   */
  getRandomStatusEmoji() {
    const emojis = this.settings.statusEmojis;
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  /**
   * Set status reply message
   */
  setStatusReply(message) {
    if (!message || message.trim().length === 0) {
      return false;
    }
    this.settings.statusReplyMessage = message.trim();
    this.saveSettings();
    return true;
  }

  /**
   * Set status emojis
   */
  setStatusEmojis(emojis) {
    if (!Array.isArray(emojis) || emojis.length === 0) {
      return false;
    }
    this.settings.statusEmojis = emojis;
    this.saveSettings();
    return true;
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
      adminCommands: [...this.adminCommands],
      settings: this.getSettingsStatus()
    };

    // Calculate usage statistics
    let totalUsage = 0;
    let totalDenied = 0;
    const commandStats = {};
    const userStats = {};

    for (const usage of this.commandUsage.values()) {
      totalUsage += usage.count;
      totalDenied += usage.deniedCount;

      if (!commandStats[usage.command]) {
        commandStats[usage.command] = { count: 0, denied: 0 };
      }
      commandStats[usage.command].count += usage.count;
      commandStats[usage.command].denied += usage.deniedCount;

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
   * Reset all settings to default
   */
  resetSettings() {
    this.settings = {
      aiEnabled: true,
      aiPrivateChats: true,
      aiGroups: false,
      autoDeleteEnabled: false,
      autoDeleteGroups: [],
      autoDeleteDelay: 5000,
      welcomeEnabled: false,
      antiSpamEnabled: false,
      antiLinkEnabled: false,
      adminOnlyCommands: false,
      groupOnlyMode: false,
      privateOnlyMode: true,
      // 🆕 Status settings
      statusEnabled: false,
      statusAutoReact: false,
      statusAutoReply: false,
      statusReplyMessage: '👀 Nice status!',
      statusEmojis: ['❤️', '👀', '🔥', '💯', '✨', '👍', '😂', '😍'],
      statusViewOn: false,
      statusForward: false,
    };
    this.saveSettings();
    return true;
  }

  /**
   * Validate admin setup
   */
  validateSetup() {
    const issues = [];

    if (this.adminNumbers.length === 0) {
      issues.push('No admin numbers configured');
    }

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

  // Legacy methods for compatibility
  addAdmin(phoneNumber) {
    const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
    if (!this.adminNumbers.includes(formattedNumber)) {
      this.adminNumbers.push(formattedNumber);
      console.log(`👤 Admin added: ${formattedNumber}`);
      return true;
    }
    return false;
  }

  removeAdmin(phoneNumber) {
    const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
    const index = this.adminNumbers.indexOf(formattedNumber);
    if (index > -1) {
      this.adminNumbers.splice(index, 1);
      console.log(`👤 Admin removed: ${formattedNumber}`);
      return true;
    }
    return false;
  }

  addAdminCommand(command) {
    const lowerCommand = command.toLowerCase();
    if (!this.adminCommands.includes(lowerCommand)) {
      this.adminCommands.push(lowerCommand);
      console.log(`🛡️ Admin command added: ${lowerCommand}`);
      return true;
    }
    return false;
  }

  removeAdminCommand(command) {
    const lowerCommand = command.toLowerCase();
    const index = this.adminCommands.indexOf(lowerCommand);
    if (index > -1) {
      this.adminCommands.splice(index, 1);
      console.log(`🛡️ Admin command removed: ${lowerCommand}`);
      return true;
    }
    return false;
  }

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
    }

    return report;
  }
}

module.exports = AdminService;
