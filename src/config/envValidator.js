/**
 * Environment Variable Validation Service
 * 
 * Validates that all required environment variables are present
 * and have valid values before the application starts
 */

class EnvValidator {
  constructor() {
    this.requiredVars = [
      {
        name: 'YUE_F_API_URL',
        type: 'url',
        description: 'Yue-F API URL'
      },
      {
        name: 'YUE_F_MODEL_NAME',
        type: 'string',
        description: 'Yue-F model name'
      },
      {
        name: 'ADMIN_WHATSAPP_NUMBER',
        type: 'whatsapp_number',
        description: 'Admin WhatsApp number'
      }
    ];

    this.optionalVars = [
      {
        name: 'BOT_NAME',
        type: 'string',
        default: 'WhatsApp AI Bot',
        description: 'Bot display name'
      },
      {
        name: 'MAX_CONTEXT_MESSAGES',
        type: 'number',
        default: 20,
        description: 'Maximum context messages'
      },
      {
        name: 'MESSAGE_SPLIT_LENGTH',
        type: 'number',
        default: 1500,
        description: 'Message split length'
      },
      {
        name: 'NODE_ENV',
        type: 'string',
        default: 'development',
        description: 'Node environment'
      },
      {
        name: 'DEBUG',
        type: 'boolean',
        default: false,
        description: 'Debug mode'
      }
    ];
  }

  /**
   * Validate all environment variables
   * @returns {Object} - Validation result
   */
  validate() {
    const errors = [];
    const warnings = [];
    const validated = {};

    // Check required variables
    for (const varConfig of this.requiredVars) {
      const value = process.env[varConfig.name];
      
      if (!value) {
        errors.push(`Missing required environment variable: ${varConfig.name} (${varConfig.description})`);
        continue;
      }

      const validation = this.validateValue(value, varConfig.type, varConfig.name);
      if (!validation.valid) {
        errors.push(`Invalid ${varConfig.name}: ${validation.error}`);
      } else {
        validated[varConfig.name] = validation.value;
      }
    }

    // Check optional variables and set defaults
    for (const varConfig of this.optionalVars) {
      const value = process.env[varConfig.name];
      
      if (!value) {
        warnings.push(`Using default value for ${varConfig.name}: ${varConfig.default}`);
        validated[varConfig.name] = varConfig.default;
        continue;
      }

      const validation = this.validateValue(value, varConfig.type, varConfig.name);
      if (!validation.valid) {
        warnings.push(`Invalid ${varConfig.name}, using default: ${validation.error}`);
        validated[varConfig.name] = varConfig.default;
      } else {
        validated[varConfig.name] = validation.value;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      values: validated
    };
  }

  /**
   * Validate a single value based on its type
   * @param {string} value - The value to validate
   * @param {string} type - The expected type
   * @param {string} name - Variable name for error messages
   * @returns {Object} - Validation result
   */
  validateValue(value, type, name) {
    switch (type) {
      case 'url':
        return this.validateUrl(value);
      
      case 'string':
        return this.validateString(value);
      
      case 'number':
        return this.validateNumber(value);
      
      case 'boolean':
        return this.validateBoolean(value);
      
      case 'whatsapp_number':
        return this.validateWhatsAppNumber(value);
      
      default:
        return { valid: false, error: `Unknown validation type: ${type}` };
    }
  }

  /**
   * Validate URL format
   */
  validateUrl(value) {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
      }
      return { valid: true, value: value };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Validate string (non-empty)
   */
  validateString(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return { valid: false, error: 'Must be a non-empty string' };
    }
    return { valid: true, value: value.trim() };
  }

  /**
   * Validate number
   */
  validateNumber(value) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) {
      return { valid: false, error: 'Must be a positive number' };
    }
    return { valid: true, value: num };
  }

  /**
   * Validate boolean
   */
  validateBoolean(value) {
    const lowerValue = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
      return { valid: true, value: true };
    }
    if (['false', '0', 'no', 'off'].includes(lowerValue)) {
      return { valid: true, value: false };
    }
    return { valid: false, error: 'Must be true/false, 1/0, yes/no, or on/off' };
  }

  /**
   * Validate WhatsApp number format
   */
  validateWhatsAppNumber(value) {
    // WhatsApp number should be in format: 551234567890@c.us
    const whatsappPattern = /^\d{10,15}@c\.us$/;
    if (!whatsappPattern.test(value)) {
      return { 
        valid: false, 
        error: 'Must be in format: 551234567890@c.us (country code + number + @c.us)' 
      };
    }
    return { valid: true, value: value };
  }

  /**
   * Print validation results to console
   */
  printResults(result) {
    console.log('\n🔍 Environment Variable Validation');
    console.log('=====================================');

    if (result.valid) {
      console.log('✅ All required environment variables are valid!');
    } else {
      console.log('❌ Environment validation failed!');
      console.log('\n🚨 ERRORS:');
      result.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }

    if (result.valid) {
      console.log('\n📋 Configuration Summary:');
      console.log(`   • API URL: ${result.values.YUE_F_API_URL}`);
      console.log(`   • Model: ${result.values.YUE_F_MODEL_NAME}`);
      console.log(`   • Admin: ${result.values.ADMIN_WHATSAPP_NUMBER}`);
      console.log(`   • Environment: ${result.values.NODE_ENV}`);
      console.log(`   • Debug: ${result.values.DEBUG ? 'enabled' : 'disabled'}`);
    }

    console.log('=====================================\n');
  }

  /**
   * Generate example .env file content
   */
  generateExampleEnv() {
    let content = '# WhatsApp AI Bot Environment Configuration\n';
    content += '# Copy this file to .env and fill in your values\n\n';

    content += '# Required Variables\n';
    for (const varConfig of this.requiredVars) {
      content += `# ${varConfig.description}\n`;
      content += `${varConfig.name}=\n\n`;
    }

    content += '# Optional Variables (defaults will be used if not set)\n';
    for (const varConfig of this.optionalVars) {
      content += `# ${varConfig.description} (default: ${varConfig.default})\n`;
      content += `# ${varConfig.name}=${varConfig.default}\n\n`;
    }

    return content;
  }
}

module.exports = EnvValidator;
