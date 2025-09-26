require('dotenv').config();

const config = {
  // AI API Configuration
  yuef: {
    apiUrl: process.env.AI_API_URL || 'https://api.example-ai.com/v1',
    modelName: process.env.AI_MODEL_NAME || 'llama3.1:8b',
    timeout: parseInt(process.env.API_TIMEOUT) || 30000,
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
