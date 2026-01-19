const config = require('../config/config');

/**
 * Performance Optimizations Service
 * Advanced performance optimizations for the WhatsApp AI Bot
 */
class PerformanceOptimizations {
  constructor() {
    this.optimizations = {
      responseCache: new Map(),
      compressionEnabled: true
    };

    this.metrics = {
      memoryUsage: process.memoryUsage(),
      cacheHits: 0,
      cacheMisses: 0
    };

    this.config = {
      maxCacheSize: 1000,
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
   * Optimize message processing with caching/compression
   * @param {string} chatId - Chat identifier
   * @param {string} message - Message content
   * @param {Function} processor - Processing function
   * @returns {Promise<any>} - Processing result
   */
  async optimizeMessageProcessing(chatId, message, processor) {
    const startTime = Date.now();

    try {
      const cacheKey = this.generateCacheKey(chatId, message);
      const cachedResult = this.getFromCache(cacheKey);

      if (cachedResult) {
        this.metrics.cacheHits++;
        return cachedResult;
      }

      this.metrics.cacheMisses++;

      // Process with optimizations
      const result = await this.processWithOptimizations(message, processor);

      // Cache result if beneficial
      if (this.shouldCache(message, result)) {
        this.addToCache(cacheKey, result);
      }

      return result;

    } catch (error) {
      console.error('❌ Error in optimized message processing:', error);
      throw error;
    } finally {
      const processingTime = Date.now() - startTime;
      if (processingTime > 5000) {
        console.log(`⚠️ Slow processing detected: ${processingTime}ms`);
      }
    }
  }

  /**
   * Process message with various optimizations
   * @param {string} message - Message to process
   * @param {Function} processor - Processing function
   * @returns {Promise<any>} - Processing result
   */
  async processWithOptimizations(message, processor) {
    // Memory optimization
    this.optimizeMemoryForProcessing();

    // Compression optimization
    const optimizedMessage = this.optimizations.compressionEnabled ?
      this.compressMessage(message) : message;

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
   * Optimize memory for processing
   */
  optimizeMemoryForProcessing() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Update memory metrics
    this.metrics.memoryUsage = process.memoryUsage();
  }

  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    if (config.env?.debug) {
      console.log('🧹 Performing memory cleanup...');
    }

    const beforeMemory = process.memoryUsage();

    // Clear old cache entries
    this.cleanupCache();

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    const afterMemory = process.memoryUsage();
    const saved = Math.max(0, beforeMemory.heapUsed - afterMemory.heapUsed);
    const savedMb = saved / 1024 / 1024;

    if (saved > 0 || config.env?.debug) {
      console.log(`✅ Memory cleanup complete. Saved: ${savedMb.toFixed(2)}MB`);
    }
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

    // Check memory usage
    const memoryIncrease = currentMemory.heapUsed - this.metrics.memoryUsage.heapUsed;
    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB increase
      console.log('⚠️ High memory usage detected, performing cleanup...');
      this.performMemoryCleanup();
    }

    // Update metrics
    this.metrics.memoryUsage = currentMemory;
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

    // Final memory cleanup
    if (global.gc) {
      global.gc();
    }

    console.log('✅ Performance optimizations shutdown complete');
  }
}

module.exports = PerformanceOptimizations;
