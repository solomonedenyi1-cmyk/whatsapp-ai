const Joi = require('joi');

/**
 * Configuration validation schema
 */
const configSchema = Joi.object({
  // Mistral API Configuration
  mistral: Joi.object({
    apiKey: Joi.string()
      .required()
      .min(10)
      .max(100)
      .description('Mistral API key for authentication'),

    modelName: Joi.string()
      .default('mistral-medium-latest')
      .min(3)
      .max(50)
      .description('Mistral AI model name'),

    timeout: Joi.number()
      .integer()
      .min(0)
      .max(300000)
      .default(0)
      .description('API request timeout in milliseconds'),

    warningTimeout: Joi.number()
      .integer()
      .min(1000)
      .max(300000)
      .default(300000)
      .description('Warning timeout in milliseconds before sending user notification'),

    cacheEnabled: Joi.boolean()
      .default(true)
      .description('Enable API response caching'),

    // Agent Configuration
    agentId: Joi.string()
      .pattern(/^ag_[a-zA-Z0-9]{32}$/)
      .allow(null)
      .default(null)
      .description('Mistral Agent ID from console (format: ag_xxxxx...)'),

    useAgent: Joi.boolean()
      .default(true)
      .description('Enable Mistral Agent mode')
  }).required(),

  // Yue-F API Configuration (kept for backward compatibility)
  yuef: Joi.object({
    apiUrl: Joi.string()
      .uri()
      .default('http://localhost:11434')
      .description('Yue-F/Ollama API endpoint URL'),

    modelName: Joi.string()
      .default('yue-f')
      .min(3)
      .max(50)
      .description('Yue-F AI model name'),

    timeout: Joi.number()
      .integer()
      .min(0)
      .max(300000)
      .default(0)
      .description('API request timeout in milliseconds'),

    warningTimeout: Joi.number()
      .integer()
      .min(1000)
      .max(300000)
      .default(300000)
      .description('Warning timeout in milliseconds')
  }),

  // Bot Configuration
  bot: Joi.object({
    name: Joi.string()
      .min(1)
      .max(100)
      .default('WhatsApp AI Bot')
      .description('Display name for the bot'),

    maxContextMessages: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .description('Maximum messages to keep in conversation context'),

    messageSplitLength: Joi.number()
      .integer()
      .min(100)
      .max(5000)
      .default(1500)
      .description('Maximum message length before splitting')
  }),

  // Environment Configuration
  env: Joi.object({
    nodeEnv: Joi.string()
      .valid('development', 'production', 'test', 'staging')
      .default('development')
      .description('Node.js environment'),

    debug: Joi.boolean()
      .default(false)
      .description('Enable debug logging')
  }),

  // WhatsApp Configuration
  whatsapp: Joi.object({
    sessionPath: Joi.string()
      .default('./session')
      .description('Path to store WhatsApp session data'),

    initializationTimeoutMs: Joi.number()
      .integer()
      .min(0)
      .max(600000)
      .default(120000)
      .description('WhatsApp client initialization timeout in milliseconds (0 = no timeout)'),

    qrScanTimeoutMs: Joi.number()
      .integer()
      .min(0)
      .max(3600000)
      .default(0)
      .description('Max time to wait for QR scan when no session exists (0 = no timeout)'),

    autoClearSessionOnAuthFailure: Joi.boolean()
      .default(false)
      .description('Auto clear session data on auth failure before attempting reconnect'),

    puppeteerOptions: Joi.object({
      headless: Joi.alternatives().try(
        Joi.boolean().default(true),
        Joi.string().valid('new').default(true)
      ).description('Headless mode (boolean or "new" for new headless mode)'),
      executablePath: Joi.string().optional().description('Path to Chromium/Chrome executable'),
      args: Joi.array().items(Joi.string()).default([
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ])
    })
  }),

  // Admin Configuration
  admin: Joi.object({
    whatsappNumber: Joi.string()
      .pattern(/^\d+@c\.us$/)
      .default('551234567890@c.us')
      .description('Admin WhatsApp number for command access')
  })
});

/**
 * Validate configuration against schema
 * @param {Object} config - Configuration object to validate
 * @returns {Object} - Validated configuration
 * @throws {Error} - If validation fails
 */
function validateConfig(config) {
  const { value: validatedConfig, error } = configSchema.validate(config, {
    abortEarly: false,
    convert: true,
    allowUnknown: false
  });

  if (error) {
    console.error('❌ Configuration validation failed:');
    error.details.forEach(detail => {
      const path = detail.path.join('.');
      const message = detail.message
        .replace(/["]/g, '')
        .replace('must be', 'must be')
        .replace('must match', 'must match');
      console.error(`  - ${path}: ${message}`);
    });

    throw new Error('Invalid configuration. See errors above.');
  }

  console.log('✅ Configuration validation passed');
  return validatedConfig;
}

/**
 * Validate environment variables
 * @param {Object} env - Environment variables
 */
function validateEnvironment(env) {
  const envSchema = Joi.object({
    MISTRAL_API_KEY: Joi.string()
      .min(10)
      .optional()
      .description('Mistral API key'),

    MISTRAL_MODEL_NAME: Joi.string()
      .min(3)
      .optional()
      .description('Mistral AI model name'),

    MISTRAL_CACHE_ENABLED: Joi.string()
      .valid('true', 'false')
      .optional()
      .description('Enable API response caching'),

    MISTRAL_AGENT_ID: Joi.string()
      .pattern(/^ag_[a-zA-Z0-9]{32}$/)
      .optional()
      .description('Mistral Agent ID (format: ag_xxxxx...)'),

    MISTRAL_USE_AGENT: Joi.string()
      .valid('true', 'false')
      .optional()
      .description('Enable Mistral Agent mode'),

    YUE_F_API_URL: Joi.string()
      .uri()
      .optional()
      .description('Yue-F API URL'),

    YUE_F_MODEL_NAME: Joi.string()
      .min(3)
      .optional()
      .description('Yue-F model name'),

    BOT_NAME: Joi.string()
      .min(1)
      .optional()
      .description('Bot name'),

    MAX_CONTEXT_MESSAGES: Joi.string()
      .pattern(/^\d+$/)
      .optional()
      .description('Maximum context messages'),

    MESSAGE_SPLIT_LENGTH: Joi.string()
      .pattern(/^\d+$/)
      .optional()
      .description('Message split length'),

    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test', 'staging')
      .optional()
      .description('Node environment'),

    DEBUG: Joi.string()
      .valid('true', 'false')
      .optional()
      .description('Debug mode'),

    WHATSAPP_INIT_TIMEOUT_MS: Joi.string()
      .pattern(/^\d+$/)
      .optional()
      .description('WhatsApp initialization timeout in milliseconds'),

    WHATSAPP_QR_TIMEOUT_MS: Joi.string()
      .pattern(/^\d+$/)
      .optional()
      .description('WhatsApp QR scan timeout in milliseconds'),

    WHATSAPP_AUTO_CLEAR_SESSION: Joi.string()
      .valid('true', 'false')
      .optional()
      .description('Auto clear WhatsApp session on auth failure'),

    ADMIN_WHATSAPP_NUMBER: Joi.string()
      .pattern(/^\d+@c\.us$/)
      .optional()
      .description('Admin WhatsApp number')
  });

  const { error } = envSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true
  });

  if (error) {
    console.warn('⚠️  Environment variable warnings:');
    error.details.forEach(detail => {
      const path = detail.path.join('.');
      const message = detail.message.replace(/["]/g, '');
      console.warn(`  - ${path}: ${message}`);
    });
  }
}

module.exports = {
  validateConfig,
  validateEnvironment
};