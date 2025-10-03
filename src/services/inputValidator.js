/**
 * Input Validation and Sanitization Service
 * 
 * Protects against injection attacks and malicious inputs
 * while preserving natural conversation flow
 */

class InputValidator {
  constructor() {
    this.config = {
      maxMessageLength: 4000,
      maxCommandArgs: 10,
      allowedCommands: [
        'help', 'status', 'about', 'reset', 'context', 'reload', 
        'analytics', 'cleanup', 'health', 'monitor', 'performance', 
        'errors', 'admin', 'sqlite', 'optimize'
      ]
    };

    // Dangerous patterns that should be blocked
    this.dangerousPatterns = [
      // Script injection attempts
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /'.*?(\bOR\b|\bAND\b).*?'/gi,
      
      // Command injection
      /[;&|`$(){}[\]]/g,
      /\b(eval|exec|system|shell_exec|passthru)\s*\(/gi,
      
      // Path traversal
      /\.\.[\/\\]/g,
      /\/etc\/passwd/gi,
      /\/proc\/self\/environ/gi,
      
      // XSS patterns
      /&lt;script/gi,
      /&gt;script/gi,
      /&#x3C;script/gi,
      
      // Excessive special characters (potential encoding attacks)
      /[%]{3,}/g,
      /[\\]{3,}/g
    ];

    // Suspicious but not necessarily dangerous patterns
    this.suspiciousPatterns = [
      /\b(password|senha|token|key|secret|admin|root)\b/gi,
      /\b(hack|exploit|inject|bypass|crack)\b/gi,
      /[<>]{3,}/g,
      /[{}]{3,}/g
    ];
  }

  /**
   * Validate and sanitize user message
   */
  validateMessage(message, chatId) {
    const result = {
      isValid: true,
      sanitized: message,
      warnings: [],
      blocked: false,
      reason: null
    };

    // Basic validation
    if (!message || typeof message !== 'string') {
      result.isValid = false;
      result.blocked = true;
      result.reason = 'Invalid message format';
      return result;
    }

    // Length validation
    if (message.length > this.config.maxMessageLength) {
      result.isValid = false;
      result.blocked = true;
      result.reason = `Message too long (${message.length}/${this.config.maxMessageLength} chars)`;
      return result;
    }

    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(message)) {
        result.isValid = false;
        result.blocked = true;
        result.reason = 'Potentially malicious content detected';
        this.logSecurityEvent('BLOCKED', chatId, message, 'dangerous_pattern');
        return result;
      }
    }

    // Check for suspicious patterns (warn but don't block)
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(message)) {
        result.warnings.push('Suspicious content detected');
        this.logSecurityEvent('SUSPICIOUS', chatId, message, 'suspicious_pattern');
        break;
      }
    }

    // Sanitize the message
    result.sanitized = this.sanitizeMessage(message);

    return result;
  }

  /**
   * Validate command input
   */
  validateCommand(command, args, chatId) {
    const result = {
      isValid: true,
      command: command.toLowerCase().trim(),
      args: [],
      warnings: [],
      blocked: false,
      reason: null
    };

    // Validate command name
    if (!this.config.allowedCommands.includes(result.command)) {
      result.isValid = false;
      result.blocked = true;
      result.reason = `Unknown command: ${command}`;
      return result;
    }

    // Validate arguments
    if (args && Array.isArray(args)) {
      if (args.length > this.config.maxCommandArgs) {
        result.isValid = false;
        result.blocked = true;
        result.reason = `Too many arguments (${args.length}/${this.config.maxCommandArgs})`;
        return result;
      }

      // Sanitize each argument
      for (const arg of args) {
        const sanitized = this.sanitizeCommandArg(arg);
        if (sanitized !== null) {
          result.args.push(sanitized);
        } else {
          result.warnings.push(`Invalid argument filtered: ${arg}`);
          this.logSecurityEvent('FILTERED', chatId, arg, 'invalid_command_arg');
        }
      }
    }

    return result;
  }

  /**
   * Sanitize message content
   */
  sanitizeMessage(message) {
    let sanitized = message;

    // Remove null bytes and control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Remove potentially dangerous HTML entities
    sanitized = sanitized.replace(/&[#\w]+;/g, '');

    // Limit consecutive special characters
    sanitized = sanitized.replace(/([!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])\1{4,}/g, '$1$1$1');

    return sanitized;
  }

  /**
   * Sanitize command argument
   */
  sanitizeCommandArg(arg) {
    if (!arg || typeof arg !== 'string') {
      return null;
    }

    let sanitized = arg.trim();

    // Remove dangerous characters from command args
    sanitized = sanitized.replace(/[;&|`$(){}[\]<>]/g, '');

    // Remove path traversal attempts
    sanitized = sanitized.replace(/\.\.[\/\\]/g, '');

    // Limit length
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    // Return null if completely sanitized away
    if (sanitized.length === 0) {
      return null;
    }

    return sanitized;
  }

  /**
   * Check if input contains potential injection attempts
   */
  detectInjectionAttempt(input) {
    const injectionPatterns = [
      // SQL injection
      /('|(\\')|(;)|(\\;)|(\|)|(\*)|(%27)|(%3D)|(%3B)|(%7C)|(%2A)/gi,
      
      // NoSQL injection
      /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/gi,
      
      // Command injection
      /(;|\||&|`|\$\(|\${)/g,
      
      // LDAP injection
      /(\*|\(|\)|\\|\/|\+|=|<|>|;|,|")/g,
      
      // XPath injection
      /('|"|\/\/|\[|\]|\(|\)|@)/g
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(input)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Log security events
   */
  logSecurityEvent(level, chatId, content, type) {
    const event = {
      timestamp: new Date().toISOString(),
      level,
      chatId: chatId ? chatId.substring(0, 10) + '...' : 'unknown', // Partial ID for privacy
      type,
      contentLength: content ? content.length : 0,
      contentPreview: content ? content.substring(0, 50) + '...' : 'N/A'
    };

    console.log(`🔒 [SECURITY-${level}] ${type} from ${event.chatId}: ${event.contentPreview}`);

    // In production, you might want to send this to a security monitoring system
    // this.sendToSecurityMonitoring(event);
  }

  /**
   * Get validation statistics
   */
  getStats() {
    return {
      maxMessageLength: this.config.maxMessageLength,
      maxCommandArgs: this.config.maxCommandArgs,
      allowedCommands: this.config.allowedCommands.length,
      dangerousPatterns: this.dangerousPatterns.length,
      suspiciousPatterns: this.suspiciousPatterns.length
    };
  }

  /**
   * Update validation configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔒 Input validator configuration updated');
  }

  /**
   * Add custom dangerous pattern
   */
  addDangerousPattern(pattern) {
    if (pattern instanceof RegExp) {
      this.dangerousPatterns.push(pattern);
      console.log('🔒 Added custom dangerous pattern');
    }
  }

  /**
   * Test input against all validation rules
   */
  testInput(input) {
    const results = {
      dangerous: false,
      suspicious: false,
      injectionAttempt: false,
      patterns: []
    };

    // Test dangerous patterns
    for (let i = 0; i < this.dangerousPatterns.length; i++) {
      if (this.dangerousPatterns[i].test(input)) {
        results.dangerous = true;
        results.patterns.push(`dangerous_${i}`);
      }
    }

    // Test suspicious patterns
    for (let i = 0; i < this.suspiciousPatterns.length; i++) {
      if (this.suspiciousPatterns[i].test(input)) {
        results.suspicious = true;
        results.patterns.push(`suspicious_${i}`);
      }
    }

    // Test injection detection
    results.injectionAttempt = this.detectInjectionAttempt(input);

    return results;
  }
}

module.exports = InputValidator;
