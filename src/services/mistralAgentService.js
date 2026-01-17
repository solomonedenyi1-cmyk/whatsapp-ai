const { Mistral } = require('@mistralai/mistralai');
const config = require('../config/config');
const { generateSystemPrompt } = require('../config/context');

class MistralAgentService {
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
    
    // Agent configuration
    this.agentId = null;
    this.agentName = config.mistral.agentName || 'whatsapp-ai-agent';
    this.agentDescription = config.mistral.agentDescription || 'WhatsApp AI Assistant Agent';
    
    // Conversation cache
    this.conversationCache = new Map(); // chatId -> conversationId
    
    // Initialize agent
    this.initializeAgent();
  }

  /**
   * Initialize or retrieve the agent
   */
  async initializeAgent() {
    try {
      // Try to retrieve existing agent
      const agents = await this.client.beta.agents.list();
      const existingAgent = agents.find(agent => agent.name === this.agentName);
      
      if (existingAgent) {
        this.agentId = existingAgent.id;
        console.log(`🤖 Using existing agent: ${existingAgent.name} (ID: ${existingAgent.id})`);
        return;
      }
      
      // Create new agent if not exists
      const systemPrompt = generateSystemPrompt();
      
      const newAgent = await this.client.beta.agents.create({
        name: this.agentName,
        description: this.agentDescription,
        instructions: systemPrompt,
        model: this.modelName,
        metadata: {
          source: 'whatsapp-ai-bot',
          version: '1.0.0'
        }
      });
      
      this.agentId = newAgent.id;
      console.log(`🤖 Created new agent: ${newAgent.name} (ID: ${newAgent.id})`);
      
    } catch (error) {
      console.error('❌ Error initializing agent:', error.message);
      if (error.response) {
        console.error('API Response:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get or create a conversation for a chat
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Promise<string>} - Conversation ID
   */
  async getOrCreateConversation(chatId) {
    // Check cache first
    if (this.conversationCache.has(chatId)) {
      return this.conversationCache.get(chatId);
    }
    
    // Create new conversation
    const conversation = await this.client.beta.conversations.start({
      inputs: [
        {
          object: 'entry',
          type: 'agent.handoff',
          previousAgentId: this.agentId,
          previousAgentName: this.agentName,
          nextAgentId: this.agentId,
          nextAgentName: this.agentName
        }
      ],
      completionArgs: {
        responseFormat: {
          type: 'text'
        }
      }
    });
    
    const conversationId = conversation.id;
    this.conversationCache.set(chatId, conversationId);
    
    console.log(`💬 Created new conversation for ${chatId}: ${conversationId}`);
    return conversationId;
  }

  /**
   * Send a message to the Mistral Agent
   * @param {string} chatId - WhatsApp chat ID
   * @param {string} userMessage - User message
   * @param {Function} warningCallback - Callback to send warning message after 5 minutes
   * @returns {Promise<string>} - The AI response content
   */
  async sendAgentMessage(chatId, userMessage, warningCallback = null) {
    let warningTimer = null;
    let warningSent = false;

    try {
      // Get or create conversation
      const conversationId = await this.getOrCreateConversation(chatId);
      
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
      
      // Send message to agent
      const response = await this.client.beta.conversations.append({
        conversationId: conversationId,
        inputs: [
          {
            object: 'entry',
            type: 'user.message',
            content: userMessage
          }
        ],
        completionArgs: {
          responseFormat: {
            type: 'text'
          }
        }
      });
      
      // Clear warning timer
      if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
      }
      
      // Extract the assistant's response
      if (response && response.outputs && response.outputs.length > 0) {
        const assistantOutput = response.outputs.find(output => 
          output.type === 'assistant.message' && output.content
        );
        
        if (assistantOutput && assistantOutput.content) {
          return assistantOutput.content;
        }
      }
      
      throw new Error('No valid response from agent');
      
    } catch (error) {
      // Clear warning timer on error
      if (warningTimer) {
        clearTimeout(warningTimer);
        warningTimer = null;
      }
      
      console.error('Error calling Mistral Agent:', error.message);
      if (error.response) {
        console.error('API Response Status:', error.response.status);
        console.error('API Response Data:', error.response.data);
      }
      
      // For connection issues, throw the error to be handled upstream
      if (error.code === 'ECONNABORTED' || error.response?.status === 524) {
        throw error;
      }
      
      // Return fallback response for other errors
      return this.getFallbackResponse(error);
    }
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
   * Clear conversation cache for a specific chat
   * @param {string} chatId - WhatsApp chat ID
   */
  clearConversationCache(chatId) {
    this.conversationCache.delete(chatId);
  }

  /**
   * Clear all conversation cache
   */
  clearAllConversationCache() {
    this.conversationCache.clear();
  }

  /**
   * Get agent information
   * @returns {Promise<Object>} - Agent information
   */
  async getAgentInfo() {
    if (!this.agentId) {
      await this.initializeAgent();
    }
    
    try {
      const agent = await this.client.beta.agents.get({
        agentId: this.agentId
      });
      
      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        model: agent.model,
        version: agent.version,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      };
    } catch (error) {
      console.error('Error getting agent info:', error.message);
      return null;
    }
  }

  /**
   * Check if the Agent API is available
   * @returns {Promise<boolean>} - True if API is available
   */
  async checkAgentApiStatus() {
    try {
      // Try to list agents to check connectivity
      const agents = await this.client.beta.agents.list();
      return agents && agents.length >= 0;
    } catch (error) {
      console.error('Agent API health check failed:', error.message);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.clearAllConversationCache();
  }
}

module.exports = MistralAgentService;