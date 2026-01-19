const config = require('../config/config');

class MessageService {
  constructor() {
    this.messageSplitLength = config.bot.messageSplitLength;
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

    // Ignore non-text messages
    if (message.type !== 'chat') {
      return true;
    }

    // Ignore empty messages
    if (!message.body || message.body.trim() === '') {
      return true;
    }

    // Ignore emoji-only messages
    if (this.isEmojiOnly(message.body)) {
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
}

module.exports = MessageService;
