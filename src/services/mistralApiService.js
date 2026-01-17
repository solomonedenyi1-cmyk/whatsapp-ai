const { Mistral } = require('@mistralai/mistralai');
const config = require('../config/config');

class MistralApiService {
  constructor() {
    this.apiKey = config.mistral.apiKey;
    this.modelName = config.mistral.modelName;
    this.timeout = config.mistral.timeout;
    this.warningTimeout = config.mistral.warningTimeout;

    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY is not configured');
    }

    // Initialize Mistral client
    this.client = new Mistral({ apiKey: this.apiKey });

    // Initialize cache
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes TTL
    this.cacheEnabled = true;
    
    // Setup periodic cache cleanup
    this.cacheCleanupInterval = setInterval(() => {
      this.clearExpiredCache();
    }, 60000); // Clean up every minute
  }

  /**
   * Generate cache key from messages
   * @param {Array} messages - Array of message objects
   * @returns {string} - Cache key
   */
  generateCacheKey(messages) {
    // Create a stable hash of the messages content
    const content = messages.map(msg => `${msg.role}:${msg.content}`).join('|');
    return content;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    this.clearExpiredCache();
    return {
      entries: this.cache.size,
      ttl: this.cacheTTL,
      enabled: this.cacheEnabled
    };
  }

  /**
   * Send a chat message to the Mistral API
   * @param {Array} messages - Array of message objects with role and content
   * @param {Function} warningCallback - Callback to send warning message after 5 minutes
   * @param {boolean} useCache - Whether to use cache (default: true)
   * @returns {Promise<string>} - The AI response content
   */
  async sendChatMessage(messages, warningCallback = null, useCache = true) {
    let warningTimer = null;
    let warningSent = false;

    try {
      const requestData = {
        model: this.modelName,
        messages: messages,
        stream: false
      };

      if (config.env.debug) {
        console.log('Sending request to Mistral API:', JSON.stringify(requestData, null, 2));
      }

      // Check cache first if enabled
      if (this.cacheEnabled && useCache) {
        const cacheKey = this.generateCacheKey(messages);
        const cachedResponse = this.cache.get(cacheKey);
        
        if (cachedResponse && (Date.now() - cachedResponse.timestamp < this.cacheTTL)) {
          if (config.env.debug) {
            console.log('🔄 Cache hit for request');
          }
          
          // Clear warning timer if it was set
          if (warningTimer) {
            clearTimeout(warningTimer);
            warningTimer = null;
          }
          
          return cachedResponse.response;
        }
      }

      // Set up warning timer for 5 minutes
      if (warningCallback) {
        warningTimer = setTimeout(() => {
          if (!warningSent) {
            warningSent = true;
            console.log('⏰ 5-minute warning sent to user');
            warningCallback();
          }
        }, this.warningTimeout);
      }

      // Make request to Mistral API
      const response = await this.client.chat.complete(requestData);

      // Clear warning timer immediately when response arrives
      if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
      }

      if (config.env.debug) {
        console.log('Received response from Mistral API:', JSON.stringify(response, null, 2));
      }

      // Extract the content from Mistral response
      if (response && response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
        const responseContent = response.choices[0].message.content;
        
        // Cache the response if caching is enabled
        if (this.cacheEnabled && useCache) {
          const cacheKey = this.generateCacheKey(messages);
          this.cache.set(cacheKey, {
            response: responseContent,
            timestamp: Date.now()
          });
          
          if (config.env.debug) {
            console.log('💾 Response cached');
          }
        }
        
        return responseContent;
      } else {
        throw new Error('Invalid response format from Mistral API');
      }

    } catch (error) {
      // Clear warning timer on error as well
      if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
      }

      console.error('Error calling Mistral API:', error.message);

      if (error.response) {
        console.error('API Response Status:', error.response.status);
        console.error('API Response Data:', error.response.data);
      }

      // Only return fallback for actual errors, not timeouts
      if (error.code !== 'ECONNABORTED' && error.response?.status !== 524) {
        return this.getFallbackResponse(error);
      }

      // For connection issues, throw the error to be handled upstream
      throw error;
    } finally {
      // Ensure timer is always cleared
      if (warningTimer) {
        clearTimeout(warningTimer);
      }
    }
  }

  /**
   * Enable or disable caching
   * @param {boolean} enabled - Whether to enable caching
   */
  setCacheEnabled(enabled) {
    this.cacheEnabled = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }

  /**
   * Send a simple text message to the AI
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous conversation context
   * @param {Function} warningCallback - Callback to send warning message after 5 minutes
   * @param {boolean} useCache - Whether to use cache (default: true)
   * @returns {Promise<string>} - The AI response
   */
  async sendMessage(userMessage, conversationHistory = [], warningCallback = null, useCache = true) {
    const messages = [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    return await this.sendChatMessage(messages, warningCallback, useCache);
  }

  /**
   * Get fallback response when API fails
   * @param {Error} error - The error that occurred
   * @returns {string} - Fallback response message
   */
  getFallbackResponse(error) {
    // Check if it's a timeout error (524 or ECONNABORTED)
    const isTimeoutError = error?.code === 'ECONNABORTED' || error?.response?.status === 524;

    if (isTimeoutError) {
      const timeoutMessages = [
        'Desculpe, minha resposta está demorando mais que o esperado. A API está sobrecarregada no momento. Tente novamente em alguns minutos.',
        'Ops! O servidor está processando muitas solicitações. Por favor, aguarde alguns minutos e tente novamente.',
        'Estou enfrentando alta demanda no momento. Tente enviar sua mensagem novamente em 2-3 minutos.',
      ];
      const randomIndex = Math.floor(Math.random() * timeoutMessages.length);
      return timeoutMessages[randomIndex];
    }

    // General fallback messages for other errors
    const fallbackMessages = [
      'Desculpe, estou enfrentando dificuldades técnicas no momento. Tente novamente em alguns instantes.',
      'Ops! Parece que há um problema com minha conexão. Por favor, tente novamente.',
      'Estou temporariamente indisponível. Tente enviar sua mensagem novamente em breve.',
    ];

    // Return a random fallback message
    const randomIndex = Math.floor(Math.random() * fallbackMessages.length);
    return fallbackMessages[randomIndex];
  }

  /**
   * Check if the API is available
   * @returns {Promise<boolean>} - True if API is available
   */
  async checkApiStatus() {
    try {
      // Try a simple API call to check connectivity
      const response = await this.client.chat.complete({
        model: this.modelName,
        messages: [{ role: 'user', content: 'ping' }],
        stream: false
      });
      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('API health check failed:', error.message);
      return false;
    }
  }

  /**
   * Alias for checkApiStatus() for backward compatibility
   * @returns {Promise<boolean>} - True if API is available
   */
  async testConnection() {
    return await this.checkApiStatus();
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    this.clearCache();
  }
}

module.exports = MistralApiService;