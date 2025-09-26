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
    sessionPath: './.wwebjs_auth',
    puppeteerOptions: {
      headless: 'new', // Use new headless mode for better stability
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-breakpad',
        '--disable-features=TranslateUI',
        '--disable-features=BlinkGenPropertyTrees',
        '--run-all-compositor-stages-before-draw',
        '--memory-pressure-off',
        '--max_old_space_size=4096',
        '--virtual-time-budget=5000',
        '--disable-software-rasterizer',
        '--disable-background-media-suspend',
        '--no-crash-upload',
        '--disable-crash-reporter',
        '--disable-in-process-stack-traces',
        '--disable-logging',
        '--disable-dev-tools',
        '--disable-background-mode',
        '--force-device-scale-factor=1',
        `--user-data-dir=/tmp/chrome-user-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'win32' ? undefined : '/usr/bin/google-chrome-stable'),
      ignoreDefaultArgs: ['--disable-extensions'],
      defaultViewport: null,
      devtools: false,
      timeout: 60000,
      protocolTimeout: 60000,
      slowMo: 0
    }
  },

  // Admin Configuration
  admin: {
    whatsappNumber: process.env.ADMIN_WHATSAPP_NUMBER || '551234567890@c.us'
  }
};

module.exports = config;
