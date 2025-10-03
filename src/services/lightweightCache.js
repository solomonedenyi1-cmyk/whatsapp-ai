/**
 * Lightweight Cache Service
 * 
 * Very selective caching that preserves human-like behavior
 * Only caches static business information, never conversational responses
 */

class LightweightCache {
  constructor() {
    this.cache = new Map();
    this.config = {
      maxSize: 50, // Very small cache
      ttl: 30 * 60 * 1000, // 30 minutes TTL
      cleanupInterval: 10 * 60 * 1000 // Cleanup every 10 minutes
    };
    
    // Only cache these specific types of static queries
    this.cacheablePatterns = [
      /^(preço|precos|preco|price|pricing|valor|valores|custo|custos)/i,
      /^(servico|servicos|service|services|produto|produtos|product|products)/i,
      /^(contato|contact|telefone|phone|email|endereco|address)/i,
      /^(horario|horarios|funcionamento|working|hours|schedule)/i,
      /^(sobre|about|empresa|company|negocio|business)/i
    ];
    
    this.startCleanupTimer();
  }

  /**
   * Check if a query should be cached (very selective)
   */
  shouldCache(query) {
    // Never cache conversational or personal queries
    const conversationalPatterns = [
      /^(oi|olá|hello|hi|bom dia|boa tarde|boa noite)/i,
      /^(como|how|why|porque|quando|where|onde)/i,
      /(você|voce|tu|me|mim|eu|I|my|meu|minha)/i,
      /(obrigad|thanks|thank|valeu|vlw)/i,
      /(tchau|bye|goodbye|até|ate)/i
    ];

    // Don't cache if it's conversational
    for (const pattern of conversationalPatterns) {
      if (pattern.test(query)) {
        return false;
      }
    }

    // Only cache if it matches static business info patterns
    for (const pattern of this.cacheablePatterns) {
      if (pattern.test(query)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate cache key from query
   */
  generateKey(query) {
    // Normalize query for better cache hits
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .substring(0, 50); // Limit key length
  }

  /**
   * Get cached response if available
   */
  get(query) {
    if (!this.shouldCache(query)) {
      return null;
    }

    const key = this.generateKey(query);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access time for LRU
    cached.lastAccessed = Date.now();
    return cached.response;
  }

  /**
   * Store response in cache (very selective)
   */
  set(query, response) {
    if (!this.shouldCache(query)) {
      return false;
    }

    // Don't cache if response seems conversational or personal
    if (this.isConversationalResponse(response)) {
      return false;
    }

    const key = this.generateKey(query);
    
    // Enforce size limit (LRU eviction)
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      response,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.ttl,
      lastAccessed: Date.now(),
      query: query.substring(0, 100) // Store original for debugging
    });

    return true;
  }

  /**
   * Check if response seems conversational (don't cache these)
   */
  isConversationalResponse(response) {
    const conversationalIndicators = [
      /^(oi|olá|hello|hi|bom dia|boa tarde|boa noite)/i,
      /(como posso|how can|what can)/i,
      /(obrigad|thanks|thank|valeu)/i,
      /(desculp|sorry|perdão)/i,
      /(você|voce|tu|I|my|meu|minha)/i,
      /[?!]{2,}/, // Multiple punctuation (excitement/questions)
      /😊|😄|😃|🤔|❤️|💕/ // Emojis indicate personal touch
    ];

    for (const pattern of conversationalIndicators) {
      if (pattern.test(response)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evict least recently used item
   */
  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      expired,
      usage: Math.round((this.cache.size / this.config.maxSize) * 100),
      ttl: this.config.ttl / 1000 / 60 // TTL in minutes
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cache cleared: ${size} entries removed`);
    return size;
  }

  /**
   * Shutdown cache service
   */
  async shutdown() {
    try {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
      this.cache.clear();
      console.log('✅ Lightweight cache shutdown completed');
    } catch (error) {
      console.error('❌ Error during cache shutdown:', error.message);
    }
  }

  /**
   * Get cache entries for debugging
   */
  getEntries() {
    const entries = [];
    for (const [key, item] of this.cache.entries()) {
      entries.push({
        key,
        query: item.query,
        age: Math.round((Date.now() - item.createdAt) / 1000),
        ttl: Math.round((item.expiresAt - Date.now()) / 1000),
        responseLength: item.response.length
      });
    }
    return entries.sort((a, b) => b.age - a.age);
  }
}

module.exports = LightweightCache;
