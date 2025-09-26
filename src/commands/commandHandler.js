const config = require('../config/config');

class CommandHandler {
  constructor(yueApiService, conversationService) {
    this.yueApiService = yueApiService;
    this.conversationService = conversationService;
  }

  /**
   * Handle a command message
   * @param {string} command - Command name
   * @param {Array} args - Command arguments
   * @param {string} chatId - WhatsApp chat ID
   * @returns {Promise<string>} - Command response
   */
  async handleCommand(command, args, chatId) {
    switch (command) {
      case 'help':
        return this.handleHelp();
      
      case 'reset':
        return this.handleReset(chatId);
      
      case 'status':
        return await this.handleStatus();
      
      case 'about':
        return this.handleAbout();
      
      default:
        return this.handleUnknownCommand(command);
    }
  }

  /**
   * Handle /help command
   * @returns {string} - Help message
   */
  handleHelp() {
    return `🤖 *${config.bot.name} - Comandos Disponíveis*

*Comandos básicos:*
• /help - Mostra esta mensagem de ajuda
• /reset - Limpa o histórico da conversa
• /status - Verifica o status do bot e da API
• /about - Informações sobre o bot

*Como usar:*
• Envie qualquer mensagem para conversar com a IA
• Use os comandos acima para controlar o bot
• O bot mantém o contexto da conversa automaticamente

*Dicas:*
• Mensagens muito longas são divididas automaticamente
• Emojis sozinhos são ignorados
• O bot responde apenas a mensagens de texto`;
  }

  /**
   * Handle /reset command
   * @param {string} chatId - WhatsApp chat ID
   * @returns {string} - Reset confirmation message
   */
  handleReset(chatId) {
    this.conversationService.clearContext(chatId);
    return '🔄 *Contexto da conversa limpo!*\n\nVocê pode começar uma nova conversa. O histórico anterior foi removido.';
  }

  /**
   * Handle /status command
   * @returns {Promise<string>} - Status message
   */
  async handleStatus() {
    try {
      const apiStatus = await this.yueApiService.checkApiStatus();
      const stats = this.conversationService.getStats();
      
      const statusEmoji = apiStatus ? '✅' : '❌';
      const apiStatusText = apiStatus ? 'Online' : 'Offline';
      
      return `📊 *Status do Bot*

*API Yue-F:* ${statusEmoji} ${apiStatusText}
*Conversas ativas:* ${stats.activeConversations}
*Total de mensagens:* ${stats.totalMessages}
*Modelo:* ${config.yuef.modelName}
*Versão:* 1.0.0

*Configurações:*
• Timeout da API: ${config.yuef.timeout}ms
• Máx. contexto: ${config.bot.maxContextMessages} mensagens
• Tamanho máx. mensagem: ${config.bot.messageSplitLength} caracteres`;
    } catch (error) {
      return '❌ *Erro ao verificar status*\n\nNão foi possível verificar o status da API no momento.';
    }
  }

  /**
   * Handle /about command
   * @returns {string} - About message
   */
  handleAbout() {
    return `🤖 *${config.bot.name}*

*Sobre este bot:*
Este é um assistente de IA integrado ao WhatsApp, powered by Yue-F AI model.

*Características:*
• Conversas naturais em português
• Mantém contexto da conversa
• Respostas rápidas e inteligentes
• Interface familiar do WhatsApp

*Tecnologia:*
• Modelo: Yue-F (via Ollama)
• API: ${config.yuef.apiUrl}
• Plataforma: Node.js + WhatsApp Web

*Desenvolvido em:* Setembro 2025
*Versão:* 1.0.0 (Fase 1)

Para mais informações, use /help`;
  }

  /**
   * Handle unknown command
   * @param {string} command - Unknown command name
   * @returns {string} - Error message
   */
  handleUnknownCommand(command) {
    return `❓ *Comando desconhecido: /${command}*

Use /help para ver os comandos disponíveis.`;
  }
}

module.exports = CommandHandler;
