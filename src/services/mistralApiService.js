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
  }

  /**
   * Send a chat message to the Mistral API
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
        stream: false
      };

      if (config.env.debug) {
        console.log('Sending request to Mistral API:', JSON.stringify(requestData, null, 2));
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
        return response.choices[0].message.content;
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
}

module.exports = MistralApiService;