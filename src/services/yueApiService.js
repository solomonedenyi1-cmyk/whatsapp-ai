const axios = require('axios');
const http = require('http');
const https = require('https');
const config = require('../config/config');
const businessConfig = require('../../config.json');

class YueApiService {
  constructor() {
    this.apiUrl = config.yuef.apiUrl;
    this.modelName = config.yuef.modelName;
    this.timeout = config.yuef.timeout;
    this.warningTimeout = config.yuef.warningTimeout;
    
    // Create HTTP/HTTPS agents with connection pooling
    const isHttps = this.apiUrl.startsWith('https');
    const Agent = isHttps ? https.Agent : http.Agent;
    
    this.httpAgent = new Agent({
      keepAlive: true,
      keepAliveMsecs: 30000, // Keep connections alive for 30 seconds
      maxSockets: 10, // Maximum 10 concurrent connections
      maxFreeSockets: 5, // Keep 5 free connections in pool
      timeout: 60000, // Socket timeout 60 seconds
      freeSocketTimeout: 30000 // Free socket timeout
    });

    // Create axios instance with connection pooling and no timeout
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 0, // No timeout - wait indefinitely
      headers: {
        'Content-Type': 'application/json',
      },
      httpAgent: isHttps ? undefined : this.httpAgent,
      httpsAgent: isHttps ? this.httpAgent : undefined,
      // Additional performance optimizations
      maxRedirects: 5,
      maxContentLength: 50 * 1024 * 1024, // 50MB max response
      validateStatus: (status) => status < 500 // Don't reject on 4xx errors
    });
  }

  /**
   * Send a chat message to the Yue-F API (Ollama compatible)
   * @param {Array} messages - Array of message objects with role and content
   * @param {Function} warningCallback - Callback to send warning message after 5 minutes
   * @returns {Promise<string>} - The AI response content
   */
  async sendChatMessage(messages, warningCallback = null) {
    let warningTimer = null;
    let warningSent = false;
    
    try {
      const requestData = {
        model: this.modelName,
        messages: messages,
        stream: true
      };

      if (config.env.debug) {
        console.log('Sending request to Yue-F API:', JSON.stringify(requestData, null, 2));
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

      // Make request with no timeout - wait indefinitely
      const response = await this.client.post('/api/chat', requestData);

      // Clear warning timer immediately when response arrives
      if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
      }

      if (config.env.debug) {
        console.log('Received response from Yue-F API:', JSON.stringify(response.data, null, 2));
      }

      // Extract the content from Ollama-compatible response
      if (response.data && response.data.message && response.data.message.content) {
        return response.data.message.content;
      } else {
        throw new Error('Invalid response format from Yue-F API');
      }

    } catch (error) {
      // Clear warning timer on error as well
      if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
      }
      
      console.error('Error calling Yue-F API:', error.message);
      
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
   * Send a simple text message to the AI
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous conversation context
   * @param {Function} warningCallback - Callback to send warning message after 5 minutes
   * @returns {Promise<string>} - The AI response
   */
  async sendMessage(userMessage, conversationHistory = [], warningCallback = null) {
    const messages = [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    return await this.sendChatMessage(messages, warningCallback);
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
      const timeoutMessages = businessConfig.error_messages?.api_timeout || [
        'Desculpe, minha resposta está demorando mais que o esperado. A API está sobrecarregada no momento. Tente novamente em alguns minutos.'
      ];
      const randomIndex = Math.floor(Math.random() * timeoutMessages.length);
      return timeoutMessages[randomIndex];
    }

    // General fallback messages for other errors
    const fallbackMessages = businessConfig.error_messages?.api_general || [
      'Desculpe, estou enfrentando dificuldades técnicas no momento. Tente novamente em alguns instantes.'
    ];

    // Return a random fallback message
    const randomIndex = Math.floor(Math.random() * fallbackMessages.length);
    return fallbackMessages[randomIndex];
  }

  /**
   * Test connection to the API (alias for checkApiStatus)
   * @returns {Promise<boolean>} - True if API is available
   */
  async testConnection() {
    return await this.checkApiStatus();
  }

  /**
   * Check if the API is available
   * @returns {Promise<boolean>} - True if API is available
   */
  async checkApiStatus() {
    try {
      const response = await this.client.get('/api/tags', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('API health check failed:', error.message);
      return false;
    }
  }

  /**
   * Cleanup resources and close connections
   */
  async cleanup() {
    try {
      if (this.httpAgent) {
        this.httpAgent.destroy();
      }
      console.log('✅ YueApiService cleanup completed');
    } catch (error) {
      console.error('❌ Error during YueApiService cleanup:', error.message);
    }
  }
}

module.exports = YueApiService;
