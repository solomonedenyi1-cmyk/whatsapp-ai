/**
 * Monitoring and Logging Service
 * 
 * Provides comprehensive system monitoring, health checks, and logging
 * for the WhatsApp AI Bot system
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class MonitoringService extends EventEmitter {
  constructor(errorHandler, performanceOptimizer) {
    super();

    this.errorHandler = errorHandler;
    this.performanceOptimizer = performanceOptimizer;

    this.logDir = path.join(__dirname, '../../logs');
    this.monitoringLogFile = path.join(this.logDir, 'monitoring.log');
    this.healthLogFile = path.join(this.logDir, 'health.log');

    // Monitoring configuration
    this.config = {
      healthCheckInterval: 60000, // 1 minute
      alertThresholds: {
        memoryUsage: 512, // MB
        responseTime: 5000, // ms
        errorRate: 0.1, // 10%
        diskUsage: 80 // %
      },
      retentionDays: 30
    };

    // System metrics
    this.metrics = {
      systemHealth: 'healthy',
      lastHealthCheck: null,
      alerts: [],
      uptime: process.uptime(),
      startTime: new Date()
    };

    // Component status tracking
    this.componentStatus = {
      whatsappBot: 'unknown',
      mistralAgent: 'unknown',
      persistence: 'unknown',
      errorHandler: 'unknown',
      performanceOptimizer: 'unknown'
    };

    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring system
   */
  async initializeMonitoring() {
    try {
      // Create logs directory
      await fs.mkdir(this.logDir, { recursive: true });

      // Initialize log files
      await this.ensureLogFile(this.monitoringLogFile);
      await this.ensureLogFile(this.healthLogFile);

      // Start health checks
      this.startHealthChecks();

      // Set up performance optimizer listeners
      this.setupPerformanceListeners();

      // Log startup
      await this.logEvent('SYSTEM_START', 'Monitoring service initialized', {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      });

      console.log('📊 Monitoring service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error.message);
    }
  }

  /**
   * Ensure log file exists
   */
  async ensureLogFile(filePath) {
    try {
      await fs.access(filePath);
    } catch (error) {
      await fs.writeFile(filePath, '');
    }
  }

  /**
   * Start health checks
   */
  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log('💓 Health checks started');
  }

  /**
   * Stop health checks
   */
  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      console.log('💓 Health checks stopped');
    }
  }

  /**
   * Setup performance optimizer listeners
   */
  setupPerformanceListeners() {
    if (this.performanceOptimizer) {
      this.performanceOptimizer.on('memoryThresholdExceeded', async (data) => {
        await this.handleAlert('MEMORY_HIGH', `Memory usage exceeded threshold: ${data.usage}MB`, data);
      });

      this.performanceOptimizer.on('responseTimeThresholdExceeded', async (data) => {
        await this.handleAlert('RESPONSE_TIME_HIGH', `Response time exceeded threshold: ${data.responseTime}ms`, data);
      });

      this.performanceOptimizer.on('messageQueueThresholdExceeded', async (data) => {
        await this.handleAlert('QUEUE_SIZE_HIGH', `Message queue size exceeded threshold: ${data.size}`, data);
      });
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      const healthData = {
        timestamp: new Date().toISOString(),
        checks: {}
      };

      // Memory check
      const memUsage = process.memoryUsage();
      const memoryMB = memUsage.heapUsed / 1024 / 1024;
      healthData.checks.memory = {
        status: memoryMB < this.config.alertThresholds.memoryUsage ? 'healthy' : 'warning',
        usage: Math.round(memoryMB),
        threshold: this.config.alertThresholds.memoryUsage
      };

      // Performance check
      if (this.performanceOptimizer) {
        const perfStats = this.performanceOptimizer.getPerformanceStats();
        healthData.checks.performance = {
          status: perfStats.responseTime.average < this.config.alertThresholds.responseTime ? 'healthy' : 'warning',
          avgResponseTime: perfStats.responseTime.average,
          cacheHitRate: perfStats.cache.hitRate,
          queueSize: perfStats.messageQueue.size
        };
      }

      // Error rate check
      if (this.errorHandler) {
        const errorStats = this.errorHandler.getErrorStats();
        const recentErrors = errorStats.recent.filter(
          e => Date.now() - new Date(e.timestamp).getTime() < 5 * 60 * 1000
        );
        const errorRate = recentErrors.length / 100; // Assuming 100 operations in 5 minutes

        healthData.checks.errors = {
          status: errorRate < this.config.alertThresholds.errorRate ? 'healthy' : 'warning',
          recentErrors: recentErrors.length,
          totalErrors: errorStats.total,
          errorRate: Math.round(errorRate * 100) / 100
        };
      }

      // Component status check
      healthData.checks.components = this.componentStatus;

      // Overall health determination
      const allChecks = Object.values(healthData.checks).filter(check => check.status);
      const hasWarnings = allChecks.some(check => check.status === 'warning');
      const hasErrors = allChecks.some(check => check.status === 'error');

      if (hasErrors) {
        this.metrics.systemHealth = 'unhealthy';
      } else if (hasWarnings) {
        this.metrics.systemHealth = 'degraded';
      } else {
        this.metrics.systemHealth = 'healthy';
      }

      this.metrics.lastHealthCheck = healthData.timestamp;

      // Log health check
      await this.logHealthCheck(healthData);

      // Emit health check event
      this.emit('healthCheck', healthData);

      return healthData;

    } catch (error) {
      await this.errorHandler?.handleError(error, {
        component: 'monitoring',
        operation: 'healthCheck'
      });

      this.metrics.systemHealth = 'unhealthy';
      return { error: error.message };
    }
  }

  /**
   * Log health check results
   */
  async logHealthCheck(healthData) {
    const logEntry = `[${healthData.timestamp}] Health Check - Status: ${this.metrics.systemHealth}\n` +
      `Memory: ${healthData.checks.memory?.usage || 'N/A'}MB, ` +
      `Performance: ${healthData.checks.performance?.avgResponseTime || 'N/A'}ms avg, ` +
      `Errors: ${healthData.checks.errors?.recentErrors || 'N/A'} recent\n`;

    await fs.appendFile(this.healthLogFile, logEntry);
  }

  /**
   * Handle alerts
   */
  async handleAlert(type, message, data = {}) {
    const alert = {
      id: this.generateAlertId(),
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.determineAlertSeverity(type),
      data,
      acknowledged: false
    };

    // Add to alerts array
    this.metrics.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-100);
    }

    // Log alert
    await this.logEvent('ALERT', message, { alertType: type, severity: alert.severity, ...data });

    // Emit alert event
    this.emit('alert', alert);

    // Console notification
    const emoji = { low: '💡', medium: '⚠️', high: '🚨', critical: '🔥' };
    console.log(`${emoji[alert.severity]} [${type}] ${message}`);

    return alert;
  }

  /**
   * Determine alert severity
   */
  determineAlertSeverity(type) {
    const severityMap = {
      'MEMORY_HIGH': 'high',
      'RESPONSE_TIME_HIGH': 'medium',
      'QUEUE_SIZE_HIGH': 'medium',
      'ERROR_RATE_HIGH': 'high',
      'COMPONENT_DOWN': 'critical',
      'DISK_SPACE_LOW': 'high',
      'API_CONNECTION_FAILED': 'high'
    };

    return severityMap[type] || 'medium';
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log monitoring events
   */
  async logEvent(type, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      ...data
    };

    const logLine = `[${logEntry.timestamp}] [${type}] ${message}\n`;
    await fs.appendFile(this.monitoringLogFile, logLine);
  }

  /**
   * Update component status
   */
  async updateComponentStatus(component, status, details = {}) {
    const previousStatus = this.componentStatus[component];
    this.componentStatus[component] = status;

    // Log status change
    if (previousStatus !== status) {
      await this.logEvent('COMPONENT_STATUS_CHANGE',
        `${component} status changed from ${previousStatus} to ${status}`,
        { component, previousStatus, newStatus: status, ...details }
      );

      // Generate alert for component failures
      if (status === 'error' || status === 'down') {
        await this.handleAlert('COMPONENT_DOWN', `Component ${component} is ${status}`, {
          component,
          previousStatus,
          ...details
        });
      }
    }

    this.emit('componentStatusChange', { component, status, previousStatus, details });
  }

  /**
   * Get monitoring dashboard data
   */
  async getMonitoringDashboard() {
    const healthCheck = await this.performHealthCheck();
    const performanceStats = this.performanceOptimizer?.getPerformanceStats() || {};
    const errorStats = this.errorHandler?.getErrorStats() || {};

    return {
      timestamp: new Date().toISOString(),
      systemHealth: this.metrics.systemHealth,
      lastHealthCheck: this.metrics.lastHealthCheck,
      uptime: Math.round(process.uptime()),
      startTime: this.metrics.startTime,

      healthChecks: healthCheck.checks || {},

      performance: {
        memory: performanceStats.memory || {},
        responseTime: performanceStats.responseTime || {},
        cache: performanceStats.cache || {},
        messageQueue: performanceStats.messageQueue || {}
      },

      errors: {
        total: errorStats.total || 0,
        recent: errorStats.recent?.length || 0,
        byComponent: errorStats.byComponent || {},
        byType: errorStats.byType || {}
      },

      alerts: {
        total: this.metrics.alerts.length,
        unacknowledged: this.metrics.alerts.filter(a => !a.acknowledged).length,
        recent: this.metrics.alerts.slice(-10)
      },

      components: this.componentStatus
    };
  }

  /**
   * Shutdown monitoring service
   */
  async shutdown() {
    try {
      this.stopHealthChecks();

      await this.logEvent('SYSTEM_SHUTDOWN', 'Monitoring service shutting down', {
        uptime: process.uptime(),
        totalAlerts: this.metrics.alerts.length
      });

      console.log('📊 Monitoring service shutdown complete');
    } catch (error) {
      console.error('❌ Error during monitoring shutdown:', error.message);
    }
  }
}

module.exports = MonitoringService;
