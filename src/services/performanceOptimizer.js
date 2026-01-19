/**
 * Performance Optimization Service
 * 
 * Provides performance monitoring, optimization, and resource management
 * for the WhatsApp AI Bot system
 */

const EventEmitter = require('events');
const config = require('../config/config');

class PerformanceOptimizer extends EventEmitter {
  constructor() {
    super();

    // Performance thresholds
    this.thresholds = {
      memoryUsage: 512, // MB
      responseTime: 5000, // ms
      messageQueueSize: 100,
      errorRate: 0.05 // 5%
    };

    // Initialize metrics
    this.metrics = {
      memoryHistory: [],
      responseTimeHistory: [],
      errorRateHistory: [],
      messageQueue: [],
      messagesProcessed: 0,
      totalMessageLength: 0,
      messageHistory: []
    };

    // Optimization flags
    this.optimizations = {
      messageQueueEnabled: true,
      responseTimeOptimization: true,
      memoryOptimization: true,
      cacheOptimization: true
    };

    // Cache for frequently accessed data
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0
    };

    this.startPerformanceMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Cleanup interval every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000);

    console.log('🚀 Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopPerformanceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    console.log('⏹️ Performance monitoring stopped');
  }

  /**
   * Collect performance metrics
   */
  async collectMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      const memoryMB = memUsage.heapUsed / 1024 / 1024;

      this.metrics.memoryHistory.push({
        timestamp: Date.now(),
        value: memoryMB
      });

      // Keep only last 100 entries
      if (this.metrics.memoryHistory.length > 100) {
        this.metrics.memoryHistory = this.metrics.memoryHistory.slice(-100);
      }

      // Check memory threshold
      if (memoryMB > this.thresholds.memoryUsage) {
        this.emit('memoryThresholdExceeded', { usage: memoryMB, threshold: this.thresholds.memoryUsage });
        await this.optimizeMemoryUsage();
      }

      // Message queue size
      if (this.metrics.messageQueue.length > this.thresholds.messageQueueSize) {
        this.emit('messageQueueThresholdExceeded', { size: this.metrics.messageQueue.length });
        await this.optimizeMessageQueue();
      }

    } catch (error) {
      console.error('❌ Error collecting metrics:', error.message);
    }
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemoryUsage() {
    try {
      console.log('🧹 Optimizing memory usage...');

      // Clear old cache entries
      await this.optimizeCache();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('♻️ Garbage collection triggered');
      }

      // Clear old metrics
      this.clearOldMetrics();

      this.emit('memoryOptimized');

    } catch (error) {
      console.error('❌ Memory optimization failed:', error.message);
    }
  }

  /**
   * Optimize message queue
   */
  async optimizeMessageQueue() {
    try {
      console.log('📬 Optimizing message queue...');

      // Process oldest messages first
      const oldMessages = this.metrics.messageQueue.splice(0, 50);

      // Emit event for processing
      this.emit('messageQueueOptimized', { processedCount: oldMessages.length });

    } catch (error) {
      console.error('❌ Message queue optimization failed:', error.message);
    }
  }

  /**
   * Optimize cache
   */
  async optimizeCache() {
    try {
      const maxCacheSize = 1000;
      const maxCacheAge = 30 * 60 * 1000; // 30 minutes
      const now = Date.now();

      let removedCount = 0;

      // Remove old entries
      for (const [key, value] of this.cache.entries()) {
        if (value.timestamp && (now - value.timestamp) > maxCacheAge) {
          this.cache.delete(key);
          removedCount++;
        }
      }

      // Remove excess entries if cache is too large
      if (this.cache.size > maxCacheSize) {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));

        const toRemove = entries.slice(0, this.cache.size - maxCacheSize);
        toRemove.forEach(([key]) => {
          this.cache.delete(key);
          removedCount++;
        });
      }

      this.cacheStats.size = this.cache.size;

      if (removedCount > 0) {
        console.log(`🗑️ Cache optimized: removed ${removedCount} entries`);
      }

    } catch (error) {
      console.error('❌ Cache optimization failed:', error.message);
    }
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics() {
    const maxEntries = 100;

    if (this.metrics.responseTimeHistory.length > maxEntries) {
      this.metrics.responseTimeHistory = this.metrics.responseTimeHistory.slice(-maxEntries);
    }

    if (this.metrics.errorRateHistory.length > maxEntries) {
      this.metrics.errorRateHistory = this.metrics.errorRateHistory.slice(-maxEntries);
    }
  }

  /**
   * Record message received
   */
  recordMessageReceived(chatId, messageLength) {
    this.metrics.messagesProcessed++;
    this.metrics.totalMessageLength += messageLength;

    // Record in history for analytics
    this.metrics.messageHistory = this.metrics.messageHistory || [];
    this.metrics.messageHistory.push({
      timestamp: Date.now(),
      chatId,
      length: messageLength
    });

    // Keep only last 1000 messages in history
    if (this.metrics.messageHistory.length > 1000) {
      this.metrics.messageHistory = this.metrics.messageHistory.slice(-1000);
    }
  }

  /**
   * Record response time
   */
  recordResponseTime(responseTime) {
    this.metrics.responseTimeHistory.push({
      timestamp: Date.now(),
      responseTime
    });

    // Update running averages
    this.updateResponseTimeStats(responseTime);

    // Check thresholds
    this.checkResponseTimeThreshold(responseTime);

    // Clean old data
    this.clearOldMetrics();
    return responseTime;
  }

  /**
   * Update response time statistics
   */
  updateResponseTimeStats(responseTime) {
    if (!this.responseTimeStats) {
      this.responseTimeStats = {
        min: responseTime,
        max: responseTime,
        total: responseTime,
        count: 1,
        average: responseTime
      };
      return;
    }

    this.responseTimeStats.min = Math.min(this.responseTimeStats.min, responseTime);
    this.responseTimeStats.max = Math.max(this.responseTimeStats.max, responseTime);
    this.responseTimeStats.total += responseTime;
    this.responseTimeStats.count++;
    this.responseTimeStats.average = this.responseTimeStats.total / this.responseTimeStats.count;
  }

  /**
   * Check response time threshold
   */
  checkResponseTimeThreshold(responseTime) {
    if (responseTime > this.thresholds.responseTime) {
      this.emit('responseTimeThresholdExceeded', {
        responseTime,
        threshold: this.thresholds.responseTime,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Performance cleanup
   */
  async performCleanup() {
    try {
      // Clear expired cache entries
      this.clearExpiredCache();

      // Clear old metrics
      this.clearOldMetrics();

      // Garbage collection hint
      if (global.gc) {
        global.gc();
      }

      if (config.env?.debug) {
        console.log('🧹 Performance cleanup completed');
      }
    } catch (error) {
      console.error('❌ Error during performance cleanup:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (cached.ttl && (now - cached.timestamp) > cached.ttl) {
        this.cache.delete(key);
      }
    }
    this.cacheStats.size = this.cache.size;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const memUsage = process.memoryUsage();
    const currentMemoryMB = memUsage.heapUsed / 1024 / 1024;

    // Calculate averages
    const avgMemory = this.metrics.memoryHistory.length > 0
      ? this.metrics.memoryHistory.reduce((sum, m) => sum + m.value, 0) / this.metrics.memoryHistory.length
      : currentMemoryMB;

    const avgResponseTime = this.responseTimeStats ? this.responseTimeStats.average : 0;

    return {
      memory: {
        current: currentMemoryMB,
        average: avgMemory,
        peak: Math.max(...this.metrics.memoryHistory.map(m => m.value), currentMemoryMB)
      },
      responseTime: {
        average: avgResponseTime,
        min: this.responseTimeStats ? this.responseTimeStats.min : 0,
        max: this.responseTimeStats ? this.responseTimeStats.max : 0
      },
      cache: {
        hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
        size: this.cacheStats.size,
        memoryUsage: this.cache.size * 0.1 // Rough estimate
      },
      messageQueue: {
        size: this.metrics.messageQueue.length,
        processed: this.metrics.messagesProcessed || 0,
        averageWaitTime: this.calculateAverageWaitTime()
      }
    };
  }

  /**
   * Calculate average wait time for message queue
   */
  calculateAverageWaitTime() {
    if (this.metrics.messageQueue.length === 0) {
      return 0;
    }

    const now = Date.now();
    const totalWaitTime = this.metrics.messageQueue.reduce((sum, msg) => {
      return sum + (now - msg.timestamp);
    }, 0);

    return totalWaitTime / this.metrics.messageQueue.length;
  }

  /**
   * Shutdown performance optimizer
   */
  async shutdown() {
    try {
      this.stopPerformanceMonitoring();

      // Final cleanup
      await this.performCleanup();

      console.log('✅ Performance optimizer shutdown complete');
    } catch (error) {
      console.error('❌ Error during performance optimizer shutdown:', error);
    }
  }
}

module.exports = PerformanceOptimizer;
