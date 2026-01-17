require('dotenv').config();

const config = {
  // Mistral API Configuration
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
    modelName: process.env.MISTRAL_MODEL_NAME || 'mistral-medium-latest',
    timeout: 0, // No timeout - wait indefinitely
    warningTimeout: 5 * 60 * 1000, // 5 minutes warning
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
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    }
  },

  // Admin Configuration
  admin: {
    whatsappNumber: process.env.ADMIN_WHATSAPP_NUMBER || '551234567890@c.us'
  }
};

module.exports = config;
