/**
 * Performance Optimization Service
 * 
 * Provides performance monitoring, optimization, and resource management
 * for the WhatsApp AI Bot system
 */

const EventEmitter = require('events');

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
    
    // Performance metrics
    this.metrics = {
      messageQueue: [],
      responseTimeHistory: [],
      memoryHistory: [],
      errorRateHistory: []
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
   * Add message to processing queue
   */
  addToMessageQueue(message) {
    this.metrics.messageQueue.push({
      id: this.generateId(),
      message,
      timestamp: Date.now(),
      priority: message.priority || 'normal'
    });
    
    // Sort by priority and timestamp
    this.metrics.messageQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Get next message from queue
   */
  getNextMessage() {
    return this.metrics.messageQueue.shift();
  }

  /**
   * Record response time
   */
  recordResponseTime(startTime, endTime, operation = 'unknown') {
    const responseTime = endTime - startTime;
    
    this.metrics.responseTimeHistory.push({
      timestamp: endTime,
      responseTime,
      operation
    });
    
    // Check threshold
    if (responseTime > this.thresholds.responseTime) {
      this.emit('responseTimeThresholdExceeded', { 
        responseTime, 
        threshold: this.thresholds.responseTime,
        operation 
      });
    }
    
    return responseTime;
  }

  /**
   * Cache management
   */
  setCache(key, value, ttl = 30 * 60 * 1000) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
    this.cacheStats.size = this.cache.size;
  }

  getCache(key) {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.cacheStats.misses++;
      return null;
    }
    
    // Check if expired
    if (cached.ttl && (Date.now() - cached.timestamp) > cached.ttl) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      this.cacheStats.size = this.cache.size;
      return null;
    }
    
    this.cacheStats.hits++;
    return cached.value;
  }

  /**
   * Performance cleanup
   */
  async performCleanup() {
    try {
      await this.optimizeCache();
      this.clearOldMetrics();
      
      // Log performance stats
      const stats = this.getPerformanceStats();
      console.log(`📊 Performance: Mem: ${stats.memory.current}MB, Cache: ${stats.cache.hitRate}%, Queue: ${stats.messageQueue.size}`);
      
    } catch (error) {
      console.error('❌ Performance cleanup failed:', error.message);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const memUsage = process.memoryUsage();
    const currentMemory = memUsage.heapUsed / 1024 / 1024;
    
    // Calculate averages
    const avgResponseTime = this.metrics.responseTimeHistory.length > 0 ?
      this.metrics.responseTimeHistory.reduce((sum, entry) => sum + entry.responseTime, 0) / this.metrics.responseTimeHistory.length : 0;
    
    const cacheHitRate = (this.cacheStats.hits + this.cacheStats.misses) > 0 ?
      (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)) * 100 : 0;
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        current: Math.round(currentMemory),
        threshold: this.thresholds.memoryUsage,
        history: this.metrics.memoryHistory.slice(-10)
      },
      responseTime: {
        average: Math.round(avgResponseTime),
        threshold: this.thresholds.responseTime,
        recent: this.metrics.responseTimeHistory.slice(-10)
      },
      cache: {
        size: this.cacheStats.size,
        hitRate: Math.round(cacheHitRate),
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses
      },
      messageQueue: {
        size: this.metrics.messageQueue.length,
        threshold: this.thresholds.messageQueueSize
      },
      uptime: Math.round(process.uptime()),
      optimizations: this.optimizations
    };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('⚙️ Performance thresholds updated:', this.thresholds);
  }

  /**
   * Enable/disable optimizations
   */
  toggleOptimization(optimization, enabled) {
    if (this.optimizations.hasOwnProperty(optimization)) {
      this.optimizations[optimization] = enabled;
      console.log(`⚙️ ${optimization} optimization ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get system resource usage
   */
  getResourceUsage() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      pid: process.pid
    };
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    this.stopPerformanceMonitoring();
    this.cache.clear();
    this.metrics.messageQueue = [];
    console.log('🛑 Performance optimizer shutdown complete');
  }
}

module.exports = PerformanceOptimizer;
