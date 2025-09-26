# WhatsApp AI Bot - Deployment Guide

This guide provides comprehensive instructions for deploying the WhatsApp AI Bot in production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Production Deployment](#production-deployment)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0 or higher
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: Minimum 1GB free space for logs and data
- **Network**: Stable internet connection for WhatsApp Web and AI API
- **OS**: Windows, macOS, or Linux

### Dependencies

- WhatsApp account with access to WhatsApp Web
- AI API endpoint (or compatible Ollama API)
- Chrome/Chromium browser (for Puppeteer)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/whatsapp-ai.git
cd whatsapp-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# API Configuration
YUEF_API_URL=http://localhost:11434
YUEF_MODEL_NAME=AI
YUEF_TIMEOUT=30000

# Bot Configuration
BOT_MAX_CONTEXT_MESSAGES=20
BOT_MAX_MESSAGE_LENGTH=4096
BOT_DEBUG=false

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_HEADLESS=true
WHATSAPP_DEVTOOLS=false

# Monitoring Configuration
MONITORING_HEALTH_CHECK_INTERVAL=60000
MONITORING_LOG_RETENTION_DAYS=30
MONITORING_ALERT_MEMORY_THRESHOLD=512
MONITORING_ALERT_RESPONSE_TIME_THRESHOLD=5000

# Performance Configuration
PERFORMANCE_CACHE_SIZE=1000
PERFORMANCE_CACHE_TTL=3600000
PERFORMANCE_MEMORY_THRESHOLD=256
PERFORMANCE_RESPONSE_TIME_THRESHOLD=3000
```

## Installation

### Development Installation

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Production Installation

```bash
# Install production dependencies only
npm install --production

# Start in production mode
npm start
```

## Configuration

### 1. AI Configuration (`config.json`)

Edit `config.json` to customize the AI's behavior:

```json
{
  "ai": {
    "identity": {
      "name": "Your AI Assistant",
      "role": "Professional AI Assistant",
      "personality": "Helpful, professional, and knowledgeable"
    },
    "business": {
      "name": "Your Company",
      "description": "Your business description",
      "services": ["Service 1", "Service 2"],
      "contact": {
        "phone": "+1234567890",
        "email": "contact@yourcompany.com",
        "website": "https://yourcompany.com"
      }
    }
  }
}
```

### 2. System Prompt Customization

Customize the AI's system prompt in `config.json`:

```json
{
  "system_prompt": {
    "instructions": {
      "primary": "You are a professional AI assistant...",
      "behavior": "Always be helpful and accurate...",
      "limitations": "If you don't know something, say so..."
    },
    "sections": {
      "identity": "IDENTITY",
      "business": "BUSINESS INFO",
      "capabilities": "CAPABILITIES"
    }
  }
}
```

## Production Deployment

### 1. Process Management with PM2

Install PM2 globally:

```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'whatsapp-ai-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start with PM2:

```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 2. Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs data sessions

# Expose port (if needed)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml


services:
  whatsapp-ai-bot:
    build: .
    container_name: whatsapp-ai-bot
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./sessions:/app/sessions
      - ./config.json:/app/config.json
    environment:
      - NODE_ENV=production
    depends_on:
      - yue-api
    
  yue-api:
    image: ollama/ollama
    container_name: yue-api
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```

Deploy with Docker:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f whatsapp-ai-bot

# Stop
docker-compose down
```

### 3. Systemd Service (Linux)

Create `/etc/systemd/system/whatsapp-ai-bot.service`:

```ini
[Unit]
Description=WhatsApp AI Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/whatsapp-ai
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable whatsapp-ai-bot
sudo systemctl start whatsapp-ai-bot
sudo systemctl status whatsapp-ai-bot
```

## Monitoring and Maintenance

### 1. Health Monitoring

The bot includes comprehensive monitoring features:

- **Health Checks**: Automatic system health monitoring
- **Performance Metrics**: Memory, response time, and cache performance
- **Error Tracking**: Centralized error logging and reporting
- **Alerts**: Automatic alerts for system issues

Access monitoring via WhatsApp commands:
- `/health` - System health check
- `/monitor` - Comprehensive dashboard
- `/performance` - Performance metrics
- `/errors` - Error diagnostics

### 2. Log Management

Logs are stored in the `logs/` directory:

- `monitoring.log` - System monitoring events
- `health.log` - Health check results
- `error.log` - Error logs (if using external logging)

Set up log rotation:

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/whatsapp-ai-bot
```

```
/path/to/whatsapp-ai/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### 3. Data Backup

Important data to backup:

- `config.json` - AI configuration
- `data/` - Conversation and analytics data
- `sessions/` - WhatsApp session data
- `.env` - Environment configuration

Backup script example:

```bash
#!/bin/bash
BACKUP_DIR="/backup/whatsapp-ai-bot"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR/$DATE"

# Backup configuration and data
cp config.json "$BACKUP_DIR/$DATE/"
cp .env "$BACKUP_DIR/$DATE/"
cp -r data/ "$BACKUP_DIR/$DATE/"
cp -r sessions/ "$BACKUP_DIR/$DATE/"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"
rm -rf "$BACKUP_DIR/$DATE"

# Keep only last 7 backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique API keys
- Regularly rotate credentials

### 2. File Permissions

Set appropriate file permissions:

```bash
# Configuration files
chmod 600 .env config.json

# Data directory
chmod 700 data/

# Session directory
chmod 700 sessions/

# Log directory
chmod 755 logs/
```

### 3. Network Security

- Use HTTPS for API endpoints
- Implement rate limiting
- Monitor for unusual activity
- Keep dependencies updated

### 4. Data Privacy

- Regularly clean old conversation data
- Implement data retention policies
- Ensure compliance with privacy regulations
- Monitor data access

## Troubleshooting

### Common Issues

#### 1. WhatsApp Connection Issues

**Problem**: QR code not appearing or connection failing

**Solutions**:
- Check internet connection
- Clear sessions directory: `rm -rf sessions/`
- Ensure Chrome/Chromium is installed
- Check firewall settings

#### 2. AI API Connection Issues

**Problem**: AI responses not working

**Solutions**:
- Verify API URL in `.env`
- Test API endpoint manually
- Check API service status
- Verify model name configuration

#### 3. Memory Issues

**Problem**: High memory usage or crashes

**Solutions**:
- Monitor with `/performance` command
- Increase memory limits in PM2/Docker
- Clear cache: `/cleanup` command
- Check for memory leaks in logs

#### 4. Performance Issues

**Problem**: Slow response times

**Solutions**:
- Check `/performance` metrics
- Optimize cache settings
- Monitor system resources
- Check network latency

### Debug Mode

Enable debug mode for troubleshooting:

```env
BOT_DEBUG=true
```

This provides detailed logging of:
- Message processing
- API calls
- Performance metrics
- Error details

### Log Analysis

Common log patterns to monitor:

```bash
# Check for errors
grep "ERROR" logs/monitoring.log

# Monitor memory usage
grep "Memory" logs/health.log

# Check response times
grep "Response time" logs/monitoring.log

# Monitor API calls
grep "API" logs/monitoring.log
```

### Support

For additional support:

1. Check the [README.md](README.md) for basic usage
2. Review the [PRD.md](PRD.md) for feature documentation
3. Check GitHub issues for known problems
4. Contact support with detailed logs and error messages

## Performance Optimization

### 1. Cache Configuration

Optimize cache settings in `.env`:

```env
PERFORMANCE_CACHE_SIZE=2000
PERFORMANCE_CACHE_TTL=7200000
```

### 2. Memory Management

Monitor and optimize memory usage:

- Use `/performance` command regularly
- Set appropriate memory limits
- Enable automatic cleanup
- Monitor for memory leaks

### 3. Database Optimization

For large deployments:

- Implement database persistence
- Use connection pooling
- Optimize query performance
- Regular maintenance tasks

### 4. Scaling

For high-volume deployments:

- Use load balancers
- Implement horizontal scaling
- Use external caching (Redis)
- Monitor resource usage

## Conclusion

This deployment guide provides comprehensive instructions for deploying the WhatsApp AI Bot in production environments. Follow the security best practices and monitoring guidelines to ensure reliable operation.

For updates and additional documentation, check the project repository and documentation files.
