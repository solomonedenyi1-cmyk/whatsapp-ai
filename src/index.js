const WhatsAppBot = require('./bot/whatsappBot');
const WeeklyCleanupService = require('./services/weeklyCleanupService');
const config = require('./config/config');

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Main application
class Application {
  constructor() {
    this.bot = null;
    this.weeklyCleanupService = null;
  }

  async start() {
    try {
      console.log('🚀 Starting WhatsApp AI Bot Application...');
      console.log(`📊 Environment: ${config.env.nodeEnv}`);
      console.log(`🤖 Bot Name: ${config.bot.name}`);
      console.log(`🔗 API URL: ${config.yuef.apiUrl}`);
      console.log(`📱 Model: ${config.yuef.modelName}`);
      
      // Initialize bot
      this.bot = new WhatsAppBot();
      await this.bot.initialize();
      
      // Initialize weekly cleanup service with existing services to avoid multiple initializations
      this.weeklyCleanupService = new WeeklyCleanupService(
        this.bot.conversationService,
        this.bot.conversationService.persistenceService
      );
      this.weeklyCleanupService.start();
      
      console.log('✅ Application started successfully!');
      console.log('📱 Waiting for WhatsApp QR code scan...');
      console.log('💡 Tip: Edit src/config/context.js to customize your AI assistant!');
      
    } catch (error) {
      console.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      console.log('🛑 Stopping application...');
      
      if (this.weeklyCleanupService) {
        await this.weeklyCleanupService.shutdown();
      }
      
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
