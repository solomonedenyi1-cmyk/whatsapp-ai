const config = require('../config/config');

class MessageService {
  constructor() {
    this.messageSplitLength = config.bot.messageSplitLength;
    this.debug = config.env?.debug || false;
  }

  /**
   * Check if a message should be ignored
   * @param {Object} message - WhatsApp message object
   * @returns {boolean} - True if message should be ignored
   */
  shouldIgnoreMessage(message) {
    // Ignore messages from the bot itself
    if (message.fromMe) {
      return true;
    }

    // Ignore status broadcasts
    if (message.from === 'status@broadcast') {
      return true;
    }

    // 🚫 IGNORE ALL GROUP MESSAGES (ends with @g.us)
    if (message.from && message.from.endsWith('@g.us')) {
      if (this.debug) console.log(`⏭️ Ignoring: Group message from ${message.from}`);
      return true;
    }

    const type = message?.type;

    // Only process chat and audio-like messages
    if (type !== 'chat' && type !== 'ptt' && type !== 'audio') {
      return true;
    }

    // Chat message validation
    if (type === 'chat') {
      if (!message.body || message.body.trim() === '') {
        return true;
      }

      // Ignore emoji-only messages
      if (this.isEmojiOnly(message.body)) {
        return true;
      }
    }

    // Audio message validation
    if ((type === 'ptt' || type === 'audio') && !message.hasMedia) {
      return true;
    }

    return false;
  }

  /**
   * Check if message contains only emojis
   * @param {string} text - Message text
   * @returns {boolean} - True if text contains only emojis
   */
  isEmojiOnly(text) {
    // Simple emoji detection - matches single emoji or emoji sequences
    const emojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]+$/u;
    return emojiRegex.test(text.trim());
  }

  /**
   * Check if message is a command
   * @param {string} text - Message text
   * @returns {boolean} - True if message is a command
   */
  isCommand(text) {
    return text.trim().startsWith('/');
  }

  /**
   * Parse command from message
   * @param {string} text - Message text
   * @returns {Object} - Command object with name and args
   */
  parseCommand(text) {
    const trimmed = text.trim();
    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return {
      command: command.substring(1), // Remove the '/' prefix
      args: args,
      fullText: trimmed
    };
  }

  /**
   * Split long messages into smaller chunks
   * @param {string} text - Text to split
   * @returns {Array<string>} - Array of message chunks
   */
  splitMessage(text) {
    if (text.length <= this.messageSplitLength) {
      return [text];
    }

    const chunks = [];
    let currentChunk = '';

    // Split by sentences first
    const sentences = text.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      // If adding this sentence would exceed the limit
      if (currentChunk.length + sentence.length > this.messageSplitLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If single sentence is too long, split by words
        if (sentence.length > this.messageSplitLength) {
          const words = sentence.split(' ');
          let wordChunk = '';

          for (const word of words) {
            if (wordChunk.length + word.length + 1 > this.messageSplitLength) {
              if (wordChunk) {
                chunks.push(wordChunk.trim());
                wordChunk = '';
              }
            }
            wordChunk += (wordChunk ? ' ' : '') + word;
          }

          if (wordChunk) {
            currentChunk = wordChunk;
          }
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Clean and format message text
   * @param {string} text - Raw message text
   * @returns {string} - Cleaned message text
   */
  cleanMessage(text) {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n'); // Replace multiple newlines with single newline
  }

  /**
   * Format response for WhatsApp
   * @param {string} text - Response text
   * @returns {string} - Formatted response
   */
  formatResponse(text) {
    // Basic formatting for WhatsApp
    return text
      .trim()
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert **bold** to *bold*
      .replace(/__(.*?)__/g, '_$1_'); // Convert __italic__ to _italic_
  }

  /**
   * Check if message is a sticker
   * @param {Object} message - WhatsApp message object
   * @returns {boolean} - True if message is a sticker
   */
  isSticker(message) {
    return message?.type === 'sticker' || message?.message?.stickerMessage !== undefined;
  }

  /**
   * Check if message is a document
   * @param {Object} message - WhatsApp message object
   * @returns {boolean} - True if message is a document
   */
  isDocument(message) {
    return message?.type === 'document' || message?.message?.documentMessage !== undefined;
  }

  /**
   * Check if message is an image
   * @param {Object} message - WhatsApp message object
   * @returns {boolean} - True if message is an image
   */
  isImage(message) {
    return message?.type === 'image' || message?.message?.imageMessage !== undefined;
  }

  /**
   * Check if message is a video
   * @param {Object} message - WhatsApp message object
   * @returns {boolean} - True if message is a video
   */
  isVideo(message) {
    return message?.type === 'video' || message?.message?.videoMessage !== undefined;
  }

  /**
   * Check if message is a voice note
   * @param {Object} message - WhatsApp message object
   * @returns {boolean} - True if message is a voice note
   */
  isVoiceNote(message) {
    const type = message?.type;
    return type === 'ptt' || type === 'audio' || message?.message?.audioMessage?.ptt === true;
  }

  /**
   * Get message type string
   * @param {Object} message - WhatsApp message object
   * @returns {string} - Message type
   */
  getMessageType(message) {
    if (this.isSticker(message)) return 'sticker';
    if (this.isImage(message)) return 'image';
    if (this.isVideo(message)) return 'video';
    if (this.isVoiceNote(message)) return 'voice';
    if (this.isDocument(message)) return 'document';
    return 'text';
  }

  /**
   * Extract text from message
   * @param {Object} message - WhatsApp message object
   * @returns {string} - Extracted text
   */
  extractText(message) {
    if (!message || !message.message) return '';
    
    const msg = message.message;
    return msg.conversation ||
           msg.extendedTextMessage?.text ||
           msg.imageMessage?.caption ||
           msg.videoMessage?.caption ||
           msg.documentMessage?.caption ||
           msg.audioMessage?.caption ||
           '';
  }

  /**
   * Check if message has media
   * @param {Object} message - WhatsApp message object
   * @returns {boolean} - True if message has media
   */
  hasMedia(message) {
    if (!message || !message.message) return false;
    const msg = message.message;
    return !!(msg.imageMessage || 
              msg.videoMessage || 
              msg.documentMessage || 
              msg.audioMessage ||
              msg.stickerMessage);
  }

  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} length - Maximum length
   * @returns {string} - Truncated text
   */
  truncate(text, length = 100) {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  /**
   * Escape special characters for WhatsApp
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeText(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}');
  }

  /**
   * Format number for WhatsApp
   * @param {string} number - Phone number
   * @returns {string} - Formatted number
   */
  formatNumber(number) {
    if (!number) return '';
    // Remove everything except digits and @
    let cleaned = number.replace(/[^0-9@]/g, '');
    // Ensure @c.us format
    if (!cleaned.includes('@')) {
      cleaned = cleaned + '@c.us';
    }
    return cleaned;
  }

  /**
   * Extract quoted message
   * @param {Object} message - WhatsApp message object
   * @returns {Object|null} - Quoted message or null
   */
  getQuotedMessage(message) {
    if (!message || !message.message) return null;
    
    const quoted = message.message.extendedTextMessage?.contextInfo?.quotedMessage ||
                   message.message.imageMessage?.contextInfo?.quotedMessage ||
                   message.message.videoMessage?.contextInfo?.quotedMessage ||
                   message.message.documentMessage?.contextInfo?.quotedMessage ||
                   message.message.audioMessage?.contextInfo?.quotedMessage ||
                   message.message.stickerMessage?.contextInfo?.quotedMessage;
    
    if (!quoted) return null;
    
    return {
      text: quoted.conversation || 
            quoted.extendedTextMessage?.text || 
            quoted.imageMessage?.caption ||
            quoted.videoMessage?.caption ||
            '',
      sender: message.message.extendedTextMessage?.contextInfo?.participant ||
              message.message.imageMessage?.contextInfo?.participant ||
              message.message.videoMessage?.contextInfo?.participant ||
              null,
      type: Object.keys(quoted)[0] || 'unknown'
    };
  }
}

module.exports = MessageService;
