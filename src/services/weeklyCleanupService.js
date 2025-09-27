/**
 * Weekly Cleanup Service
 * 
 * Manages automatic weekly cleanup of old conversations and data
 * Replaces the previous daily cleanup with a more reasonable weekly schedule
 */

const cron = require('node-cron');

class WeeklyCleanupService {
  constructor(conversationService = null, persistenceService = null) {
    // Use provided services or create new ones to avoid multiple initializations
    this.conversationService = conversationService;
    this.persistenceService = persistenceService;
    this.isRunning = false;
    this.lastCleanup = null;
    this.cleanupJob = null;
    
    console.log('🧹 Weekly cleanup service initialized');
  }

  /**
   * Start the weekly cleanup scheduler
   */
  start() {
    try {
      // Schedule cleanup every Sunday at 3 AM
      this.cleanupJob = cron.schedule('0 3 * * 0', async () => {
        await this.runWeeklyCleanup();
      }, {
        scheduled: true,
        timezone: 'America/Sao_Paulo' // GMT-3
      });

      console.log('📅 Weekly cleanup scheduled for Sundays at 3 AM (GMT-3)');
      
      // Check if cleanup is needed on startup
      this.checkCleanupOnStartup();
      
    } catch (error) {
      console.error('❌ Error starting weekly cleanup service:', error);
    }
  }

  /**
   * Stop the weekly cleanup scheduler
   */
  stop() {
    if (this.cleanupJob) {
      this.cleanupJob.destroy();
      this.cleanupJob = null;
      console.log('🛑 Weekly cleanup scheduler stopped');
    }
  }

  /**
   * Check if cleanup is needed on service startup
   */
  async checkCleanupOnStartup() {
    try {
      if (!this.persistenceService) {
        console.log('⏭️ Skipping cleanup check - no persistence service available');
        return;
      }
      
      const shouldCleanup = this.persistenceService.shouldRunWeeklyCleanup();
      
      if (shouldCleanup) {
        console.log('🧹 Running overdue weekly cleanup on startup...');
        await this.runWeeklyCleanup();
      } else {
        console.log('✅ Weekly cleanup is up to date');
      }
    } catch (error) {
      console.error('❌ Error checking cleanup on startup:', error);
    }
  }

  /**
   * Run the weekly cleanup process
   */
  async runWeeklyCleanup() {
    if (this.isRunning) {
      console.log('⏳ Weekly cleanup already in progress, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      this.lastCleanup = new Date().toISOString();
      
      console.log('🧹 Starting weekly cleanup process...');
      
      let conversationsCleanedCount = 0;
      let analyticsCleanedCount = 0;
      
      // Clean old conversations (keep 30 days) - only if service is available
      if (this.conversationService) {
        conversationsCleanedCount = await this.conversationService.cleanupOldData(30);
      }
      
      // Clean old analytics data (keep 90 days for analytics) - only if service is available
      if (this.persistenceService) {
        analyticsCleanedCount = await this.persistenceService.cleanupOldData(90);
        // Mark cleanup as completed
        await this.persistenceService.markCleanupCompleted();
      }
      
      console.log(`✅ Weekly cleanup completed:`);
      console.log(`   📊 Conversations cleaned: ${conversationsCleanedCount}`);
      console.log(`   📈 Analytics cleaned: ${analyticsCleanedCount}`);
      console.log(`   🕒 Next cleanup: Next Sunday at 3 AM`);
      
      return {
        conversationsCleanedCount,
        analyticsCleanedCount,
        completedAt: this.lastCleanup
      };
      
    } catch (error) {
      console.error('❌ Error during weekly cleanup:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Force run cleanup manually (for admin commands)
   */
  async forceCleanup() {
    console.log('🔧 Manual cleanup triggered by admin...');
    return await this.runWeeklyCleanup();
  }

  /**
   * Get cleanup status and statistics
   */
  getCleanupStatus() {
    return {
      isRunning: this.isRunning,
      lastCleanup: this.lastCleanup,
      nextScheduledCleanup: this.getNextCleanupTime(),
      cleanupFrequency: 'Weekly (Sundays at 3 AM GMT-3)'
    };
  }

  /**
   * Get next scheduled cleanup time
   */
  getNextCleanupTime() {
    const now = new Date();
    const nextSunday = new Date(now);
    
    // Calculate days until next Sunday
    const daysUntilSunday = (7 - now.getDay()) % 7;
    if (daysUntilSunday === 0 && now.getHours() >= 3) {
      // If it's Sunday and past 3 AM, schedule for next Sunday
      nextSunday.setDate(now.getDate() + 7);
    } else {
      nextSunday.setDate(now.getDate() + daysUntilSunday);
    }
    
    nextSunday.setHours(3, 0, 0, 0);
    return nextSunday.toISOString();
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    console.log('🛑 Shutting down weekly cleanup service...');
    this.stop();
    
    if (this.isRunning) {
      console.log('⏳ Waiting for current cleanup to complete...');
      // Wait for current cleanup to finish (max 30 seconds)
      let waitTime = 0;
      while (this.isRunning && waitTime < 30000) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitTime += 1000;
      }
    }
    
    console.log('✅ Weekly cleanup service shutdown complete');
  }
}

module.exports = WeeklyCleanupService;
