module.exports = {
  name: 'admincontrols',
  alias: ['ac', 'admincmd'],
  desc: 'Control bot settings and features',
  category: 'Admin',
  
  execute: async (sock, message, { args, reply }) => {
    const adminService = global.adminService;
    if (!adminService) {
      return reply('❌ Admin service not initialized');
    }

    const isAdmin = adminService.isAdmin(message.from);
    if (!isAdmin) {
      return reply('🔒 This command is for admins only');
    }

    const subCommand = args[0]?.toLowerCase();
    const arg = args.slice(1).join(' ');

    // Show status
    if (!subCommand || subCommand === 'status') {
      const status = adminService.getSettingsStatus();
      return reply(
        `╭─❍ *🤖 BOT CONTROLS*\n│\n` +
        `│ *AI Controls:*\n` +
        `│   • AI Master: ${status.ai.enabled}\n` +
        `│   • Private Chats: ${status.ai.privateChats}\n` +
        `│   • Groups: ${status.ai.groups}\n` +
        `│\n` +
        `│ *Auto-Delete:*\n` +
        `│   • Status: ${status.autoDelete.enabled}\n` +
        `│   • Groups: ${status.autoDelete.groups}\n` +
        `│   • Delay: ${status.autoDelete.delay}\n` +
        `│\n` +
        `│ *Modes:*\n` +
        `│   • Private Only: ${status.modes.privateOnly}\n` +
        `│   • Group Only: ${status.modes.groupOnly}\n` +
        `│   • Admin Only: ${status.modes.adminOnly}\n` +
        `│\n` +
        `│ *Protection:*\n` +
        `│   • Anti-Spam: ${status.protection.antiSpam}\n` +
        `│   • Anti-Link: ${status.protection.antiLink}\n` +
        `│   • Welcome: ${status.protection.welcome}\n` +
        `│\n` +
        `│ *Commands:*\n` +
        `│   /aion - Turn AI ON\n` +
        `│   /aioff - Turn AI OFF\n` +
        `│   /autodel - Toggle auto-delete\n` +
        `│   /privateonly - Private mode only\n` +
        `│   /grouponly - Group mode only\n` +
        `│   /adminonly - Admin only mode\n` +
        `│   /publicmode - Make all public\n` +
        `│   /reset - Reset settings\n` +
        `╰──────────────────`
      );
    }

    // AI Controls
    if (subCommand === 'aion') {
      adminService.toggleSetting('aiEnabled', true);
      return reply('✅ AI Master toggle turned ON');
    }

    if (subCommand === 'aioff') {
      adminService.toggleSetting('aiEnabled', false);
      return reply('⛔ AI Master toggle turned OFF');
    }

    if (subCommand === 'aiprivate') {
      const status = adminService.toggleSetting('aiPrivateChats');
      return reply(`✅ AI in private chats: ${status ? 'ON' : 'OFF'}`);
    }

    if (subCommand === 'aigroup') {
      const status = adminService.toggleSetting('aiGroups');
      return reply(`✅ AI in groups: ${status ? 'ON' : 'OFF'}`);
    }

    // Auto-Delete Controls
    if (subCommand === 'autodel') {
      const groupId = message.key.remoteJid;
      if (!groupId || !groupId.endsWith('@g.us')) {
        return reply('❌ This command must be used in a group');
      }

      const isEnabled = adminService.isAutoDeleteEnabled(groupId);
      if (isEnabled) {
        adminService.removeAutoDeleteGroup(groupId);
        return reply('⛔ Auto-delete disabled for this group');
      } else {
        adminService.addAutoDeleteGroup(groupId);
        return reply('✅ Auto-delete enabled for this group! Messages will be auto-deleted.');
      }
    }

    if (subCommand === 'autodeltime') {
      const seconds = parseInt(arg);
      if (isNaN(seconds) || seconds < 1 || seconds > 60) {
        return reply('❌ Please provide a valid time (1-60 seconds)');
      }
      adminService.settings.autoDeleteDelay = seconds * 1000;
      adminService.saveSettings();
      return reply(`✅ Auto-delete delay set to ${seconds} seconds`);
    }

    // Mode Controls
    if (subCommand === 'privateonly') {
      adminService.toggleSetting('privateOnlyMode', true);
      adminService.toggleSetting('groupOnlyMode', false);
      return reply('✅ Bot set to PRIVATE ONLY mode (only responds in private chats)');
    }

    if (subCommand === 'grouponly') {
      adminService.toggleSetting('groupOnlyMode', true);
      adminService.toggleSetting('privateOnlyMode', false);
      return reply('✅ Bot set to GROUP ONLY mode (only responds in groups)');
    }

    if (subCommand === 'adminonly') {
      const status = adminService.toggleSetting('adminOnlyCommands');
      return reply(`✅ Admin-only mode: ${status ? 'ON' : 'OFF'}`);
    }

    if (subCommand === 'publicmode') {
      adminService.toggleSetting('adminOnlyCommands', false);
      return reply('✅ All commands are now PUBLIC');
    }

    // Reset Settings
    if (subCommand === 'reset') {
      adminService.resetSettings();
      return reply('🔄 All settings reset to default');
    }

    // Help
    return reply(
      `📋 *Admin Control Commands*\n\n` +
      `AI Controls:\n` +
      `  /aion - Turn AI ON\n` +
      `  /aioff - Turn AI OFF\n` +
      `  /aiprivate - Toggle AI in private\n` +
      `  /aigroup - Toggle AI in groups\n\n` +
      `Auto-Delete:\n` +
      `  /autodel - Toggle auto-delete\n` +
      `  /autodeltime <s> - Set delay\n\n` +
      `Modes:\n` +
      `  /privateonly - Private only\n` +
      `  /grouponly - Group only\n` +
      `  /adminonly - Admin only\n` +
      `  /publicmode - Make all public\n\n` +
      `Other:\n` +
      `  /reset - Reset settings\n` +
      `  /status - Show current settings`
    );
  }
};
