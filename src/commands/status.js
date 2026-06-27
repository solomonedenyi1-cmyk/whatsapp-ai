module.exports = {
  name: 'status',
  alias: ['stories', 'story', 'viewstatus', 'statusview'],
  desc: 'View and interact with WhatsApp statuses',
  category: 'Tools',
  
  execute: async (sock, message, { args, reply }) => {
    const adminService = global.adminService;
    if (!adminService) {
      return reply('❌ Admin service not available');
    }

    const isAdmin = adminService.isAdmin(message.from);
    const subCommand = args[0]?.toLowerCase();

    // 💬 React to status
    if (subCommand === 'react') {
      const emoji = args[1];
      if (!emoji) {
        return reply(
          '❌ Please provide an emoji\n' +
          'Example: /status react ❤️\n\n' +
          'Available emojis: ❤️ 👀 🔥 💯 ✨ 👍 😂 😍'
        );
      }
      
      const quoted = message.quoted;
      if (!quoted || !quoted.isStatus) {
        return reply('❌ Please reply to a status message');
      }
      
      try {
        await quoted.react(emoji);
        return reply(`✅ Reacted with ${emoji}`);
      } catch (error) {
        return reply(`❌ Failed to react: ${error.message}`);
      }
    }

    // 💬 Reply to status
    if (subCommand === 'reply') {
      const text = args.slice(1).join(' ');
      if (!text) {
        return reply('❌ Please provide a reply text\nExample: /status reply Nice status!');
      }
      
      const quoted = message.quoted;
      if (!quoted || !quoted.isStatus) {
        return reply('❌ Please reply to a status message');
      }
      
      try {
        await quoted.reply(text);
        return reply(`✅ Replied: ${text}`);
      } catch (error) {
        return reply(`❌ Failed to reply: ${error.message}`);
      }
    }

    // 👁️ View status (mark as seen)
    if (subCommand === 'view') {
      const quoted = message.quoted;
      if (!quoted || !quoted.isStatus) {
        return reply('❌ Please reply to a status message');
      }
      
      try {
        const chat = await quoted.getChat();
        await chat.sendSeen();
        return reply('👁️ Status marked as viewed');
      } catch (error) {
        return reply(`❌ Failed to view status: ${error.message}`);
      }
    }

    // 📥 Download status media
    if (subCommand === 'download') {
      const quoted = message.quoted;
      if (!quoted || !quoted.isStatus) {
        return reply('❌ Please reply to a status message with media');
      }
      
      if (!quoted.hasMedia) {
        return reply('❌ This status has no media to download');
      }
      
      try {
        const media = await quoted.downloadMedia();
        if (!media) {
          return reply('❌ Failed to download media');
        }
        
        const buffer = Buffer.from(media.data, 'base64');
        await sock.sendMessage(message.chat, {
          [quoted.type === 'image' ? 'image' : 'video']: buffer,
          caption: `📥 Status media from ${quoted.from}`,
          mimetype: media.mimetype,
        }, { quoted: message });
        return reply('✅ Status media downloaded and sent');
      } catch (error) {
        return reply(`❌ Failed to download: ${error.message}`);
      }
    }

    // 🎨 Toggle auto-react
    if (subCommand === 'autoreact') {
      if (!isAdmin) {
        return reply('🔒 Only admins can toggle auto-react');
      }
      const status = adminService.toggleSetting('statusAutoReact');
      return reply(`✅ Auto-react to statuses: ${status ? 'ON' : 'OFF'}`);
    }

    // 💬 Toggle auto-reply
    if (subCommand === 'autoreply') {
      if (!isAdmin) {
        return reply('🔒 Only admins can toggle auto-reply');
      }
      const status = adminService.toggleSetting('statusAutoReply');
      return reply(`✅ Auto-reply to statuses: ${status ? 'ON' : 'OFF'}`);
    }

    // 👁️ Toggle view status
    if (subCommand === 'viewon') {
      if (!isAdmin) {
        return reply('🔒 Only admins can toggle status viewing');
      }
      const status = adminService.toggleSetting('statusViewOn');
      return reply(`✅ Status viewing: ${status ? 'ON' : 'OFF'}`);
    }

    if (subCommand === 'viewoff') {
      if (!isAdmin) {
        return reply('🔒 Only admins can toggle status viewing');
      }
      const status = adminService.toggleSetting('statusViewOn', false);
      return reply(`⛔ Status viewing: ${status ? 'ON' : 'OFF'}`);
    }

    // 📤 Toggle forward status
    if (subCommand === 'forwardon') {
      if (!isAdmin) {
        return reply('🔒 Only admins can toggle status forwarding');
      }
      const status = adminService.toggleSetting('statusForward');
      return reply(`✅ Status forwarding: ${status ? 'ON' : 'OFF'}`);
    }

    if (subCommand === 'forwardoff') {
      if (!isAdmin) {
        return reply('🔒 Only admins can toggle status forwarding');
      }
      const status = adminService.toggleSetting('statusForward', false);
      return reply(`⛔ Status forwarding: ${status ? 'ON' : 'OFF'}`);
    }

    // 💬 Set reply message
    if (subCommand === 'setreply') {
      if (!isAdmin) {
        return reply('🔒 Only admins can set reply message');
      }
      const text = args.slice(1).join(' ');
      if (!text) {
        return reply('❌ Please provide a reply message\nExample: /status setreply Nice status! 😊');
      }
      adminService.setStatusReply(text);
      return reply(`✅ Status reply message set to: "${text}"`);
    }

    // 🎨 Set emojis
    if (subCommand === 'setemojis') {
      if (!isAdmin) {
        return reply('🔒 Only admins can set emojis');
      }
      const emojis = args.slice(1);
      if (emojis.length === 0) {
        return reply('❌ Please provide emojis\nExample: /status setemojis ❤️ 👀 🔥');
      }
      adminService.setStatusEmojis(emojis);
      return reply(`✅ Status emojis set to: ${emojis.join(' ')}`);
    }

    // 📊 Show status
    if (subCommand === 'status' || !subCommand) {
      const statusSettings = adminService.getStatusSettings();
      const totalStatuses = adminService.processedStatuses?.size || 0;
      
      return reply(
        `╭─❍ *📱 STATUS CONTROLS*\n` +
        `│\n` +
        `│ *Settings:*\n` +
        `│   • Status Handling: ${statusSettings.enabled}\n` +
        `│   • Auto-View: ${statusSettings.viewOn}\n` +
        `│   • Auto-React: ${statusSettings.autoReact}\n` +
        `│   • Auto-Reply: ${statusSettings.autoReply}\n` +
        `│   • Forward: ${statusSettings.forward}\n` +
        `│   • Reply Message: "${statusSettings.replyMessage}"\n` +
        `│   • Emojis: ${statusSettings.emojis}\n` +
        `│\n` +
        `│ *Stats:*\n` +
        `│   • Statuses Processed: ${totalStatuses}\n` +
        `│\n` +
        `│ *Admin Commands:*\n` +
        `│   /status on - Enable status handling\n` +
        `│   /status off - Disable status handling\n` +
        `│   /status viewon - Auto-view statuses\n` +
        `│   /status viewoff - Stop auto-view\n` +
        `│   /status forwardon - Forward statuses to admin\n` +
        `│   /status forwardoff - Stop forwarding\n` +
        `│   /status autoreact - Toggle auto-reactions\n` +
        `│   /status autoreply - Toggle auto-replies\n` +
        `│   /status setreply <msg> - Set reply message\n` +
        `│   /status setemojis ❤️ 👀 - Set reaction emojis\n` +
        `│\n` +
        `│ *User Commands:*\n` +
        `│   /status react ❤️ - React to status (reply)\n` +
        `│   /status reply <text> - Reply to status (reply)\n` +
        `│   /status view - Mark status as viewed (reply)\n` +
        `│   /status download - Download status media (reply)\n` +
        `│\n` +
        `│ *Quick Setup:*\n` +
        `│   /status on\n` +
        `│   /status autoreact\n` +
        `│   /status setreply Nice status! 🔥\n` +
        `╰──────────────────`
      );
    }

    // Turn ON/OFF
    if (subCommand === 'on') {
      if (!isAdmin) {
        return reply('🔒 Only admins can enable status handling');
      }
      adminService.toggleSetting('statusEnabled', true);
      return reply('✅ Status handling ENABLED\n\nBot will now view and react to statuses!');
    }

    if (subCommand === 'off') {
      if (!isAdmin) {
        return reply('🔒 Only admins can disable status handling');
      }
      adminService.toggleSetting('statusEnabled', false);
      return reply('⛔ Status handling DISABLED');
    }

    return reply(
      '❓ Unknown command\n\n' +
      'Use /status to see all available commands'
    );
  }
};
