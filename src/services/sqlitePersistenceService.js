const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');

class SqlitePersistenceService {
    constructor({ dataDir } = {}) {
        this.dataDir = dataDir || path.join(__dirname, '../../data');
        this.dbPath = path.join(this.dataDir, 'whatsapp-ai.sqlite');

        this.conversationsCache = new Map();
        this.analyticsCache = null;
        this.userPreferencesCache = new Map();

        this.readyPromise = this.initializeStorage();
    }

    async ensureReady() {
        await this.readyPromise;
    }

    async initializeStorage() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });

            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');

            this.db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
          chat_id TEXT PRIMARY KEY,
          context_json TEXT NOT NULL,
          last_updated TEXT,
          message_count INTEGER,
          participant_count INTEGER,
          last_activity TEXT,
          mistral_conversation_id TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_conversations_last_updated
          ON conversations(last_updated);

        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id TEXT PRIMARY KEY,
          preferences_json TEXT NOT NULL,
          last_updated TEXT
        );

        CREATE TABLE IF NOT EXISTS analytics_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          state_json TEXT NOT NULL
        );
      `);

            const defaultAnalytics = {
                totalMessages: 0,
                totalConversations: 0,
                dailyStats: {},
                userStats: {},
                popularCommands: {},
                responseTimeStats: [],
                errorStats: {},
            };

            const existingAnalytics = this.db
                .prepare('SELECT state_json FROM analytics_state WHERE id = 1')
                .get();

            if (!existingAnalytics) {
                this.db
                    .prepare('INSERT INTO analytics_state (id, state_json) VALUES (1, ?)')
                    .run(JSON.stringify(defaultAnalytics));
            }

            await this.loadAllData();

            console.log('✅ Persistence service initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing persistence service:', error.message);
        }
    }

    async loadAllData() {
        try {
            const rows = this.db
                .prepare('SELECT * FROM conversations')
                .all();

            this.conversationsCache.clear();
            for (const row of rows) {
                const context = this.safeParseJsonArray(row.context_json);

                const conversationData = {
                    context,
                    lastUpdated: row.last_updated || null,
                    messageCount:
                        Number.isFinite(row.message_count) && row.message_count !== null
                            ? row.message_count
                            : context.length,
                    participantCount: row.participant_count,
                    lastActivity: row.last_activity,
                    mistralConversationId: row.mistral_conversation_id,
                };

                this.conversationsCache.set(row.chat_id, conversationData);
            }

            const analyticsRow = this.db
                .prepare('SELECT state_json FROM analytics_state WHERE id = 1')
                .get();

            this.analyticsCache = analyticsRow
                ? this.safeParseJsonObject(analyticsRow.state_json)
                : null;

            const preferenceRows = this.db
                .prepare('SELECT user_id, preferences_json FROM user_preferences')
                .all();

            this.userPreferencesCache.clear();
            for (const row of preferenceRows) {
                this.userPreferencesCache.set(
                    row.user_id,
                    this.safeParseJsonObject(row.preferences_json)
                );
            }
        } catch (error) {
            console.error('❌ Error loading data:', error.message);
        }
    }

    safeParseJsonArray(value) {
        try {
            const parsed = JSON.parse(value || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    safeParseJsonObject(value) {
        try {
            const parsed = JSON.parse(value || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    async saveConversation(chatId, context, metadata = {}) {
        try {
            await this.ensureReady();

            const previous = this.conversationsCache.get(chatId);

            const conversationData = {
                ...(previous && typeof previous === 'object' ? previous : {}),
                context: context,
                lastUpdated: new Date().toISOString(),
                messageCount: Array.isArray(context) ? context.length : 0,
                ...metadata,
            };

            this.conversationsCache.set(chatId, conversationData);

            this.db
                .prepare(
                    `
          INSERT INTO conversations (
            chat_id,
            context_json,
            last_updated,
            message_count,
            participant_count,
            last_activity,
            mistral_conversation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(chat_id) DO UPDATE SET
            context_json = excluded.context_json,
            last_updated = excluded.last_updated,
            message_count = excluded.message_count,
            participant_count = excluded.participant_count,
            last_activity = excluded.last_activity,
            mistral_conversation_id = excluded.mistral_conversation_id
        `
                )
                .run(
                    chatId,
                    JSON.stringify(Array.isArray(context) ? context : []),
                    conversationData.lastUpdated,
                    conversationData.messageCount,
                    conversationData.participantCount ?? null,
                    conversationData.lastActivity ?? null,
                    conversationData.mistralConversationId ?? null
                );
        } catch (error) {
            console.error('❌ Error saving conversation:', error.message);
        }
    }

    async loadConversation(chatId) {
        try {
            await this.ensureReady();

            const cached = this.conversationsCache.get(chatId);
            if (cached) {
                return cached.context;
            }

            const row = this.db
                .prepare('SELECT * FROM conversations WHERE chat_id = ?')
                .get(chatId);

            if (!row) {
                return [];
            }

            const context = this.safeParseJsonArray(row.context_json);
            const conversationData = {
                context,
                lastUpdated: row.last_updated || null,
                messageCount:
                    Number.isFinite(row.message_count) && row.message_count !== null
                        ? row.message_count
                        : context.length,
                participantCount: row.participant_count,
                lastActivity: row.last_activity,
                mistralConversationId: row.mistral_conversation_id,
            };

            this.conversationsCache.set(chatId, conversationData);
            return context;
        } catch (error) {
            console.error('❌ Error loading conversation:', error.message);
            return [];
        }
    }

    async loadMistralConversationId(chatId) {
        try {
            await this.ensureReady();

            const cached = this.conversationsCache.get(chatId);
            const candidate = cached?.mistralConversationId;
            if (typeof candidate === 'string' && candidate.trim().length > 0) {
                return candidate;
            }

            const row = this.db
                .prepare('SELECT mistral_conversation_id FROM conversations WHERE chat_id = ?')
                .get(chatId);

            const value = row?.mistral_conversation_id;
            return typeof value === 'string' && value.trim().length > 0 ? value : null;
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
            const context = Array.isArray(previous?.context) ? previous.context : [];

            const conversationData = {
                ...(previous && typeof previous === 'object' ? previous : {}),
                context,
                lastUpdated: new Date().toISOString(),
                messageCount: context.length,
                mistralConversationId: safeConversationId,
            };

            this.conversationsCache.set(chatId, conversationData);

            this.db
                .prepare(
                    `
          INSERT INTO conversations (
            chat_id,
            context_json,
            last_updated,
            message_count,
            mistral_conversation_id
          ) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(chat_id) DO UPDATE SET
            last_updated = excluded.last_updated,
            message_count = excluded.message_count,
            mistral_conversation_id = excluded.mistral_conversation_id
        `
                )
                .run(
                    chatId,
                    JSON.stringify(context),
                    conversationData.lastUpdated,
                    conversationData.messageCount,
                    safeConversationId
                );
        } catch (error) {
            console.error('❌ Error saving mistral conversation id:', error.message);
        }
    }

    async clearMistralConversationId(chatId) {
        try {
            await this.ensureReady();

            const previous = this.conversationsCache.get(chatId);
            if (previous && typeof previous === 'object') {
                const next = { ...previous };
                delete next.mistralConversationId;
                next.lastUpdated = new Date().toISOString();
                this.conversationsCache.set(chatId, next);
            }

            this.db
                .prepare(
                    'UPDATE conversations SET mistral_conversation_id = NULL, last_updated = ? WHERE chat_id = ?'
                )
                .run(new Date().toISOString(), chatId);
        } catch (error) {
            console.error('❌ Error clearing mistral conversation id:', error.message);
        }
    }

    async deleteConversation(chatId) {
        try {
            await this.ensureReady();
            this.conversationsCache.delete(chatId);
            this.db.prepare('DELETE FROM conversations WHERE chat_id = ?').run(chatId);
        } catch (error) {
            console.error('❌ Error deleting conversation:', error.message);
        }
    }

    async saveUserPreferences(userId, preferences) {
        try {
            await this.ensureReady();

            const payload = {
                ...(preferences && typeof preferences === 'object' ? preferences : {}),
                lastUpdated: new Date().toISOString(),
            };

            this.userPreferencesCache.set(userId, payload);

            this.db
                .prepare(
                    `
          INSERT INTO user_preferences (user_id, preferences_json, last_updated)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            preferences_json = excluded.preferences_json,
            last_updated = excluded.last_updated
        `
                )
                .run(userId, JSON.stringify(payload), payload.lastUpdated);
        } catch (error) {
            console.error('❌ Error saving user preferences:', error.message);
        }
    }

    async loadUserPreferences(userId) {
        try {
            await this.ensureReady();

            const cached = this.userPreferencesCache.get(userId);
            if (cached) {
                return cached;
            }

            const row = this.db
                .prepare('SELECT preferences_json FROM user_preferences WHERE user_id = ?')
                .get(userId);

            const value = row ? this.safeParseJsonObject(row.preferences_json) : {};
            this.userPreferencesCache.set(userId, value);
            return value;
        } catch (error) {
            console.error('❌ Error loading user preferences:', error.message);
            return {};
        }
    }

    async recordAnalytics(event, data = {}) {
        try {
            await this.ensureReady();
            if (!this.analyticsCache) return;

            const today = new Date().toISOString().split('T')[0];
            const timestamp = new Date().toISOString();

            if (!this.analyticsCache.dailyStats[today]) {
                this.analyticsCache.dailyStats[today] = {
                    messages: 0,
                    conversations: 0,
                    commands: 0,
                    errors: 0,
                };
            }

            switch (event) {
                case 'message':
                    this.analyticsCache.totalMessages++;
                    this.analyticsCache.dailyStats[today].messages++;

                    if (data.userId) {
                        if (!this.analyticsCache.userStats[data.userId]) {
                            this.analyticsCache.userStats[data.userId] = {
                                messageCount: 0,
                                firstSeen: timestamp,
                                lastSeen: timestamp,
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
                            userId: data.userId,
                        });

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

            if (this.analyticsCache.totalMessages % 10 === 0) {
                await this.saveAnalyticsToDb();
            }
        } catch (error) {
            console.error('❌ Error recording analytics:', error.message);
        }
    }

    async saveAnalyticsToDb() {
        try {
            await this.ensureReady();
            const snapshot = this.analyticsCache;
            if (!snapshot) {
                return;
            }

            this.db
                .prepare('UPDATE analytics_state SET state_json = ? WHERE id = 1')
                .run(JSON.stringify(snapshot));
        } catch (error) {
            console.error('❌ Error saving analytics:', error.message);
        }
    }

    async getAnalyticsReport(days = 7) {
        try {
            await this.ensureReady();
            if (!this.analyticsCache) return {};

            const today = new Date();
            const report = {
                summary: {
                    totalMessages: this.analyticsCache.totalMessages,
                    totalConversations: this.analyticsCache.totalConversations,
                    totalUsers: Object.keys(this.analyticsCache.userStats).length,
                },
                dailyStats: {},
                popularCommands: this.analyticsCache.popularCommands,
                averageResponseTime: 0,
                errorStats: this.analyticsCache.errorStats,
            };

            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                if (this.analyticsCache.dailyStats[dateStr]) {
                    report.dailyStats[dateStr] = this.analyticsCache.dailyStats[dateStr];
                }
            }

            if (this.analyticsCache.responseTimeStats.length > 0) {
                const totalTime = this.analyticsCache.responseTimeStats.reduce(
                    (sum, stat) => sum + stat.responseTime,
                    0
                );
                report.averageResponseTime =
                    totalTime / this.analyticsCache.responseTimeStats.length;
            }

            return report;
        } catch (error) {
            console.error('❌ Error generating analytics report:', error.message);
            return {};
        }
    }

    async getStorageStats() {
        try {
            await this.ensureReady();

            const stats = {
                conversations: this.conversationsCache.size,
                users: this.userPreferencesCache.size,
                totalMessages: this.analyticsCache ? this.analyticsCache.totalMessages : 0,
                dataDirectory: this.dataDir,
            };

            try {
                const dbStats = await fs.stat(this.dbPath);
                stats.fileSizes = {
                    database: dbStats.size,
                };
            } catch {
                // non-critical
            }

            return stats;
        } catch (error) {
            console.error('❌ Error getting storage stats:', error.message);
            return {};
        }
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

    async cleanupOldData(daysToKeep = 30) {
        try {
            await this.ensureReady();

            const safeStat = async () => {
                try {
                    const s = await fs.stat(this.dbPath);
                    return s.size;
                } catch {
                    return 0;
                }
            };

            const sizeBefore = await safeStat();

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffStr = cutoffDate.toISOString();

            const deleteResult = this.db
                .prepare('DELETE FROM conversations WHERE last_updated < ?')
                .run(cutoffStr);

            const cleanedCount = deleteResult.changes || 0;

            for (const [chatId, data] of this.conversationsCache.entries()) {
                if (data?.lastUpdated && data.lastUpdated < cutoffStr) {
                    this.conversationsCache.delete(chatId);
                }
            }

            let cleanedAnalyticsDays = 0;
            if (this.analyticsCache && this.analyticsCache.dailyStats) {
                const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
                Object.keys(this.analyticsCache.dailyStats).forEach((date) => {
                    if (date < cutoffDateStr) {
                        delete this.analyticsCache.dailyStats[date];
                        cleanedAnalyticsDays++;
                    }
                });
            }

            await this.saveAnalyticsToDb();

            const sizeAfter = await safeStat();
            const spaceSavedBytes = Math.max(0, sizeBefore - sizeAfter);

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

module.exports = SqlitePersistenceService;
