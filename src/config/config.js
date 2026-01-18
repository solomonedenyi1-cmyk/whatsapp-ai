require('dotenv').config();

const { parseEnvBoolean } = require('../utils/env');

const config = {
  // Mistral Agents Configuration
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
    agentId: process.env.MISTRAL_AGENT_ID,
    includeLocalSystemPrompt: parseEnvBoolean(process.env.MISTRAL_INCLUDE_LOCAL_SYSTEM_PROMPT, false),
    timeout: 0, // No timeout - wait indefinitely
    warningTimeout: 5 * 60 * 1000, // 5 minutes warning
  },

  cal: {
    apiKey: process.env.CAL_API_KEY,
    eventTypeId: process.env.CAL_EVENT_TYPE_ID ? Number(process.env.CAL_EVENT_TYPE_ID) : null,
    apiUrl: process.env.CAL_API_URL || 'https://api.cal.com',
    apiVersion: process.env.CAL_API_VERSION || '2024-08-13',
    defaultTimeZone: process.env.CAL_DEFAULT_TIME_ZONE || 'America/Sao_Paulo',
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromName: process.env.RESEND_FROM_NAME,
    fromEmail: process.env.RESEND_FROM_EMAIL,
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
    debug: parseEnvBoolean(process.env.DEBUG, false),
  },

  // WhatsApp Configuration
  whatsapp: {
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './session',
    puppeteerOptions: {
      headless: parseEnvBoolean(process.env.PUPPETEER_HEADLESS, true),
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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
