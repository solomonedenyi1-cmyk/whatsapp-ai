/**
 * Persistence Service for Advanced Context Storage
 * 
 * Handles persistent storage of conversation history, user preferences,
 * and analytics data using JSON file storage (can be extended to databases)
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');

class PersistenceService {
  constructor({ dataDir } = {}) {
    this.dataDir = dataDir || path.join(__dirname, '../../data');
    this.conversationsFile = path.join(this.dataDir, 'conversations.json');
    this.analyticsFile = path.join(this.dataDir, 'analytics.json');
    this.userPreferencesFile = path.join(this.dataDir, 'user_preferences.json');

    // In-memory cache for performance
    this.conversationsCache = new Map();
    this.analyticsCache = null;
    this.userPreferencesCache = new Map();

    this.writeQueues = new Map();
    this.readyPromise = this.initializeStorage();
  }

  async ensureReady() {
    await this.readyPromise;
  }

  enqueueWrite(filePath, writeFn) {
    const previous = this.writeQueues.get(filePath) || Promise.resolve();
    const next = previous
      .catch(() => { })
      .then(async () => {
        await writeFn();
      });

    this.writeQueues.set(filePath, next);
    return next;
  }

  async writeJsonAtomic(filePath, data) {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const tmpPath = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);

    const payload = JSON.stringify(data, null, 2);
    await fs.writeFile(tmpPath, payload);
    await fs.rename(tmpPath, filePath);
  }

  async getFileSizes() {
    const safeStat = async (filePath) => {
      try {
        const s = await fs.stat(filePath);
        return s.size;
      } catch {
        return 0;
      }
    };

    const conversations = await safeStat(this.conversationsFile);
    const analytics = await safeStat(this.analyticsFile);
    const preferences = await safeStat(this.userPreferencesFile);

    return {
      conversations,
      analytics,
      preferences,
      total: conversations + analytics + preferences,
    };
  }

  formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const rounded = unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded}${units[unitIndex]}`;
  }

  /**
   * Initialize storage directories and files
   */
  async initializeStorage() {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });

      // Initialize files if they don't exist
      await this.ensureFileExists(this.conversationsFile, {});
      await this.ensureFileExists(this.analyticsFile, {
        totalMessages: 0,
        totalConversations: 0,
        dailyStats: {},
        userStats: {},
        popularCommands: {},
        responseTimeStats: [],
        errorStats: {}
      });
      await this.ensureFileExists(this.userPreferencesFile, {});

      // Load data into cache
      await this.loadAllData();

      console.log('✅ Persistence service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing persistence service:', error.message);
    }
  }

  /**
   * Ensure a file exists with default content
   */
  async ensureFileExists(filePath, defaultContent) {
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, create it
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
    }
  }

  /**
   * Load all data into memory cache
   */
  async loadAllData() {
    try {
      // Load conversations
      const conversationsData = await fs.readFile(this.conversationsFile, 'utf8');
      const conversations = JSON.parse(conversationsData);
      this.conversationsCache.clear();
      Object.entries(conversations).forEach(([chatId, data]) => {
        this.conversationsCache.set(chatId, data);
      });

      // Load analytics
      const analyticsData = await fs.readFile(this.analyticsFile, 'utf8');
      this.analyticsCache = JSON.parse(analyticsData);

      // Load user preferences
      const preferencesData = await fs.readFile(this.userPreferencesFile, 'utf8');
      const preferences = JSON.parse(preferencesData);
      this.userPreferencesCache.clear();
      Object.entries(preferences).forEach(([userId, prefs]) => {
        this.userPreferencesCache.set(userId, prefs);
      });

    } catch (error) {
      console.error('❌ Error loading data:', error.message);
    }
  }

  /**
   * Save conversation context to persistent storage
   */
  async saveConversation(chatId, context, metadata = {}) {
    try {
      await this.ensureReady();

      const previous = this.conversationsCache.get(chatId);

      const conversationData = {
        ...(previous && typeof previous === 'object' ? previous : {}),
        context: context,
        lastUpdated: new Date().toISOString(),
        messageCount: context.length,
        ...metadata
      };

      this.conversationsCache.set(chatId, conversationData);
      await this.saveConversationsToFile();

    } catch (error) {
      console.error('❌ Error saving conversation:', error.message);
    }
  }

  /**
   * Load conversation context from persistent storage
   */
  async loadConversation(chatId) {
    try {
      await this.ensureReady();
      const data = this.conversationsCache.get(chatId);
      return data ? data.context : [];
    } catch (error) {
      console.error('❌ Error loading conversation:', error.message);
      return [];
    }
  }

  async loadMistralConversationId(chatId) {
    try {
      await this.ensureReady();
      const data = this.conversationsCache.get(chatId);
      const candidate = data?.mistralConversationId;
      return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
    } catch (error) {
      console.error('❌ Error loading mistral conversation id:', error.message);
      return null;
    }
  }

  async saveMistralConversationId(chatId, conversationId) {
    try {
      await this.ensureReady();

      const safeConversationId = typeof conversationId === 'string' ? conversationId.trim() : '';
      if (!safeConversationId) {
        throw new Error('Missing conversationId');
      }

      const previous = this.conversationsCache.get(chatId);
      const conversationData = {
        ...(previous && typeof previous === 'object' ? previous : {}),
        context: Array.isArray(previous?.context) ? previous.context : [],
        lastUpdated: new Date().toISOString(),
        messageCount: Array.isArray(previous?.context) ? previous.context.length : 0,
        mistralConversationId: safeConversationId,
      };

      this.conversationsCache.set(chatId, conversationData);
      await this.saveConversationsToFile();
    } catch (error) {
      console.error('❌ Error saving mistral conversation id:', error.message);
    }
  }

  async clearMistralConversationId(chatId) {
    try {
      await this.ensureReady();
      const previous = this.conversationsCache.get(chatId);
      if (!previous || typeof previous !== 'object') {
        return;
      }

      const conversationData = { ...previous };
      delete conversationData.mistralConversationId;
      conversationData.lastUpdated = new Date().toISOString();
      this.conversationsCache.set(chatId, conversationData);
      await this.saveConversationsToFile();
    } catch (error) {
      console.error('❌ Error clearing mistral conversation id:', error.message);
    }
  }

  /**
   * Delete conversation from persistent storage
   */
  async deleteConversation(chatId) {
    try {
      await this.ensureReady();
      this.conversationsCache.delete(chatId);
      await this.saveConversationsToFile();
    } catch (error) {
      console.error('❌ Error deleting conversation:', error.message);
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(userId, preferences) {
    try {
      await this.ensureReady();
      this.userPreferencesCache.set(userId, {
        ...preferences,
        lastUpdated: new Date().toISOString()
      });
      await this.saveUserPreferencesToFile();
    } catch (error) {
      console.error('❌ Error saving user preferences:', error.message);
    }
  }

  /**
   * Load user preferences
   */
  async loadUserPreferences(userId) {
    try {
      await this.ensureReady();
      return this.userPreferencesCache.get(userId) || {};
    } catch (error) {
      console.error('❌ Error loading user preferences:', error.message);
      return {};
    }
  }

  /**
   * Record analytics event
   */
  async recordAnalytics(event, data = {}) {
    try {
      await this.ensureReady();
      if (!this.analyticsCache) return;

      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();

      // Update daily stats
      if (!this.analyticsCache.dailyStats[today]) {
        this.analyticsCache.dailyStats[today] = {
          messages: 0,
          conversations: 0,
          commands: 0,
          errors: 0
        };
      }

      // Record different types of events
      switch (event) {
        case 'message':
          this.analyticsCache.totalMessages++;
          this.analyticsCache.dailyStats[today].messages++;

          // User stats
          if (data.userId) {
            if (!this.analyticsCache.userStats[data.userId]) {
              this.analyticsCache.userStats[data.userId] = {
                messageCount: 0,
                firstSeen: timestamp,
                lastSeen: timestamp
              };
            }
            this.analyticsCache.userStats[data.userId].messageCount++;
            this.analyticsCache.userStats[data.userId].lastSeen = timestamp;
          }
          break;

        case 'conversation_start':
          this.analyticsCache.totalConversations++;
          this.analyticsCache.dailyStats[today].conversations++;
          break;

        case 'command':
          this.analyticsCache.dailyStats[today].commands++;
          if (data.command) {
            this.analyticsCache.popularCommands[data.command] =
              (this.analyticsCache.popularCommands[data.command] || 0) + 1;
          }
          break;

        case 'response_time':
          if (data.responseTime) {
            this.analyticsCache.responseTimeStats.push({
              timestamp,
              responseTime: data.responseTime,
              userId: data.userId
            });

            // Keep only last 1000 response times
            if (this.analyticsCache.responseTimeStats.length > 1000) {
              this.analyticsCache.responseTimeStats =
                this.analyticsCache.responseTimeStats.slice(-1000);
            }
          }
          break;

        case 'error':
          this.analyticsCache.dailyStats[today].errors++;
          if (data.errorType) {
            this.analyticsCache.errorStats[data.errorType] =
              (this.analyticsCache.errorStats[data.errorType] || 0) + 1;
          }
          break;
      }

      // Save analytics periodically (every 10 events)
      if (this.analyticsCache.totalMessages % 10 === 0) {
        await this.saveAnalyticsToFile();
      }

    } catch (error) {
      console.error('❌ Error recording analytics:', error.message);
    }
  }

  /**
   * Get analytics report
   */
  async getAnalyticsReport(days = 7) {
    try {
      await this.ensureReady();
      if (!this.analyticsCache) return {};

      const today = new Date();
      const report = {
        summary: {
          totalMessages: this.analyticsCache.totalMessages,
          totalConversations: this.analyticsCache.totalConversations,
          totalUsers: Object.keys(this.analyticsCache.userStats).length
        },
        dailyStats: {},
        popularCommands: this.analyticsCache.popularCommands,
        averageResponseTime: 0,
        errorStats: this.analyticsCache.errorStats
      };

      // Get daily stats for the last N days
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        if (this.analyticsCache.dailyStats[dateStr]) {
          report.dailyStats[dateStr] = this.analyticsCache.dailyStats[dateStr];
        }
      }

      // Calculate average response time
      if (this.analyticsCache.responseTimeStats.length > 0) {
        const totalTime = this.analyticsCache.responseTimeStats
          .reduce((sum, stat) => sum + stat.responseTime, 0);
        report.averageResponseTime = totalTime / this.analyticsCache.responseTimeStats.length;
      }

      return report;

    } catch (error) {
      console.error('❌ Error generating analytics report:', error.message);
      return {};
    }
  }

  /**
   * Save conversations cache to file
   */
  async saveConversationsToFile() {
    try {
      await this.ensureReady();
      const data = Object.fromEntries(this.conversationsCache);
      await this.enqueueWrite(this.conversationsFile, async () => {
        await this.writeJsonAtomic(this.conversationsFile, data);
      });
    } catch (error) {
      console.error('❌ Error saving conversations to file:', error.message);
    }
  }

  /**
   * Save analytics cache to file
   */
  async saveAnalyticsToFile() {
    try {
      await this.ensureReady();
      const snapshot = this.analyticsCache;
      await this.enqueueWrite(this.analyticsFile, async () => {
        await this.writeJsonAtomic(this.analyticsFile, snapshot);
      });
    } catch (error) {
      console.error('❌ Error saving analytics to file:', error.message);
    }
  }

  /**
   * Save user preferences cache to file
   */
  async saveUserPreferencesToFile() {
    try {
      await this.ensureReady();
      const data = Object.fromEntries(this.userPreferencesCache);
      await this.enqueueWrite(this.userPreferencesFile, async () => {
        await this.writeJsonAtomic(this.userPreferencesFile, data);
      });
    } catch (error) {
      console.error('❌ Error saving user preferences to file:', error.message);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      await this.ensureReady();
      const stats = {
        conversations: this.conversationsCache.size,
        users: this.userPreferencesCache.size,
        totalMessages: this.analyticsCache ? this.analyticsCache.totalMessages : 0,
        dataDirectory: this.dataDir
      };

      // Get file sizes
      try {
        const conversationsStats = await fs.stat(this.conversationsFile);
        const analyticsStats = await fs.stat(this.analyticsFile);
        const preferencesStats = await fs.stat(this.userPreferencesFile);

        stats.fileSizes = {
          conversations: conversationsStats.size,
          analytics: analyticsStats.size,
          preferences: preferencesStats.size
        };
      } catch (error) {
        // File stats not critical
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting storage stats:', error.message);
      return {};
    }
  }

  /**
   * Cleanup old data (maintenance function)
   */
  async cleanupOldData(daysToKeep = 30) {
    try {
      await this.ensureReady();

      const sizesBefore = await this.getFileSizes();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffStr = cutoffDate.toISOString();

      let cleanedCount = 0;
      let cleanedAnalyticsDays = 0;

      // Clean old conversations
      for (const [chatId, data] of this.conversationsCache.entries()) {
        if (data.lastUpdated && data.lastUpdated < cutoffStr) {
          this.conversationsCache.delete(chatId);
          cleanedCount++;
        }
      }

      // Clean old daily stats
      if (this.analyticsCache && this.analyticsCache.dailyStats) {
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        Object.keys(this.analyticsCache.dailyStats).forEach(date => {
          if (date < cutoffDateStr) {
            delete this.analyticsCache.dailyStats[date];
            cleanedAnalyticsDays++;
          }
        });
      }

      // Save changes
      await this.saveConversationsToFile();
      await this.saveAnalyticsToFile();

      const sizesAfter = await this.getFileSizes();
      const spaceSavedBytes = Math.max(0, sizesBefore.total - sizesAfter.total);

      console.log(`🧹 Cleaned up ${cleanedCount} old conversations`);
      return {
        cleanedConversations: cleanedCount,
        cleanedAnalytics: cleanedAnalyticsDays,
        spaceSaved: this.formatBytes(spaceSavedBytes),
      };

    } catch (error) {
      console.error('❌ Error cleaning up old data:', error.message);
      return {
        cleanedConversations: 0,
        cleanedAnalytics: 0,
        spaceSaved: '0B',
      };
    }
  }
}

module.exports = PersistenceService;
