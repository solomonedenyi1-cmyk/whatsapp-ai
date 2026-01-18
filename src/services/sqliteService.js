/**
 * SQLite Service
 * 
 * High-performance SQLite implementation for conversation storage
 * Provides better performance than JSON for large datasets
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class SQLiteService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/conversations.db');
    this.db = null;
    this.isInitialized = false;
    
    // Performance settings
    this.batchSize = 100;
    this.cacheSize = 10000; // SQLite cache size in pages
    this.journalMode = 'WAL'; // Write-Ahead Logging for better performance
    
    // Prepared statements cache
    this.statements = {};
    
    this.initializeDatabase();
  }

  /**
   * Initialize SQLite database
   */
  async initializeDatabase() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Open database connection
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ SQLite connection error:', err);
          return;
        }
        console.log('🗄️ SQLite database connected');
      });
      
      // Configure performance settings
      await this.configurePerformance();
      
      // Create tables
      await this.createTables();
      
      // Prepare statements
      await this.prepareStatements();
      
      this.isInitialized = true;
      console.log('✅ SQLite service initialized');
      
    } catch (error) {
      console.error('❌ SQLite initialization error:', error);
      throw error;
    }
  }

  /**
   * Configure SQLite for optimal performance
   */
  async configurePerformance() {
    const settings = [
      `PRAGMA cache_size = ${this.cacheSize}`,
      `PRAGMA journal_mode = ${this.journalMode}`,
      'PRAGMA synchronous = NORMAL',
      'PRAGMA temp_store = MEMORY',
      'PRAGMA mmap_size = 268435456', // 256MB memory mapping
      'PRAGMA optimize'
    ];
    
    for (const setting of settings) {
      await this.runQuery(setting);
    }
    
    console.log('⚡ SQLite performance optimizations applied');
  }

  /**
   * Create database tables
   */
  async createTables() {
    const tables = [
      // Conversations table
      `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        message_length INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_id (chat_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_chat_timestamp (chat_id, timestamp)
      )`,
      
      // Analytics table
      `CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_analytics_chat (chat_id),
        INDEX idx_analytics_type (event_type),
        INDEX idx_analytics_timestamp (timestamp)
      )`,
      
      // Performance metrics table
      `CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_type TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metadata TEXT,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_metrics_type (metric_type),
        INDEX idx_metrics_timestamp (timestamp)
      )`,
      
      // Error logs table
      `CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        component TEXT NOT NULL,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        context TEXT,
        severity TEXT DEFAULT 'medium',
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_errors_component (component),
        INDEX idx_errors_type (error_type),
        INDEX idx_errors_timestamp (timestamp)
      )`
    ];
    
    for (const table of tables) {
      await this.runQuery(table);
    }
    
    console.log('📋 SQLite tables created/verified');
  }

  /**
   * Prepare frequently used statements
   */
  async prepareStatements() {
    this.statements = {
      insertConversation: this.db.prepare(`
        INSERT INTO conversations (chat_id, role, content, timestamp, message_length)
        VALUES (?, ?, ?, ?, ?)
      `),
      
      getConversations: this.db.prepare(`
        SELECT * FROM conversations 
        WHERE chat_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `),
      
      insertAnalytics: this.db.prepare(`
        INSERT INTO analytics (chat_id, event_type, event_data, timestamp)
        VALUES (?, ?, ?, ?)
      `),
      
      insertMetric: this.db.prepare(`
        INSERT INTO performance_metrics (metric_type, metric_value, metadata, timestamp)
        VALUES (?, ?, ?, ?)
      `),
      
      insertError: this.db.prepare(`
        INSERT INTO error_logs (component, error_type, error_message, error_stack, context, severity, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `),
      
      deleteOldConversations: this.db.prepare(`
        DELETE FROM conversations 
        WHERE timestamp < ?
      `),
      
      getConversationStats: this.db.prepare(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT chat_id) as unique_chats,
          AVG(message_length) as avg_message_length,
          MAX(timestamp) as last_message
        FROM conversations
      `)
    };
    
    console.log('📝 SQLite prepared statements ready');
  }

  /**
   * Add message to conversation
   */
  async addMessage(chatId, role, content) {
    if (!this.isInitialized) {
      throw new Error('SQLite service not initialized');
    }
    
    const timestamp = Date.now();
    const messageLength = content.length;
    
    return new Promise((resolve, reject) => {
      this.statements.insertConversation.run(
        [chatId, role, content, timestamp, messageLength],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Get conversation messages
   */
  async getMessages(chatId, limit = 50) {
    if (!this.isInitialized) {
      throw new Error('SQLite service not initialized');
    }
    
    return new Promise((resolve, reject) => {
      this.statements.getConversations.all([chatId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Reverse to get chronological order
          resolve(rows.reverse());
        }
      });
    });
  }

  /**
   * Clear conversation for chat
   */
  async clearConversation(chatId) {
    const query = 'DELETE FROM conversations WHERE chat_id = ?';
    return this.runQuery(query, [chatId]);
  }

  /**
   * Add analytics event
   */
  async addAnalyticsEvent(chatId, eventType, eventData = null) {
    const timestamp = Date.now();
    const dataString = eventData ? JSON.stringify(eventData) : null;
    
    return new Promise((resolve, reject) => {
      this.statements.insertAnalytics.run(
        [chatId, eventType, dataString, timestamp],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Add performance metric
   */
  async addPerformanceMetric(metricType, value, metadata = null) {
    const timestamp = Date.now();
    const metadataString = metadata ? JSON.stringify(metadata) : null;
    
    return new Promise((resolve, reject) => {
      this.statements.insertMetric.run(
        [metricType, value, metadataString, timestamp],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Add error log
   */
  async addErrorLog(component, errorType, message, stack = null, context = null, severity = 'medium') {
    const timestamp = Date.now();
    const contextString = context ? JSON.stringify(context) : null;
    
    return new Promise((resolve, reject) => {
      this.statements.insertError.run(
        [component, errorType, message, stack, contextString, severity, timestamp],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats() {
    return new Promise((resolve, reject) => {
      this.statements.getConversationStats.get((err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get analytics data
   */
  async getAnalytics(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const query = `
      SELECT 
        event_type,
        COUNT(*) as count,
        chat_id
      FROM analytics 
      WHERE timestamp > ?
      GROUP BY event_type, chat_id
      ORDER BY count DESC
    `;
    
    return this.allQuery(query, [cutoff]);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(metricType = null, hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    let query = `
      SELECT 
        metric_type,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as count
      FROM performance_metrics 
      WHERE timestamp > ?
    `;
    
    const params = [cutoff];
    
    if (metricType) {
      query += ' AND metric_type = ?';
      params.push(metricType);
    }
    
    query += ' GROUP BY metric_type ORDER BY count DESC';
    
    return this.allQuery(query, params);
  }

  /**
   * Get error statistics
   */
  async getErrorStats(hours = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const query = `
      SELECT 
        component,
        error_type,
        severity,
        COUNT(*) as count,
        MAX(timestamp) as last_occurrence
      FROM error_logs 
      WHERE timestamp > ?
      GROUP BY component, error_type, severity
      ORDER BY count DESC
    `;
    
    return this.allQuery(query, [cutoff]);
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(retentionDays = 30) {
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    const results = {
      conversations: 0,
      analytics: 0,
      metrics: 0,
      errors: 0
    };
    
    // Clean conversations
    const convResult = await this.runQuery('DELETE FROM conversations WHERE timestamp < ?', [cutoff]);
    results.conversations = convResult.changes || 0;
    
    // Clean analytics
    const analyticsResult = await this.runQuery('DELETE FROM analytics WHERE timestamp < ?', [cutoff]);
    results.analytics = analyticsResult.changes || 0;
    
    // Clean metrics (keep longer retention)
    const metricsResult = await this.runQuery('DELETE FROM performance_metrics WHERE timestamp < ?', [cutoff / 2]);
    results.metrics = metricsResult.changes || 0;
    
    // Clean errors (keep longer retention)
    const errorsResult = await this.runQuery('DELETE FROM error_logs WHERE timestamp < ?', [cutoff / 2]);
    results.errors = errorsResult.changes || 0;
    
    // Vacuum database to reclaim space
    await this.runQuery('VACUUM');
    
    console.log('🧹 SQLite cleanup completed:', results);
    return results;
  }

  /**
   * Get database size and statistics
   */
  async getDatabaseStats() {
    const stats = {};
    
    // Get table sizes
    const tables = ['conversations', 'analytics', 'performance_metrics', 'error_logs'];
    
    for (const table of tables) {
      const result = await this.getQuery(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = result.count;
    }
    
    // Get database file size
    try {
      const dbStats = await fs.stat(this.dbPath);
      stats.fileSize = dbStats.size;
      stats.fileSizeMB = Math.round(stats.fileSize / 1024 / 1024 * 100) / 100;
    } catch (error) {
      stats.fileSize = 0;
      stats.fileSizeMB = 0;
    }
    
    return stats;
  }

  /**
   * Optimize database performance
   */
  async optimize() {
    const commands = [
      'PRAGMA optimize',
      'PRAGMA wal_checkpoint(TRUNCATE)',
      'ANALYZE'
    ];
    
    for (const command of commands) {
      await this.runQuery(command);
    }
    
    console.log('⚡ SQLite database optimized');
  }

  /**
   * Run a query and return result
   */
  runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    });
  }

  /**
   * Get single row
   */
  getQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get all rows
   */
  allQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      // Finalize prepared statements
      for (const statement of Object.values(this.statements)) {
        if (statement && statement.finalize) {
          statement.finalize();
        }
      }
      
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('🗄️ SQLite database connection closed');
            resolve();
          }
        });
      });
    }
  }

  /**
   * Backup database
   */
  async backup(backupPath) {
    try {
      const backupDb = new sqlite3.Database(backupPath);
      
      return new Promise((resolve, reject) => {
        this.db.backup(backupDb, (err) => {
          backupDb.close();
          if (err) {
            reject(err);
          } else {
            console.log(`💾 Database backed up to: ${backupPath}`);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('❌ Database backup error:', error);
      throw error;
    }
  }
}

module.exports = SQLiteService;
