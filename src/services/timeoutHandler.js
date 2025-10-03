/**
 * Timeout Handler Service
 * 
 * Handles AI response timeouts and sends intermediate messages
 * to maintain user engagement during long processing times
 */

const EventEmitter = require('events');

class TimeoutHandler extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      warningTimeout: 60000, // 60 seconds
      maxTimeout: 120000, // 120 seconds
      checkInterval: 5000 // Check every 5 seconds
    };
    
    this.activeRequests = new Map();
    this.timeoutMessages = [
      "🤔 Estou processando sua solicitação, pode levar mais alguns segundos...",
      "⏳ Ainda estou trabalhando na sua resposta, obrigada pela paciência!",
      "🧠 Analisando sua mensagem com cuidado, quase terminando...",
      "💭 Preparando uma resposta detalhada para você, aguarde mais um momento...",
      "🔄 Processando... Às vezes demoro um pouco para dar a melhor resposta possível!"
    ];
    
    this.startTimeoutMonitoring();
  }

  /**
   * Start monitoring for timeouts
   */
  startTimeoutMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkTimeouts();
    }, this.config.checkInterval);
    
    console.log('⏱️ Timeout monitoring started');
  }

  /**
   * Stop timeout monitoring
   */
  stopTimeoutMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('⏱️ Timeout monitoring stopped');
    }
  }

  /**
   * Register a new AI request
   */
  registerRequest(chatId, requestId, messageText) {
    const request = {
      chatId,
      requestId,
      messageText: messageText.substring(0, 100), // Store first 100 chars for logging
      startTime: Date.now(),
      warningMessageSent: false,
      timeoutMessageSent: false
    };
    
    this.activeRequests.set(requestId, request);
    
    // Set individual timeout for this request and store the timer reference
    const timeoutTimer = setTimeout(() => {
      this.handleMaxTimeout(requestId);
    }, this.config.maxTimeout);
    
    // Store timer reference for cleanup
    request.timeoutTimer = timeoutTimer;
    
    return requestId;
  }

  /**
   * Complete a request (remove from monitoring)
   */
  completeRequest(requestId) {
    const request = this.activeRequests.get(requestId);
    if (request) {
      const duration = Date.now() - request.startTime;
      
      // Clear the timeout timer to prevent memory leak
      if (request.timeoutTimer) {
        clearTimeout(request.timeoutTimer);
        request.timeoutTimer = null;
      }
      
      this.activeRequests.delete(requestId);
      
      // Emit completion event with timing
      this.emit('requestCompleted', {
        requestId,
        chatId: request.chatId,
        duration,
        hadWarning: request.warningMessageSent,
        hadTimeout: request.timeoutMessageSent
      });
      
      return duration;
    }
    return null;
  }

  /**
   * Check for timeouts on active requests
   */
  checkTimeouts() {
    const now = Date.now();
    
    for (const [requestId, request] of this.activeRequests.entries()) {
      const elapsed = now - request.startTime;
      
      // Send warning message at 60 seconds
      if (elapsed >= this.config.warningTimeout && !request.warningMessageSent) {
        this.sendWarningMessage(request);
        request.warningMessageSent = true;
      }
    }
  }

  /**
   * Send warning message to user
   */
  async sendWarningMessage(request) {
    try {
      const message = this.getRandomTimeoutMessage();
      
      this.emit('sendTimeoutMessage', {
        chatId: request.chatId,
        message,
        type: 'warning',
        elapsed: Date.now() - request.startTime
      });
      
      console.log(`⏰ Warning message sent to ${request.chatId} after ${Math.round((Date.now() - request.startTime) / 1000)}s`);
    } catch (error) {
      console.error('❌ Error sending warning message:', error);
    }
  }

  /**
   * Handle maximum timeout (120 seconds)
   */
  async handleMaxTimeout(requestId) {
    const request = this.activeRequests.get(requestId);
    if (!request) return; // Request already completed
    
    try {
      const timeoutMessage = "⏰ Desculpe, a resposta está demorando mais que o esperado. " +
                           "Vou continuar processando em segundo plano e te envio assim que estiver pronta! " +
                           "Enquanto isso, você pode enviar outras mensagens normalmente.";
      
      this.emit('sendTimeoutMessage', {
        chatId: request.chatId,
        message: timeoutMessage,
        type: 'timeout',
        elapsed: Date.now() - request.startTime
      });
      
      request.timeoutMessageSent = true;
      
      console.log(`⏰ Max timeout message sent to ${request.chatId} after ${Math.round((Date.now() - request.startTime) / 1000)}s`);
      
      // Keep request active but mark as timed out
      // The AI response will still be sent when it completes
      
    } catch (error) {
      console.error('❌ Error handling max timeout:', error);
    }
  }

  /**
   * Get random timeout message
   */
  getRandomTimeoutMessage() {
    const randomIndex = Math.floor(Math.random() * this.timeoutMessages.length);
    return this.timeoutMessages[randomIndex];
  }

  /**
   * Get timeout statistics
   */
  getTimeoutStats() {
    const activeCount = this.activeRequests.size;
    const stats = {
      activeRequests: activeCount,
      totalWarnings: 0,
      totalTimeouts: 0,
      averageResponseTime: 0
    };
    
    // Count warnings and timeouts in active requests
    for (const request of this.activeRequests.values()) {
      if (request.warningMessageSent) stats.totalWarnings++;
      if (request.timeoutMessageSent) stats.totalTimeouts++;
    }
    
    return stats;
  }

  /**
   * Update timeout configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Timeout configuration updated:', this.config);
  }

  /**
   * Add custom timeout message
   */
  addTimeoutMessage(message) {
    this.timeoutMessages.push(message);
    console.log('💬 Custom timeout message added');
  }

  /**
   * Get active requests info
   */
  getActiveRequests() {
    const requests = [];
    const now = Date.now();
    
    for (const [requestId, request] of this.activeRequests.entries()) {
      requests.push({
        requestId,
        chatId: request.chatId,
        elapsed: now - request.startTime,
        messagePreview: request.messageText,
        warningMessageSent: request.warningMessageSent,
        timeoutMessageSent: request.timeoutMessageSent
      });
    }
    
    return requests.sort((a, b) => b.elapsed - a.elapsed); // Sort by elapsed time desc
  }

  /**
   * Force complete a request (for emergency cleanup)
   */
  forceCompleteRequest(requestId, reason = 'forced') {
    const request = this.activeRequests.get(requestId);
    if (request) {
      const duration = Date.now() - request.startTime;
      
      // Clear the timeout timer to prevent memory leak
      if (request.timeoutTimer) {
        clearTimeout(request.timeoutTimer);
        request.timeoutTimer = null;
      }
      
      this.activeRequests.delete(requestId);
      
      console.log(`🔧 Request ${requestId} force completed after ${Math.round(duration / 1000)}s - Reason: ${reason}`);
      
      this.emit('requestForceCompleted', {
        requestId,
        chatId: request.chatId,
        duration,
        reason
      });
      
      return true;
    }
    return false;
  }

  /**
   * Cleanup old requests (safety mechanism)
   */
  cleanupOldRequests() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    let cleaned = 0;
    
    for (const [requestId, request] of this.activeRequests.entries()) {
      if (now - request.startTime > maxAge) {
        this.forceCompleteRequest(requestId, 'cleanup_old');
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old timeout requests`);
    }
    
    return cleaned;
  }

  /**
   * Shutdown timeout handler
   */
  async shutdown() {
    try {
      this.stopTimeoutMonitoring();
      
      // Complete all active requests and clear their timers
      const activeCount = this.activeRequests.size;
      for (const requestId of this.activeRequests.keys()) {
        this.forceCompleteRequest(requestId, 'shutdown');
      }
      
      // Remove all event listeners to prevent memory leaks
      this.removeAllListeners();
      
      console.log(`⏱️ Timeout handler shutdown complete (${activeCount} requests completed)`);
    } catch (error) {
      console.error('❌ Error during timeout handler shutdown:', error);
    }
  }
}

module.exports = TimeoutHandler;
