require('dotenv').config();

const { parseEnvBoolean } = require('../utils/env');

function normalizeWhatsappNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  let normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1).trim();
  }

  if (!normalized) {
    return null;
  }

  if (normalized.includes('@')) {
    return normalized;
  }

  return `${normalized}@c.us`;
}

function parseAdminNumbers(raw) {
  if (typeof raw !== 'string') {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => normalizeWhatsappNumber(entry))
    .filter((entry) => typeof entry === 'string' && entry.length > 0);
}

const config = {
  // Mistral Agents Configuration
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
    agentId: process.env.MISTRAL_AGENT_ID,
    useConversations: parseEnvBoolean(process.env.MISTRAL_USE_CONVERSATIONS, true),
    conversationStore: parseEnvBoolean(process.env.MISTRAL_CONVERSATION_STORE, true),
    conversationHandoffExecution: process.env.MISTRAL_CONVERSATION_HANDOFF_EXECUTION?.trim() || 'server',
    timeout: 0, // No timeout - wait indefinitely
    warningTimeout: 5 * 60 * 1000, // 5 minutes warning
    audioTranscription: {
      enabled: parseEnvBoolean(process.env.MISTRAL_AUDIO_TRANSCRIPTION_ENABLED, true),
      model: process.env.MISTRAL_AUDIO_TRANSCRIPTION_MODEL?.trim() || 'voxtral-mini-latest',
      language: process.env.MISTRAL_AUDIO_TRANSCRIPTION_LANGUAGE?.trim() || null,
    },
  },

  cal: {
    apiKey: process.env.CAL_API_KEY,
    eventTypeId: process.env.CAL_EVENT_TYPE_ID ? Number(process.env.CAL_EVENT_TYPE_ID) : null,
    apiUrl: process.env.CAL_API_URL?.trim() || 'https://api.cal.com',
    apiVersion: process.env.CAL_API_VERSION?.trim() || '2024-08-13',
    defaultTimeZone: process.env.CAL_DEFAULT_TIME_ZONE?.trim() || 'America/Sao_Paulo',
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
    whatsappNumbers: parseAdminNumbers(process.env.ADMIN_WHATSAPP_NUMBER),
    whatsappNumber: normalizeWhatsappNumber(process.env.ADMIN_WHATSAPP_NUMBER) || '551234567890@c.us'
  }
};

module.exports = config;
