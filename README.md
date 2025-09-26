# WhatsApp AI Bot - Python Edition 🤖

A powerful, intelligent WhatsApp bot built with Python that integrates with multiple AI providers to provide conversational AI capabilities directly through WhatsApp Web.

## ✨ Features

- **🤖 Multi-AI Provider Support**: OpenAI, Anthropic, Ollama, and custom APIs
- **💬 Intelligent Conversations**: Context-aware responses with conversation memory
- **🔧 Rich Command System**: Built-in commands for bot management and analytics
- **👑 Admin Controls**: Secure admin-only commands and user management
- **📊 Analytics & Monitoring**: Comprehensive usage analytics and performance monitoring
- **🐳 Docker Ready**: Full Docker support with multiple deployment options
- **🔒 Security First**: Rate limiting, admin validation, and secure configuration
- **📱 QR Code Authentication**: Terminal QR code display for easy WhatsApp login
- **🔄 Auto-Recovery**: Robust error handling with automatic retry mechanisms
- **📈 Performance Optimization**: Caching, queue processing, and resource monitoring

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- Chrome/Chromium browser
- WhatsApp account
- AI provider API key (OpenAI, Anthropic, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/isyuricunha/whatsapp-ai.git
   cd whatsapp-ai
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Configure business context**
   ```bash
   cp config.example.json config.json
   # Edit config.json with your business information
   ```

5. **Start the bot**
   ```bash
   python -m whatsapp_ai.main start
   ```

6. **Scan QR code**
   - QR code will appear in your terminal
   - Scan it with your WhatsApp mobile app
   - Bot will start processing messages automatically

## 🐳 Docker Deployment

### Option 1: Build from Source (Recommended)

```bash
# Copy configuration files
cp .env.example .env
cp config.example.json config.json

# Edit configuration files with your settings
# Then start with Docker Compose
docker-compose up -d
```

### Option 2: Use Pre-built Image

```bash
# Copy configuration files
cp config.example.json config.json

# Edit configuration and start
docker-compose -f docker-compose.hub.yml up -d
```

### Option 3: Environment File

```bash
# Create and edit .env file
cp .env.example .env
cp config.example.json config.json

# Start with environment file
docker-compose -f docker-compose.env.yml up -d
```

### Docker Commands

```bash
# View logs (QR code will appear here)
docker-compose logs -f whatsapp-ai

# Stop the bot
docker-compose down

# Restart the bot
docker-compose restart

# Update and restart
docker-compose pull && docker-compose up -d
```

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Admin Configuration
ADMIN_WHATSAPP_NUMBER=5511987654321@c.us

# AI Provider (openai, anthropic, ollama, custom)
AI_PROVIDER=openai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Ollama Configuration
OLLAMA_API_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1:8b

# Bot Configuration
BOT_NAME=WhatsApp AI Assistant
DEBUG=false
LOG_LEVEL=INFO
MAX_CONTEXT_MESSAGES=10
RESPONSE_TIMEOUT=30

# System Configuration
DATABASE_TYPE=sqlite
CHROME_HEADLESS=true
CHROME_USER_DATA_DIR=./.chrome_user_data
```

### Business Context (config.json)

The `config.json` file contains your AI assistant's personality, business information, and capabilities:

```json
{
  "ai_identity": {
    "name": "Alex",
    "role": "AI Assistant",
    "personality": "Professional, helpful, and friendly"
  },
  "business_info": {
    "name": "Your Business Name",
    "description": "What your business does",
    "website": "https://yourbusiness.com"
  },
  "capabilities": [
    "Answer questions about your business",
    "Provide customer support",
    "Help with general inquiries"
  ]
}
```

## 🎮 Commands

### User Commands

- `/help` - Show available commands and bot information
- `/about` - Display bot and business information
- `/status` - Check bot status and uptime
- `/reset` - Clear conversation context

### Admin Commands (Admin WhatsApp number only)

- `/admin status` - Detailed bot status and metrics
- `/admin analytics` - Usage analytics and statistics
- `/admin performance` - Performance metrics and monitoring
- `/admin cleanup` - Clean up old data and optimize storage
- `/admin reload` - Reload configuration without restart
- `/admin users` - List active users and statistics
- `/admin errors` - Show recent errors and issues

## 🔧 CLI Commands

```bash
# Start the bot
python -m whatsapp_ai.main start

# Check bot health
python -m whatsapp_ai.main health

# Validate configuration
python -m whatsapp_ai.main config-check

# Clean up old data
python -m whatsapp_ai.main cleanup

# Show version
python -m whatsapp_ai.main version
```

## 🤖 AI Providers

### OpenAI
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4-turbo-preview
```

### Anthropic
```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### Ollama (Local)
```bash
AI_PROVIDER=ollama
OLLAMA_API_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1:8b
```

### Custom API
```bash
AI_PROVIDER=custom
CUSTOM_API_URL=https://your-api.com/v1/chat/completions
CUSTOM_API_KEY=your_key_here
CUSTOM_MODEL=your_model_name
```

## 📊 Monitoring & Analytics

The bot includes comprehensive monitoring and analytics:

- **Message Analytics**: Track message volume, response times, and user engagement
- **Performance Monitoring**: Monitor response times, error rates, and system resources
- **User Analytics**: Track active users, conversation patterns, and command usage
- **Error Tracking**: Automatic error logging and alerting
- **Health Checks**: Built-in health checks for all services

Access analytics through admin commands or check logs for detailed metrics.

## 🔒 Security Features

- **Admin Validation**: Commands restricted to configured admin WhatsApp number
- **Rate Limiting**: Automatic rate limiting to prevent spam
- **Input Sanitization**: All user inputs are sanitized and validated
- **Secure Configuration**: Environment variables for sensitive data
- **Access Control**: Fine-grained permissions for different command levels
- **Audit Logging**: Comprehensive logging of all admin actions

## 🛠️ Development

### Project Structure

```
src/whatsapp_ai/
├── __init__.py              # Package initialization
├── main.py                  # CLI entry point
├── bot.py                   # Main bot class
├── config.py                # Configuration management
├── ai/                      # AI service implementations
│   ├── ai_service.py        # Base AI service
│   ├── openai_service.py    # OpenAI implementation
│   ├── anthropic_service.py # Anthropic implementation
│   ├── ollama_service.py    # Ollama implementation
│   └── custom_service.py    # Custom API implementation
├── whatsapp/                # WhatsApp automation
│   ├── whatsapp_client.py   # WhatsApp Web client
│   └── message_handler.py   # Message processing
└── services/                # Core services
    ├── conversation_service.py  # Conversation management
    ├── command_service.py       # Command handling
    ├── admin_service.py         # Admin controls
    ├── analytics_service.py     # Analytics and metrics
    └── performance_service.py   # Performance monitoring
```

### Running Tests

```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=whatsapp_ai
```

### Code Quality

```bash
# Format code
black src/

# Lint code
flake8 src/

# Type checking
mypy src/
```

## 🐛 Troubleshooting

### Common Issues

**Bot not receiving messages**
- Check if WhatsApp Web is properly connected
- Verify Chrome/Chromium is installed and accessible
- Check logs for authentication errors

**QR code not appearing**
- Ensure terminal supports Unicode characters
- Try running with `PYTHONIOENCODING=utf-8`
- Check if qrcode package is installed

**AI responses not working**
- Verify API keys are correct and have sufficient credits
- Check AI provider status and rate limits
- Review logs for API errors

**Docker issues**
- Ensure config.json exists and is properly mounted
- Check if Chrome can run in headless mode
- Verify shared memory size (shm_size: 2gb)

### Logs

```bash
# View application logs
tail -f logs/whatsapp_ai.log

# View Docker logs
docker-compose logs -f whatsapp-ai

# Enable debug logging
export DEBUG=true
export LOG_LEVEL=DEBUG
```

## 📚 API Reference

### Bot Class

```python
from whatsapp_ai import WhatsAppBot, Config

# Initialize bot
config = Config()
bot = WhatsAppBot(config)

# Start bot
await bot.start()

# Send message
await bot.send_message("5511987654321@c.us", "Hello!")

# Stop bot
await bot.stop()
```

### Configuration

```python
from whatsapp_ai import Config

# Load configuration
config = Config()

# Access settings
print(config.ai_provider)
print(config.admin_whatsapp_number)
print(config.bot_name)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the LGPL2.1 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) for inspiration
- [Selenium](https://selenium.dev/) for web automation
- [OpenAI](https://openai.com/) and [Anthropic](https://anthropic.com/) for AI capabilities
- [Rich](https://rich.readthedocs.io/) for beautiful terminal output

## 📞 Support

- 📧 Email: support@yourbusiness.com
- 💬 WhatsApp: Send a message to your bot!
- 🐛 Issues: [GitHub Issues](https://github.com/isyuricunha/whatsapp-ai/issues)
- 📖 Documentation: [Wiki](https://github.com/isyuricunha/whatsapp-ai/wiki)

---

**Made with ❤️ by [Your Name](https://github.com/isyuricunha)**
