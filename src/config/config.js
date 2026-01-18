require('dotenv').config();
const { validateConfig, validateEnvironment } = require('./validation');

// Validate environment variables
validateEnvironment(process.env);

const config = {
  // Mistral API Configuration
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
    modelName: process.env.MISTRAL_MODEL_NAME || 'mistral-medium-latest',
    timeout: 0, // No timeout - wait indefinitely
    warningTimeout: 5 * 60 * 1000, // 5 minutes warning
    cacheEnabled: process.env.MISTRAL_CACHE_ENABLED !== 'false', // Default: true
    // Agent Configuration
    agentId: process.env.MISTRAL_AGENT_ID || null,
    useAgent: process.env.MISTRAL_USE_AGENT !== 'false', // Default: true
  },

  // Yue-F API Configuration (kept for backward compatibility)
  yuef: {
    apiUrl: process.env.YUE_F_API_URL || 'http://localhost:11434',
    modelName: process.env.YUE_F_MODEL_NAME || 'yue-f',
    timeout: 0, // No timeout - wait indefinitely
    warningTimeout: 5 * 60 * 1000, // 5 minutes warning
  },

  // Bot Configuration
  bot: {
    name: process.env.BOT_NAME || 'WhatsApp AI Bot',
    maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES) || 20,
    messageSplitLength: parseInt(process.env.MESSAGE_SPLIT_LENGTH) || 1500,
  },

  // Environment
  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG === 'true',
  },

  // WhatsApp Configuration
  whatsapp: {
    sessionPath: './session',
    puppeteerOptions: {
      headless: true, // Back to traditional headless mode
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--use-gl=egl',
        '--disable-software-rasterizer',
        '--disable-dev-shm-usage'
      ]
    }
  },

  // Admin Configuration
  admin: {
    whatsappNumber: process.env.ADMIN_WHATSAPP_NUMBER || '551234567890@c.us'
  }
};

// Validate the configuration before exporting
try {
  const validatedConfig = validateConfig(config);
  module.exports = validatedConfig;
} catch (error) {
  console.error('❌ Configuration validation failed. Cannot start application.');
  process.exit(1);
}
