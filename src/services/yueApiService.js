const MistralAgentService = require('./mistralAgentService');

class YueApiService {
  constructor({ mistralAgentService } = {}) {
    this.mistralAgentService = mistralAgentService || new MistralAgentService();
  }

  async sendChatMessage(messages, warningCallback = null) {
    return this.mistralAgentService.sendChatMessage(messages, warningCallback);
  }

  async sendMessage(userMessage, conversationHistory = [], warningCallback = null) {
    return this.mistralAgentService.sendMessage(userMessage, conversationHistory, warningCallback);
  }

  async checkApiStatus() {
    return this.mistralAgentService.checkApiStatus();
  }

  async testConnection() {
    return this.checkApiStatus();
  }
}

module.exports = YueApiService;
