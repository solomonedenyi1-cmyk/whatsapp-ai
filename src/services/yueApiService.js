const axios = require('axios');
const config = require('../config/config');

class YueApiService {
  constructor() {
    this.apiUrl = config.yuef.apiUrl;
    this.modelName = config.yuef.modelName;
    this.timeout = config.yuef.timeout;
    
    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  /**
   * Send a chat message to the Yue-F API (Ollama compatible)
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} - The AI response content
   */
  async sendChatMessage(messages) {
    try {
      const requestData = {
        model: this.modelName,
        messages: messages,
        stream: false
      };

      if (config.env.debug) {
        console.log('Sending request to Yue-F API:', JSON.stringify(requestData, null, 2));
      }

      const response = await this.client.post('/api/chat', requestData);

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
      console.error('Error calling Yue-F API:', error.message);
      
      if (error.response) {
        console.error('API Response Status:', error.response.status);
        console.error('API Response Data:', error.response.data);
      }

      // Return fallback response
      return this.getFallbackResponse(error);
    }
  }

  /**
   * Send a simple text message to the AI
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous conversation context
   * @returns {Promise<string>} - The AI response
   */
  async sendMessage(userMessage, conversationHistory = []) {
    const messages = [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    return await this.sendChatMessage(messages);
  }

  /**
   * Get fallback response when API fails
   * @param {Error} error - The error that occurred
   * @returns {string} - Fallback response message
   */
  getFallbackResponse(error) {
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
      const response = await this.client.get('/api/tags', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('API health check failed:', error.message);
      return false;
    }
  }
}

module.exports = YueApiService;
