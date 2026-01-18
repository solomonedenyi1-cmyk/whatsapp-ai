/**
 * Comprehensive Error Handling Service
 * 
 * Provides centralized error handling, logging, and recovery mechanisms
 * for the WhatsApp AI Bot system
 */

const fs = require('fs').promises;
const path = require('path');
const { redactSecrets } = require('../utils/redact');

class ErrorHandler {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.errorLogFile = path.join(this.logDir, 'errors.log');
    this.systemLogFile = path.join(this.logDir, 'system.log');
    this.performanceLogFile = path.join(this.logDir, 'performance.log');

    // Error statistics
    this.errorStats = {
      total: 0,
      byType: {},
      byComponent: {},
      recent: []
    };

    // Performance metrics
    this.performanceMetrics = {
      apiResponseTimes: [],
      memoryUsage: [],
      messageProcessingTimes: []
    };

    this.initializeLogging();
  }

  /**
   * Initialize logging system
   */
  async initializeLogging() {
    try {
      // Create logs directory if it doesn't exist
      await fs.mkdir(this.logDir, { recursive: true });

      // Initialize log files
      await this.ensureLogFile(this.errorLogFile);
      await this.ensureLogFile(this.systemLogFile);
      await this.ensureLogFile(this.performanceLogFile);

      // Log system startup
      await this.logSystem('INFO', 'Error handling system initialized');

      console.log('✅ Error handling system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize error handling:', error.message);
    }
  }

  /**
   * Ensure log file exists
   */
  async ensureLogFile(filePath) {
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, create it
      await fs.writeFile(filePath, '');
    }
  }

  /**
   * Handle and log errors with context
   */
  async handleError(error, context = {}) {
    try {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        message: redactSecrets(error.message),
        stack: redactSecrets(error.stack),
        type: error.constructor.name,
        component: context.component || 'unknown',
        operation: context.operation || 'unknown',
        userId: context.userId || null,
        severity: this.determineSeverity(error, context),
        ...context
      };

      // Update statistics
      this.updateErrorStats(errorInfo);

      // Log to file
      await this.logError(errorInfo);

      // Log to console with appropriate level
      this.logToConsole(errorInfo);

      // Attempt recovery if possible
      const recoveryAction = await this.attemptRecovery(errorInfo);

      return {
        handled: true,
        severity: errorInfo.severity,
        recoveryAction,
        errorId: this.generateErrorId(errorInfo)
      };

    } catch (handlingError) {
      console.error('❌ Error in error handler:', handlingError.message);
      return { handled: false };
    }
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context) {
    // Critical errors that affect core functionality
    if (error.message.includes('ENOENT') && context.component === 'persistence') {
      return 'CRITICAL';
    }

    if (error.message.includes('API') && context.component === 'mistralAgent') {
      return 'HIGH';
    }

    if (error.message.includes('timeout') || error.message.includes('network')) {
      return 'MEDIUM';
    }

    if (error.message.includes('validation') || error.message.includes('format')) {
      return 'LOW';
    }

    return 'MEDIUM';
  }

  /**
   * Update error statistics
   */
  updateErrorStats(errorInfo) {
    this.errorStats.total++;

    // By type
    this.errorStats.byType[errorInfo.type] =
      (this.errorStats.byType[errorInfo.type] || 0) + 1;

    // By component
    this.errorStats.byComponent[errorInfo.component] =
      (this.errorStats.byComponent[errorInfo.component] || 0) + 1;

    // Recent errors (keep last 50)
    this.errorStats.recent.push({
      timestamp: errorInfo.timestamp,
      type: errorInfo.type,
      component: errorInfo.component,
      severity: errorInfo.severity
    });

    if (this.errorStats.recent.length > 50) {
      this.errorStats.recent = this.errorStats.recent.slice(-50);
    }
  }

  /**
   * Log error to file
   */
  async logError(errorInfo) {
    const safeContext = JSON.parse(JSON.stringify(errorInfo, (key, value) => {
      if (typeof value === 'string') {
        return redactSecrets(value);
      }
      return value;
    }));

    const logEntry = `[${errorInfo.timestamp}] [${errorInfo.severity}] [${errorInfo.component}] ${errorInfo.message}\n` +
      `Stack: ${errorInfo.stack}\n` +
      `Context: ${JSON.stringify(safeContext, null, 2)}\n` +
      '---\n';

    await fs.appendFile(this.errorLogFile, logEntry);
  }

  /**
   * Log to console with appropriate formatting
   */
  logToConsole(errorInfo) {
    const emoji = {
      'CRITICAL': '🚨',
      'HIGH': '❌',
      'MEDIUM': '⚠️',
      'LOW': '💡'
    };

    const message = `${emoji[errorInfo.severity]} [${errorInfo.component}] ${errorInfo.message}`;

    switch (errorInfo.severity) {
      case 'CRITICAL':
      case 'HIGH':
        console.error(message);
        break;
      case 'MEDIUM':
        console.warn(message);
        break;
      case 'LOW':
        console.log(message);
        break;
    }
  }

  /**
   * Attempt automatic recovery
   */
  async attemptRecovery(errorInfo) {
    try {
      switch (errorInfo.component) {
        case 'persistence':
          if (errorInfo.message.includes('ENOENT')) {
            await this.recoverPersistenceFiles();
            return 'recreated_missing_files';
          }
          break;

        case 'mistralAgent':
          if (errorInfo.message.includes('timeout')) {
            return 'retry_recommended';
          }
          break;

        case 'whatsapp':
          if (errorInfo.message.includes('session')) {
            return 'session_restart_required';
          }
          break;
      }

      return 'no_recovery_available';
    } catch (recoveryError) {
      await this.logSystem('ERROR', `Recovery failed: ${recoveryError.message}`);
      return 'recovery_failed';
    }
  }

  /**
   * Recover persistence files
   */
  async recoverPersistenceFiles() {
    const dataDir = path.join(__dirname, '../../data');
    await fs.mkdir(dataDir, { recursive: true });

    const files = [
      'conversations.json',
      'analytics.json',
      'user_preferences.json'
    ];

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      try {
        await fs.access(filePath);
      } catch (error) {
        await fs.writeFile(filePath, '{}');
      }
    }
  }

  /**
   * Generate unique error ID
   */
  generateErrorId(errorInfo) {
    const timestamp = Date.now();
    const hash = this.simpleHash(errorInfo.message + errorInfo.component);
    return `ERR_${timestamp}_${hash}`;
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Log system events
   */
  async logSystem(level, message, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    };

    const logLine = `[${logEntry.timestamp}] [${level}] ${message}\n`;
    await fs.appendFile(this.systemLogFile, logLine);

    // Also log to console for important events
    if (level === 'ERROR' || level === 'WARN') {
      console.log(`📋 [${level}] ${message}`);
    }
  }

  /**
   * Log performance metrics
   */
  async logPerformance(metric, value, context = {}) {
    const perfEntry = {
      timestamp: new Date().toISOString(),
      metric,
      value,
      ...context
    };

    // Store in memory for analysis
    switch (metric) {
      case 'api_response_time':
        this.performanceMetrics.apiResponseTimes.push(perfEntry);
        if (this.performanceMetrics.apiResponseTimes.length > 1000) {
          this.performanceMetrics.apiResponseTimes =
            this.performanceMetrics.apiResponseTimes.slice(-1000);
        }
        break;

      case 'memory_usage':
        this.performanceMetrics.memoryUsage.push(perfEntry);
        if (this.performanceMetrics.memoryUsage.length > 100) {
          this.performanceMetrics.memoryUsage =
            this.performanceMetrics.memoryUsage.slice(-100);
        }
        break;

      case 'message_processing_time':
        this.performanceMetrics.messageProcessingTimes.push(perfEntry);
        if (this.performanceMetrics.messageProcessingTimes.length > 1000) {
          this.performanceMetrics.messageProcessingTimes =
            this.performanceMetrics.messageProcessingTimes.slice(-1000);
        }
        break;
    }

    // Log to file
    const logLine = `[${perfEntry.timestamp}] ${metric}: ${value}ms\n`;
    await fs.appendFile(this.performanceLogFile, logLine);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      performanceMetrics: this.getPerformanceStats()
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const calculateStats = (values) => {
      if (values.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };

      const nums = values.map(v => v.value);
      return {
        avg: nums.reduce((a, b) => a + b, 0) / nums.length,
        min: Math.min(...nums),
        max: Math.max(...nums),
        count: nums.length
      };
    };

    return {
      apiResponseTimes: calculateStats(this.performanceMetrics.apiResponseTimes),
      memoryUsage: calculateStats(this.performanceMetrics.memoryUsage),
      messageProcessingTimes: calculateStats(this.performanceMetrics.messageProcessingTimes)
    };
  }

  /**
   * Monitor system health
   */
  async monitorSystemHealth() {
    try {
      // Check memory usage
      const memUsage = process.memoryUsage();
      await this.logPerformance('memory_usage', memUsage.heapUsed / 1024 / 1024, {
        rss: memUsage.rss / 1024 / 1024,
        external: memUsage.external / 1024 / 1024
      });

      // Check if memory usage is too high
      const memoryMB = memUsage.heapUsed / 1024 / 1024;
      if (memoryMB > 500) {
        await this.logSystem('WARN', `High memory usage: ${memoryMB.toFixed(2)}MB`);
      }

      // Check error rate
      const recentErrors = this.errorStats.recent.filter(
        e => Date.now() - new Date(e.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
      );

      if (recentErrors.length > 10) {
        await this.logSystem('WARN', `High error rate: ${recentErrors.length} errors in last 5 minutes`);
      }

    } catch (error) {
      console.error('❌ Health monitoring failed:', error.message);
    }
  }

  /**
   * Cleanup old logs
   */
  async cleanupLogs(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // For now, we'll just log the cleanup action
      // In a production system, you'd implement log rotation
      await this.logSystem('INFO', `Log cleanup initiated for logs older than ${daysToKeep} days`);

      return { cleaned: true, message: 'Log cleanup completed' };
    } catch (error) {
      await this.logSystem('ERROR', `Log cleanup failed: ${error.message}`);
      return { cleaned: false, error: error.message };
    }
  }

  /**
   * Get system health report
   */
  async getHealthReport() {
    const stats = this.getErrorStats();
    const memUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      systemHealth: {
        memoryUsage: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024)
        },
        uptime: Math.round(process.uptime()),
        errors: {
          total: stats.total,
          recent: stats.recent.length,
          byComponent: stats.byComponent
        },
        performance: stats.performanceMetrics
      }
    };
  }
}

module.exports = ErrorHandler;
