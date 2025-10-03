/**
 * Security Commands Module
 * 
 * Enhanced security and admin commands for the WhatsApp AI Bot
 */

class SecurityCommands {
  constructor(securityManager, rateLimiter) {
    this.securityManager = securityManager;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Handle security command
   */
  async handleSecurityCommand(args, chatId) {
    try {
      const securityResult = this.securityManager.validateAdminAccess(chatId, 'security', true);
      
      if (!securityResult.allowed) {
        return securityResult.message;
      }

      if (!args || args.length === 0) {
        return `🔒 **Comandos de Segurança**\n\n` +
               `• \`/security stats\` - Estatísticas de segurança\n` +
               `• \`/security reset [chatId]\` - Reset status de segurança\n` +
               `• \`/security config\` - Configuração atual\n` +
               `• \`/security sessions\` - Sessões ativas`;
      }

      const subCommand = args[0].toLowerCase();

      switch (subCommand) {
        case 'stats':
          const stats = this.securityManager.getSecurityStats();
          return `🔒 **Estatísticas de Segurança**\n\n` +
                 `👥 Admins: ${stats.adminCount}\n` +
                 `⭐ Super Admins: ${stats.superAdminCount}\n` +
                 `🔐 Sessões ativas: ${stats.activeSessions}\n` +
                 `🚫 Usuários bloqueados: ${stats.lockedUsers}\n` +
                 `❌ Tentativas falhadas: ${stats.totalFailedAttempts}`;

        case 'reset':
          if (args.length < 2) {
            return '❌ Uso: /security reset [chatId]';
          }
          const resetResult = this.securityManager.resetUserSecurity(args[1], chatId);
          return resetResult.message;

        case 'config':
          const config = this.securityManager.config;
          return `⚙️ **Configuração de Segurança**\n\n` +
                 `Max tentativas: ${config.maxFailedAttempts}\n` +
                 `Duração do bloqueio: ${config.lockoutDuration / 60000} min\n` +
                 `Duração da sessão: ${config.sessionDuration / 60000} min`;

        case 'sessions':
          const sessionStats = this.securityManager.getSecurityStats();
          return `🔐 **Sessões Ativas: ${sessionStats.activeSessions}**\n\n` +
                 `Use /admin session para ver detalhes da sua sessão`;

        default:
          return '❌ Subcomando inválido. Use /security para ver os comandos disponíveis.';
      }
    } catch (error) {
      console.error('Error in security command:', error);
      return '❌ Erro ao executar comando de segurança.';
    }
  }

  /**
   * Handle rate limit command
   */
  async handleRateLimitCommand(args, chatId) {
    try {
      const securityResult = this.securityManager.validateAdminAccess(chatId, 'ratelimit');
      
      if (!securityResult.allowed) {
        return securityResult.message;
      }

      if (!args || args.length === 0) {
        return `⏰ **Comandos de Rate Limiting**\n\n` +
               `• \`/ratelimit stats\` - Estatísticas gerais\n` +
               `• \`/ratelimit user [chatId]\` - Status de usuário\n` +
               `• \`/ratelimit reset [chatId]\` - Reset limites de usuário\n` +
               `• \`/ratelimit top\` - Top usuários por mensagens\n` +
               `• \`/ratelimit config\` - Configuração atual`;
      }

      const subCommand = args[0].toLowerCase();

      switch (subCommand) {
        case 'stats':
          const stats = this.rateLimiter.getStats();
          return `⏰ **Estatísticas de Rate Limiting**\n\n` +
                 `👥 Total de usuários: ${stats.totalUsers}\n` +
                 `🟢 Usuários ativos: ${stats.activeUsers}\n` +
                 `🚫 Usuários banidos: ${stats.bannedUsers}\n` +
                 `⚠️ Usuários penalizados: ${stats.penalizedUsers}\n` +
                 `📨 Total de mensagens: ${stats.totalMessages}\n` +
                 `👑 Admins configurados: ${stats.adminCount}`;

        case 'user':
          if (args.length < 2) {
            return '❌ Uso: /ratelimit user [chatId]';
          }
          const userStatus = this.rateLimiter.getUserStatus(args[1]);
          if (!userStatus.exists) {
            return '❌ Usuário não encontrado no sistema de rate limiting';
          }
          return `👤 **Status do Usuário**\n\n` +
                 `📨 Mensagens (último minuto): ${userStatus.messagesLastMinute}\n` +
                 `📨 Mensagens (última hora): ${userStatus.messagesLastHour}\n` +
                 `📊 Total de mensagens: ${userStatus.totalMessages}\n` +
                 `⚠️ Penalidades: ${userStatus.penalties}\n` +
                 `🚫 Banido: ${userStatus.banned ? 'Sim' : 'Não'}\n` +
                 `👑 Admin: ${userStatus.isAdmin ? 'Sim' : 'Não'}`;

        case 'reset':
          if (args.length < 2) {
            return '❌ Uso: /ratelimit reset [chatId]';
          }
          const resetSuccess = this.rateLimiter.resetUser(args[1]);
          return resetSuccess ? 
            '✅ Limites de rate limiting resetados com sucesso' : 
            '❌ Usuário não encontrado';

        case 'top':
          const topUsers = this.rateLimiter.getTopUsers(5);
          let response = `🏆 **Top 5 Usuários por Mensagens**\n\n`;
          topUsers.forEach((user, index) => {
            response += `${index + 1}. ${user.chatId}\n` +
                       `   📨 ${user.messageCount} msgs | ⚠️ ${user.penalties} pen | ` +
                       `${user.banned ? '🚫' : '✅'} | ${user.isAdmin ? '👑' : '👤'}\n\n`;
          });
          return response;

        case 'config':
          const config = this.rateLimiter.config;
          return `⚙️ **Configuração de Rate Limiting**\n\n` +
                 `📨 Msgs/minuto: ${config.messagesPerMinute}\n` +
                 `📨 Msgs/hora: ${config.messagesPerHour}\n` +
                 `⚡ Burst allowance: ${config.burstAllowance}\n` +
                 `👑 Admin msgs/min: ${config.adminMessagesPerMinute}\n` +
                 `👑 Admin msgs/hora: ${config.adminMessagesPerHour}\n` +
                 `⏰ Duração penalidade: ${config.penaltyDuration / 60000} min\n` +
                 `🚫 Ban longo: ${config.longBanDuration / 60000} min`;

        default:
          return '❌ Subcomando inválido. Use /ratelimit para ver os comandos disponíveis.';
      }
    } catch (error) {
      console.error('Error in ratelimit command:', error);
      return '❌ Erro ao executar comando de rate limiting.';
    }
  }

  /**
   * Enhanced admin command with security features
   */
  async handleEnhancedAdminCommand(args, chatId) {
    try {
      // Enhanced admin validation with security manager
      const securityResult = this.securityManager.validateAdminAccess(chatId, 'admin');
      
      if (!securityResult.allowed) {
        return securityResult.message;
      }

      if (!args || args.length === 0) {
        return `🔧 **Comandos de Administração**\n\n` +
               `• \`/admin auth\` - Gerar código de autenticação\n` +
               `• \`/admin auth [código]\` - Autenticar sessão\n` +
               `• \`/admin logout\` - Encerrar sessão\n` +
               `• \`/admin session\` - Info da sessão atual\n` +
               `• \`/admin stats\` - Estatísticas do sistema\n` +
               `• \`/admin users\` - Lista de usuários ativos\n` +
               `• \`/admin reset [chatId]\` - Reset conversa específica\n` +
               `• \`/admin config\` - Mostrar configuração atual\n` +
               `• \`/admin logs\` - Últimos logs do sistema`;
      }

      const subCommand = args[0].toLowerCase();

      switch (subCommand) {
        case 'auth':
          if (args.length === 1) {
            // Generate auth code
            const code = this.securityManager.generateAuthCode(chatId);
            if (code) {
              return `🔐 **Código de Autenticação**\n\nCódigo: \`${code}\`\n\nUse: \`/admin auth ${code}\`\n\n⏰ Válido por 5 minutos`;
            } else {
              return '❌ Erro ao gerar código de autenticação';
            }
          } else {
            // Authenticate with code
            const result = this.securityManager.authenticateAdmin(chatId, args[1]);
            return result.message;
          }

        case 'logout':
          const loggedOut = this.securityManager.logoutAdmin(chatId);
          return loggedOut ? '🚪 Sessão encerrada com sucesso' : '❌ Nenhuma sessão ativa encontrada';

        case 'session':
          const sessionInfo = this.securityManager.getSessionInfo(chatId);
          if (sessionInfo) {
            const remainingMinutes = Math.ceil(sessionInfo.remainingTime / 60000);
            return `🔐 **Informações da Sessão**\n\n` +
                   `ID: ${sessionInfo.sessionId.substring(0, 8)}...\n` +
                   `Tempo restante: ${remainingMinutes} minutos\n` +
                   `Super Admin: ${sessionInfo.isSuperAdmin ? 'Sim' : 'Não'}`;
          } else {
            return '❌ Nenhuma sessão ativa';
          }
        
        default:
          return '❌ Subcomando não implementado neste módulo. Use o comando handler principal.';
      }
    } catch (error) {
      console.error('Error in enhanced admin command:', error);
      return '❌ Erro ao executar comando administrativo.';
    }
  }
}

module.exports = SecurityCommands;
