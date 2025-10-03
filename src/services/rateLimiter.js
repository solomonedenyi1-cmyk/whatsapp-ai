/**
 * Rate Limiting Service
 * 
 * Prevents spam and abuse by limiting message frequency per user
 * Implements sliding window algorithm with burst allowance
 */

class RateLimiter {
  constructor() {
    this.userLimits = new Map();
    this.config = {
      // Standard user limits
      messagesPerMinute: 10,
      messagesPerHour: 100,
      burstAllowance: 3, // Allow 3 quick messages in succession
      
      // Admin limits (more lenient)
      adminMessagesPerMinute: 30,
      adminMessagesPerHour: 500,
      
      // Cleanup intervals
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      userDataTTL: 60 * 60 * 1000, // 1 hour
      
      // Penalty system
      penaltyDuration: 5 * 60 * 1000, // 5 minutes penalty
      maxPenalties: 3, // Max penalties before longer ban
      longBanDuration: 30 * 60 * 1000 // 30 minutes
    };

    this.adminNumbers = new Set();
    this.startCleanupTimer();
  }

  /**
   * Set admin numbers for lenient rate limiting
   */
  setAdminNumbers(adminNumbers) {
    this.adminNumbers = new Set(adminNumbers);
  }

  /**
   * Check if user is allowed to send message
   */
  checkLimit(chatId, isCommand = false) {
    const now = Date.now();
    const isAdmin = this.adminNumbers.has(chatId);
    
    // Get or create user data
    let userData = this.userLimits.get(chatId);
    if (!userData) {
      userData = {
        messages: [],
        penalties: 0,
        lastPenalty: 0,
        banned: false,
        banUntil: 0,
        firstMessage: now
      };
      this.userLimits.set(chatId, userData);
    }

    // Check if user is banned
    if (userData.banned && now < userData.banUntil) {
      return {
        allowed: false,
        reason: 'temporarily_banned',
        retryAfter: userData.banUntil - now,
        message: `🚫 Você está temporariamente bloqueado. Tente novamente em ${Math.ceil((userData.banUntil - now) / 60000)} minutos.`
      };
    }

    // Clear ban if expired
    if (userData.banned && now >= userData.banUntil) {
      userData.banned = false;
      userData.banUntil = 0;
      userData.penalties = Math.max(0, userData.penalties - 1); // Reduce penalty count
    }

    // Clean old messages (sliding window)
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneMinuteAgo = now - 60 * 1000;
    userData.messages = userData.messages.filter(timestamp => timestamp > oneHourAgo);

    // Get limits based on user type
    const limits = isAdmin ? {
      perMinute: this.config.adminMessagesPerMinute,
      perHour: this.config.adminMessagesPerHour
    } : {
      perMinute: this.config.messagesPerMinute,
      perHour: this.config.messagesPerHour
    };

    // Count recent messages
    const messagesLastMinute = userData.messages.filter(timestamp => timestamp > oneMinuteAgo).length;
    const messagesLastHour = userData.messages.length;

    // Check burst allowance for new users (first few messages)
    const isNewUser = userData.messages.length < this.config.burstAllowance;
    const effectivePerMinute = isNewUser ? limits.perMinute + this.config.burstAllowance : limits.perMinute;

    // Check limits
    if (messagesLastMinute >= effectivePerMinute) {
      this.applyPenalty(userData, 'rate_limit_minute');
      return {
        allowed: false,
        reason: 'rate_limit_minute',
        retryAfter: 60000 - (now - Math.max(...userData.messages.filter(t => t > oneMinuteAgo))),
        message: '⏰ Muitas mensagens em pouco tempo. Aguarde um momento antes de enviar outra mensagem.'
      };
    }

    if (messagesLastHour >= limits.perHour) {
      this.applyPenalty(userData, 'rate_limit_hour');
      return {
        allowed: false,
        reason: 'rate_limit_hour',
        retryAfter: 3600000 - (now - userData.messages[0]),
        message: '⏰ Limite de mensagens por hora atingido. Tente novamente mais tarde.'
      };
    }

    // Special handling for commands (slightly more restrictive)
    if (isCommand) {
      const commandsLastMinute = userData.messages.filter(timestamp => 
        timestamp > oneMinuteAgo && userData.commandTimestamps?.includes(timestamp)
      ).length;
      
      if (commandsLastMinute >= 5 && !isAdmin) {
        return {
          allowed: false,
          reason: 'command_rate_limit',
          retryAfter: 60000,
          message: '⏰ Muitos comandos em pouco tempo. Aguarde um momento.'
        };
      }
    }

    // Record the message
    userData.messages.push(now);
    if (isCommand) {
      if (!userData.commandTimestamps) userData.commandTimestamps = [];
      userData.commandTimestamps.push(now);
      // Keep only recent command timestamps
      userData.commandTimestamps = userData.commandTimestamps.filter(t => t > oneHourAgo);
    }

    return {
      allowed: true,
      remaining: {
        perMinute: effectivePerMinute - messagesLastMinute - 1,
        perHour: limits.perHour - messagesLastHour - 1
      }
    };
  }

  /**
   * Apply penalty to user
   */
  applyPenalty(userData, reason) {
    const now = Date.now();
    userData.penalties++;
    userData.lastPenalty = now;

    // Progressive penalties
    if (userData.penalties >= this.config.maxPenalties) {
      userData.banned = true;
      userData.banUntil = now + this.config.longBanDuration;
      console.log(`🚫 User banned for ${this.config.longBanDuration / 60000} minutes (${userData.penalties} penalties)`);
    } else if (userData.penalties >= 2) {
      userData.banned = true;
      userData.banUntil = now + this.config.penaltyDuration;
      console.log(`🚫 User temporarily banned for ${this.config.penaltyDuration / 60000} minutes`);
    }

    console.log(`⚠️ Rate limit penalty applied: ${reason} (total: ${userData.penalties})`);
  }

  /**
   * Get user rate limit status
   */
  getUserStatus(chatId) {
    const userData = this.userLimits.get(chatId);
    if (!userData) {
      return { exists: false };
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    return {
      exists: true,
      messagesLastMinute: userData.messages.filter(t => t > oneMinuteAgo).length,
      messagesLastHour: userData.messages.filter(t => t > oneHourAgo).length,
      totalMessages: userData.messages.length,
      penalties: userData.penalties,
      banned: userData.banned,
      banUntil: userData.banUntil,
      isAdmin: this.adminNumbers.has(chatId)
    };
  }

  /**
   * Reset user limits (admin function)
   */
  resetUser(chatId) {
    const userData = this.userLimits.get(chatId);
    if (userData) {
      userData.messages = [];
      userData.penalties = 0;
      userData.banned = false;
      userData.banUntil = 0;
      userData.commandTimestamps = [];
      console.log(`🔄 Rate limits reset for user ${chatId.substring(0, 10)}...`);
      return true;
    }
    return false;
  }

  /**
   * Get rate limiting statistics
   */
  getStats() {
    const now = Date.now();
    let totalUsers = 0;
    let activeUsers = 0;
    let bannedUsers = 0;
    let totalMessages = 0;
    let penalizedUsers = 0;

    for (const [chatId, userData] of this.userLimits.entries()) {
      totalUsers++;
      
      if (userData.messages.some(t => t > now - 60 * 60 * 1000)) {
        activeUsers++;
      }
      
      if (userData.banned && now < userData.banUntil) {
        bannedUsers++;
      }
      
      if (userData.penalties > 0) {
        penalizedUsers++;
      }
      
      totalMessages += userData.messages.length;
    }

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      penalizedUsers,
      totalMessages,
      config: this.config,
      adminCount: this.adminNumbers.size
    };
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup old user data
   */
  cleanup() {
    const now = Date.now();
    const cutoff = now - this.config.userDataTTL;
    let cleaned = 0;

    for (const [chatId, userData] of this.userLimits.entries()) {
      // Remove users with no recent activity and no penalties
      const hasRecentActivity = userData.messages.some(t => t > cutoff);
      const hasPenalties = userData.penalties > 0 || userData.banned;
      
      if (!hasRecentActivity && !hasPenalties) {
        this.userLimits.delete(chatId);
        cleaned++;
      } else {
        // Clean old messages from active users
        const oldCount = userData.messages.length;
        userData.messages = userData.messages.filter(t => t > cutoff);
        
        if (userData.commandTimestamps) {
          userData.commandTimestamps = userData.commandTimestamps.filter(t => t > cutoff);
        }
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Rate limiter cleanup: removed ${cleaned} inactive users`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Rate limiter configuration updated');
  }

  /**
   * Shutdown rate limiter
   */
  async shutdown() {
    try {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
      this.userLimits.clear();
      console.log('✅ Rate limiter shutdown completed');
    } catch (error) {
      console.error('❌ Error during rate limiter shutdown:', error.message);
    }
  }

  /**
   * Get top users by message count
   */
  getTopUsers(limit = 10) {
    const users = Array.from(this.userLimits.entries())
      .map(([chatId, userData]) => ({
        chatId: chatId.substring(0, 10) + '...', // Partial ID for privacy
        messageCount: userData.messages.length,
        penalties: userData.penalties,
        banned: userData.banned,
        isAdmin: this.adminNumbers.has(chatId)
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, limit);

    return users;
  }
}

module.exports = RateLimiter;
