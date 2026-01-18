const WhatsAppBot = require('./bot/whatsappBot');
const config = require('./config/config');
const { redactError, redactSecrets } = require('./utils/redact');

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', redactError(error));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', redactSecrets(String(reason)));
  process.exit(1);
});

// Main application
class Application {
  constructor() {
    this.bot = null;
  }

  async start() {
    try {
      console.log('🚀 Starting WhatsApp AI Bot Application...');
      console.log(`📊 Environment: ${config.env.nodeEnv}`);
      console.log(`🤖 Bot Name: ${config.bot.name}`);
      console.log(`🧠 Mistral Agent ID: ${config.mistral.agentId}`);

      if (!config.whatsapp.sessionPath) {
        throw new Error('Missing WHATSAPP_SESSION_PATH configuration.');
      }

      if (!config.mistral.apiKey) {
        throw new Error('Missing MISTRAL_API_KEY in environment.');
      }

      if (!config.mistral.agentId) {
        throw new Error('Missing MISTRAL_AGENT_ID in environment.');
      }

      // Initialize bot
      this.bot = new WhatsAppBot();
      await this.bot.initialize();

      console.log('✅ Application started successfully!');
      console.log('📱 Waiting for WhatsApp QR code scan...');
      console.log('💡 Tip: Edit src/config/context.js to customize your AI assistant!');

    } catch (error) {
      console.error('❌ Failed to start application:', redactError(error));
      process.exit(1);
    }
  }

  async stop() {
    try {
      console.log('🛑 Stopping application...');

      if (this.bot) {
        await this.bot.shutdown();
      }

      console.log('✅ Application stopped successfully');
      process.exit(0);

    } catch (error) {
      console.error('❌ Error stopping application:', error);
      process.exit(1);
    }
  }
}

// Create and start application
const app = new Application();

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await app.stop();
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await app.stop();
});

// Start the application
app.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
