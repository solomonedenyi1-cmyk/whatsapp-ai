/**
 * Security Manager Service
 * 
 * Enhanced admin validation and security management
 * Provides multi-layer authentication and authorization
 */

const crypto = require('crypto');

class SecurityManager {
  constructor() {
    this.adminSessions = new Map();
    this.failedAttempts = new Map();
    this.config = {
      maxFailedAttempts: 3,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      sessionDuration: 60 * 60 * 1000, // 1 hour
      requireSessionForSensitive: true,
      sensitiveCommands: [
        'admin', 'sqlite', 'optimize', 'errors', 
        'cleanup', 'monitor', 'performance'
      ]
    };

    this.adminNumbers = new Set();
    this.superAdmins = new Set(); // Super admins with elevated privileges
  }

  /**
   * Set admin and super admin numbers
   */
  setAdminNumbers(adminNumbers, superAdminNumbers = []) {
    this.adminNumbers = new Set(adminNumbers);
    this.superAdmins = new Set(superAdminNumbers);
    console.log(`🔒 Security: ${adminNumbers.length} admins, ${superAdminNumbers.length} super admins configured`);
  }

  /**
   * Enhanced admin validation with session management
   */
  validateAdminAccess(chatId, command, requireSession = false) {
    const result = {
      allowed: false,
      isAdmin: false,
      isSuperAdmin: false,
      hasSession: false,
      message: null,
      requiresAuth: false
    };

    // Check if user is locked out
    if (this.isLockedOut(chatId)) {
      const lockout = this.failedAttempts.get(chatId);
      const remainingTime = Math.ceil((lockout.lockedUntil - Date.now()) / 60000);
      result.message = `🔒 Acesso bloqueado temporariamente. Tente novamente em ${remainingTime} minutos.`;
      return result;
    }

    // Check basic admin status
    result.isAdmin = this.adminNumbers.has(chatId);
    result.isSuperAdmin = this.superAdmins.has(chatId);

    if (!result.isAdmin) {
      this.recordFailedAttempt(chatId, 'not_admin');
      result.message = '❌ Acesso negado. Apenas administradores podem usar este comando.';
      return result;
    }

    // Check if command requires session authentication
    const requiresSession = requireSession || 
      this.config.requireSessionForSensitive && 
      this.config.sensitiveCommands.includes(command);

    if (requiresSession) {
      const session = this.adminSessions.get(chatId);
      result.hasSession = session && session.expiresAt > Date.now();

      if (!result.hasSession) {
        result.requiresAuth = true;
        result.message = '🔐 Este comando requer autenticação. Use `/admin auth <código>` primeiro.';
        return result;
      }

      // Update session activity
      session.lastActivity = Date.now();
    }

    // Super admin only commands
    const superAdminCommands = ['sqlite migrate', 'admin reset', 'optimize toggle'];
    if (superAdminCommands.some(cmd => command.includes(cmd)) && !result.isSuperAdmin) {
      result.message = '🔒 Este comando requer privilégios de super administrador.';
      return result;
    }

    result.allowed = true;
    return result;
  }

  /**
   * Generate authentication code for admin
   */
  generateAuthCode(chatId) {
    if (!this.adminNumbers.has(chatId)) {
      return null;
    }

    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store pending auth
    if (!this.pendingAuth) this.pendingAuth = new Map();
    this.pendingAuth.set(chatId, { code, expiresAt });

    // Cleanup expired codes
    setTimeout(() => {
      if (this.pendingAuth.has(chatId)) {
        const auth = this.pendingAuth.get(chatId);
        if (auth.code === code) {
          this.pendingAuth.delete(chatId);
        }
      }
    }, 5 * 60 * 1000);

    console.log(`🔐 Auth code generated for admin: ${code}`);
    return code;
  }

  /**
   * Authenticate admin with code
   */
  authenticateAdmin(chatId, providedCode) {
    if (!this.adminNumbers.has(chatId)) {
      return { success: false, message: 'Não autorizado' };
    }

    if (!this.pendingAuth || !this.pendingAuth.has(chatId)) {
      return { success: false, message: 'Nenhum código de autenticação pendente. Use `/admin auth` primeiro.' };
    }

    const auth = this.pendingAuth.get(chatId);
    if (Date.now() > auth.expiresAt) {
      this.pendingAuth.delete(chatId);
      return { success: false, message: 'Código expirado. Solicite um novo código.' };
    }

    if (auth.code !== providedCode.toUpperCase()) {
      this.recordFailedAttempt(chatId, 'wrong_code');
      return { success: false, message: 'Código incorreto.' };
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const session = {
      sessionId,
      chatId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionDuration,
      lastActivity: Date.now(),
      isSuperAdmin: this.superAdmins.has(chatId)
    };

    this.adminSessions.set(chatId, session);
    this.pendingAuth.delete(chatId);

    // Clear failed attempts on successful auth
    this.failedAttempts.delete(chatId);

    console.log(`✅ Admin authenticated: ${chatId.substring(0, 10)}...`);
    return { 
      success: true, 
      message: '✅ Autenticação bem-sucedida! Sessão ativa por 1 hora.',
      session: sessionId
    };
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(chatId, reason) {
    let attempts = this.failedAttempts.get(chatId) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    attempts.reason = reason;

    if (attempts.count >= this.config.maxFailedAttempts) {
      attempts.lockedUntil = Date.now() + this.config.lockoutDuration;
      console.log(`🚫 Admin locked out: ${chatId.substring(0, 10)}... (${attempts.count} failed attempts)`);
    }

    this.failedAttempts.set(chatId, attempts);
  }

  /**
   * Check if user is locked out
   */
  isLockedOut(chatId) {
    const attempts = this.failedAttempts.get(chatId);
    return attempts && attempts.lockedUntil && Date.now() < attempts.lockedUntil;
  }

  /**
   * Logout admin (invalidate session)
   */
  logoutAdmin(chatId) {
    const session = this.adminSessions.get(chatId);
    if (session) {
      this.adminSessions.delete(chatId);
      console.log(`🚪 Admin logged out: ${chatId.substring(0, 10)}...`);
      return true;
    }
    return false;
  }

  /**
   * Get admin session info
   */
  getSessionInfo(chatId) {
    const session = this.adminSessions.get(chatId);
    if (!session || session.expiresAt <= Date.now()) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity,
      remainingTime: session.expiresAt - Date.now(),
      isSuperAdmin: session.isSuperAdmin
    };
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const now = Date.now();
    let activeSessions = 0;
    let lockedUsers = 0;
    let totalFailedAttempts = 0;

    // Count active sessions
    for (const session of this.adminSessions.values()) {
      if (session.expiresAt > now) {
        activeSessions++;
      }
    }

    // Count locked users and failed attempts
    for (const attempts of this.failedAttempts.values()) {
      totalFailedAttempts += attempts.count;
      if (attempts.lockedUntil && now < attempts.lockedUntil) {
        lockedUsers++;
      }
    }

    return {
      adminCount: this.adminNumbers.size,
      superAdminCount: this.superAdmins.size,
      activeSessions,
      lockedUsers,
      totalFailedAttempts,
      config: this.config
    };
  }

  /**
   * Cleanup expired sessions and lockouts
   */
  cleanup() {
    const now = Date.now();
    let cleanedSessions = 0;
    let cleanedLockouts = 0;

    // Clean expired sessions
    for (const [chatId, session] of this.adminSessions.entries()) {
      if (session.expiresAt <= now) {
        this.adminSessions.delete(chatId);
        cleanedSessions++;
      }
    }

    // Clean expired lockouts
    for (const [chatId, attempts] of this.failedAttempts.entries()) {
      if (attempts.lockedUntil && now >= attempts.lockedUntil) {
        // Reset failed attempts count after lockout expires
        attempts.count = 0;
        attempts.lockedUntil = 0;
        cleanedLockouts++;
      }
    }

    // Clean expired pending auth codes
    if (this.pendingAuth) {
      for (const [chatId, auth] of this.pendingAuth.entries()) {
        if (now > auth.expiresAt) {
          this.pendingAuth.delete(chatId);
        }
      }
    }

    if (cleanedSessions > 0 || cleanedLockouts > 0) {
      console.log(`🧹 Security cleanup: ${cleanedSessions} sessions, ${cleanedLockouts} lockouts`);
    }
  }

  /**
   * Reset user security status (super admin only)
   */
  resetUserSecurity(chatId, adminChatId) {
    if (!this.superAdmins.has(adminChatId)) {
      return { success: false, message: 'Apenas super administradores podem resetar status de segurança' };
    }

    this.failedAttempts.delete(chatId);
    this.adminSessions.delete(chatId);
    if (this.pendingAuth) {
      this.pendingAuth.delete(chatId);
    }

    console.log(`🔄 Security status reset for user: ${chatId.substring(0, 10)}...`);
    return { success: true, message: 'Status de segurança resetado com sucesso' };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔒 Security configuration updated');
  }

  /**
   * Shutdown security manager
   */
  async shutdown() {
    try {
      this.adminSessions.clear();
      this.failedAttempts.clear();
      if (this.pendingAuth) {
        this.pendingAuth.clear();
      }
      console.log('✅ Security manager shutdown completed');
    } catch (error) {
      console.error('❌ Error during security manager shutdown:', error.message);
    }
  }
}

module.exports = SecurityManager;
