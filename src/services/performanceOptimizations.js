const EventEmitter = require('events');

/**
 * Performance Optimizations Service
 * Advanced performance optimizations for the WhatsApp AI Bot
 */
class PerformanceOptimizations extends EventEmitter {
  constructor() {
    super();
    
    this.optimizations = {
      messageQueue: new Map(),
      responseCache: new Map(),
      memoryPool: new Set(),
      compressionEnabled: true,
      batchProcessing: true,
      lazyLoading: true
    };
    
    this.metrics = {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      optimizationsSaved: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this.config = {
      maxCacheSize: 1000,
      maxQueueSize: 500,
      batchSize: 10,
      compressionThreshold: 1024,
      memoryCleanupInterval: 300000, // 5 minutes
      performanceCheckInterval: 60000 // 1 minute
    };
    
    this.intervals = new Map();
    this.isActive = false;
    
    this.startOptimizations();
  }

  /**
   * Start performance optimizations
   */
  startOptimizations() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🚀 Starting performance optimizations...');
    
    // Memory cleanup interval
    this.intervals.set('memoryCleanup', setInterval(() => {
      this.performMemoryCleanup();
    }, this.config.memoryCleanupInterval));
    
    // Performance monitoring interval
    this.intervals.set('performanceCheck', setInterval(() => {
      this.checkPerformanceMetrics();
    }, this.config.performanceCheckInterval));
    
    // Cache optimization interval
    this.intervals.set('cacheOptimization', setInterval(() => {
      this.optimizeCache();
    }, this.config.memoryCleanupInterval));
  }

  /**
   * Optimize message processing with queue management
   * @param {string} chatId - Chat identifier
   * @param {string} message - Message content
   * @param {Function} processor - Processing function
   * @returns {Promise<any>} - Processing result
   */
  async optimizeMessageProcessing(chatId, message, processor) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(chatId, message);
      const cachedResult = this.getFromCache(cacheKey);
      
      if (cachedResult) {
        this.metrics.cacheHits++;
        this.emit('cacheHit', { chatId, cacheKey });
        return cachedResult;
      }
      
      this.metrics.cacheMisses++;
      
      // Add to processing queue
      const queueItem = {
        chatId,
        message,
        processor,
        timestamp: Date.now(),
        priority: this.calculatePriority(chatId, message)
      };
      
      // Process with optimizations
      const result = await this.processWithOptimizations(queueItem);
      
      // Cache result if beneficial
      if (this.shouldCache(message, result)) {
        this.addToCache(cacheKey, result);
      }
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metrics.optimizationsSaved += Math.max(0, 1000 - processingTime);
      
      this.emit('messageProcessed', {
        chatId,
        processingTime,
        cached: false
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in optimized message processing:', error);
      this.emit('processingError', { chatId, error: error.message });
      throw error;
    }
  }

  /**
   * Process message with various optimizations
   * @param {Object} queueItem - Queue item to process
   * @returns {Promise<any>} - Processing result
   */
  async processWithOptimizations(queueItem) {
    const { chatId, message, processor } = queueItem;
    
    // Memory optimization
    this.optimizeMemoryForProcessing();
    
    // Compression optimization
    const optimizedMessage = this.optimizations.compressionEnabled ? 
      this.compressMessage(message) : message;
    
    // Batch processing optimization
    if (this.optimizations.batchProcessing && this.shouldBatch(chatId)) {
      return await this.processBatch(chatId, optimizedMessage, processor);
    }
    
    // Regular processing with optimizations
    return await processor(optimizedMessage);
  }

  /**
   * Generate cache key for message
   * @param {string} chatId - Chat identifier
   * @param {string} message - Message content
   * @returns {string} - Cache key
   */
  generateCacheKey(chatId, message) {
    const messageHash = this.hashMessage(message);
    return `${chatId}:${messageHash}`;
  }

  /**
   * Hash message for caching
   * @param {string} message - Message to hash
   * @returns {string} - Message hash
   */
  hashMessage(message) {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Calculate processing priority
   * @param {string} chatId - Chat identifier
   * @param {string} message - Message content
   * @returns {number} - Priority score
   */
  calculatePriority(chatId, message) {
    let priority = 1;
    
    // Command messages get higher priority
    if (message.startsWith('/')) {
      priority += 2;
    }
    
    // Shorter messages get slightly higher priority
    if (message.length < 100) {
      priority += 1;
    }
    
    // Recent chat activity increases priority
    const recentActivity = this.getRecentActivity(chatId);
    if (recentActivity > 5) {
      priority += 1;
    }
    
    return priority;
  }

  /**
   * Get recent activity for chat
   * @param {string} chatId - Chat identifier
   * @returns {number} - Recent activity count
   */
  getRecentActivity(chatId) {
    const queue = this.optimizations.messageQueue.get(chatId) || [];
    const fiveMinutesAgo = Date.now() - 300000;
    return queue.filter(item => item.timestamp > fiveMinutesAgo).length;
  }

  /**
   * Check if result should be cached
   * @param {string} message - Original message
   * @param {any} result - Processing result
   * @returns {boolean} - Should cache
   */
  shouldCache(message, result) {
    // Don't cache very long messages or results
    if (message.length > 500 || JSON.stringify(result).length > 2000) {
      return false;
    }
    
    // Don't cache commands (they might have different results)
    if (message.startsWith('/')) {
      return false;
    }
    
    // Cache if result is substantial
    return result && typeof result === 'string' && result.length > 50;
  }

  /**
   * Add result to cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  addToCache(key, value) {
    // Check cache size limit
    if (this.optimizations.responseCache.size >= this.config.maxCacheSize) {
      this.evictOldestCacheEntries();
    }
    
    this.optimizations.responseCache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or null
   */
  getFromCache(key) {
    const entry = this.optimizations.responseCache.get(key);
    if (!entry) return null;
    
    // Check if entry is still valid (1 hour)
    const maxAge = 3600000;
    if (Date.now() - entry.timestamp > maxAge) {
      this.optimizations.responseCache.delete(key);
      return null;
    }
    
    entry.hits++;
    return entry.value;
  }

  /**
   * Evict oldest cache entries
   */
  evictOldestCacheEntries() {
    const entries = Array.from(this.optimizations.responseCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.optimizations.responseCache.delete(entries[i][0]);
    }
  }

  /**
   * Compress message if beneficial
   * @param {string} message - Message to compress
   * @returns {string} - Compressed or original message
   */
  compressMessage(message) {
    if (message.length < this.config.compressionThreshold) {
      return message;
    }
    
    // Simple compression: remove extra whitespace
    return message.replace(/\s+/g, ' ').trim();
  }

  /**
   * Check if should use batch processing
   * @param {string} chatId - Chat identifier
   * @returns {boolean} - Should batch
   */
  shouldBatch(chatId) {
    const queue = this.optimizations.messageQueue.get(chatId) || [];
    return queue.length >= this.config.batchSize;
  }

  /**
   * Process messages in batch
   * @param {string} chatId - Chat identifier
   * @param {string} message - Current message
   * @param {Function} processor - Processing function
   * @returns {Promise<any>} - Processing result
   */
  async processBatch(chatId, message, processor) {
    const queue = this.optimizations.messageQueue.get(chatId) || [];
    queue.push({ message, timestamp: Date.now() });
    
    // Process batch
    const batch = queue.splice(0, this.config.batchSize);
    const messages = batch.map(item => item.message);
    
    // Process all messages together (if processor supports it)
    if (processor.processBatch) {
      return await processor.processBatch(messages);
    }
    
    // Fallback to individual processing
    return await processor(message);
  }

  /**
   * Optimize memory for processing
   */
  optimizeMemoryForProcessing() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear memory pool of unused objects
    this.optimizations.memoryPool.clear();
    
    // Update memory metrics
    this.metrics.memoryUsage = process.memoryUsage();
  }

  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    console.log('🧹 Performing memory cleanup...');
    
    const beforeMemory = process.memoryUsage();
    
    // Clear old cache entries
    this.cleanupCache();
    
    // Clear old queue items
    this.cleanupQueues();
    
    // Clear memory pool
    this.optimizations.memoryPool.clear();
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    const afterMemory = process.memoryUsage();
    const saved = beforeMemory.heapUsed - afterMemory.heapUsed;
    
    console.log(`✅ Memory cleanup complete. Saved: ${(saved / 1024 / 1024).toFixed(2)}MB`);
    
    this.emit('memoryCleanup', {
      beforeMemory,
      afterMemory,
      saved
    });
  }

  /**
   * Cleanup old cache entries
   */
  cleanupCache() {
    const maxAge = 3600000; // 1 hour
    const now = Date.now();
    
    for (const [key, entry] of this.optimizations.responseCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.optimizations.responseCache.delete(key);
      }
    }
  }

  /**
   * Cleanup old queue items
   */
  cleanupQueues() {
    const maxAge = 600000; // 10 minutes
    const now = Date.now();
    
    for (const [chatId, queue] of this.optimizations.messageQueue.entries()) {
      const filteredQueue = queue.filter(item => now - item.timestamp <= maxAge);
      if (filteredQueue.length === 0) {
        this.optimizations.messageQueue.delete(chatId);
      } else {
        this.optimizations.messageQueue.set(chatId, filteredQueue);
      }
    }
  }

  /**
   * Optimize cache based on usage patterns
   */
  optimizeCache() {
    // Remove entries with low hit rates
    const entries = Array.from(this.optimizations.responseCache.entries());
    const lowHitEntries = entries.filter(([key, entry]) => {
      const age = Date.now() - entry.timestamp;
      const hitRate = entry.hits / (age / 3600000); // hits per hour
      return hitRate < 0.1; // Less than 0.1 hits per hour
    });
    
    lowHitEntries.forEach(([key]) => {
      this.optimizations.responseCache.delete(key);
    });
    
    if (lowHitEntries.length > 0) {
      console.log(`🗑️ Removed ${lowHitEntries.length} low-usage cache entries`);
    }
  }

  /**
   * Check performance metrics
   */
  checkPerformanceMetrics() {
    const currentMemory = process.memoryUsage();
    const currentCpu = process.cpuUsage();
    
    // Check memory usage
    const memoryIncrease = currentMemory.heapUsed - this.metrics.memoryUsage.heapUsed;
    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB increase
      console.log('⚠️ High memory usage detected, performing cleanup...');
      this.performMemoryCleanup();
    }
    
    // Update metrics
    this.metrics.memoryUsage = currentMemory;
    this.metrics.cpuUsage = currentCpu;
    
    // Emit performance update
    this.emit('performanceUpdate', {
      memory: currentMemory,
      cpu: currentCpu,
      cacheSize: this.optimizations.responseCache.size,
      queueSize: Array.from(this.optimizations.messageQueue.values())
        .reduce((total, queue) => total + queue.length, 0)
    });
  }

  /**
   * Get optimization statistics
   * @returns {Object} - Optimization stats
   */
  getOptimizationStats() {
    const totalCacheAttempts = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheAttempts > 0 ? 
      (this.metrics.cacheHits / totalCacheAttempts * 100).toFixed(2) : 0;
    
    return {
      cacheStats: {
        size: this.optimizations.responseCache.size,
        maxSize: this.config.maxCacheSize,
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate: `${cacheHitRate}%`
      },
      queueStats: {
        totalQueues: this.optimizations.messageQueue.size,
        totalItems: Array.from(this.optimizations.messageQueue.values())
          .reduce((total, queue) => total + queue.length, 0),
        maxQueueSize: this.config.maxQueueSize
      },
      memoryStats: {
        current: this.metrics.memoryUsage,
        poolSize: this.optimizations.memoryPool.size
      },
      optimizations: {
        enabled: this.optimizations,
        timeSaved: this.metrics.optimizationsSaved,
        isActive: this.isActive
      }
    };
  }

  /**
   * Enable/disable specific optimization
   * @param {string} optimization - Optimization name
   * @param {boolean} enabled - Enable or disable
   */
  toggleOptimization(optimization, enabled) {
    if (this.optimizations.hasOwnProperty(optimization)) {
      this.optimizations[optimization] = enabled;
      console.log(`${enabled ? '✅' : '❌'} ${optimization} optimization ${enabled ? 'enabled' : 'disabled'}`);
      
      this.emit('optimizationToggled', {
        optimization,
        enabled,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Shutdown performance optimizations
   */
  async shutdown() {
    console.log('🛑 Shutting down performance optimizations...');
    
    this.isActive = false;
    
    // Clear all intervals
    for (const [name, interval] of this.intervals.entries()) {
      clearInterval(interval);
      console.log(`✅ Cleared ${name} interval`);
    }
    this.intervals.clear();
    
    // Clear caches and queues
    this.optimizations.responseCache.clear();
    this.optimizations.messageQueue.clear();
    this.optimizations.memoryPool.clear();
    
    // Final memory cleanup
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Performance optimizations shutdown complete');
  }
}

module.exports = PerformanceOptimizations;
