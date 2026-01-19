# WhatsApp AI Bot

A production-ready WhatsApp AI bot integrated with the Mistral Agents API, featuring comprehensive business context management, advanced monitoring, and enterprise-grade security.

**Important Note**: All configurations provided are examples only. You must configure your own API endpoints, models, business information, and other settings before deployment.

## Features

### Core AI Integration

- **Natural Conversations**: Direct integration with a Mistral Agent (Agent ID)
- **Business Context System**: Fully customizable AI persona with comprehensive business knowledge
- **Conversation Persistence**: Permanent conversation storage with automatic backup and restoration
- **Smart Message Handling**: Automatic message splitting, formatting, and emoji filtering
- **Context Management**: Intelligent conversation context with configurable message limits

### Enterprise Security

- **Admin Access Control**: Role-based command access with WhatsApp number authentication
- **Secure Logging**: Sanitized logs preventing API data exposure and sensitive information leaks
- **Command Protection**: All administrative commands restricted to authorized users only
- **Error Handling**: Comprehensive error management without information disclosure
- **Data Privacy**: Local storage with no external data transmission

### Performance & Monitoring

- **Real-time Monitoring**: System health checks, component status tracking, and performance metrics
- **Advanced Analytics**: Comprehensive usage analytics, command tracking, and user engagement reports
- **Performance Optimization**: Intelligent caching, memory management, and response time optimization
- **Timeout Management**: Smart timeout handling with user notifications for long-running requests
- **SQLite Integration**: High-performance database option for durable conversation storage
- **Resource Management**: Automatic cleanup, garbage collection, and memory optimization

### Production Features

- **Error Recovery**: Automatic error detection, categorization, and recovery mechanisms
- **Health Monitoring**: Continuous system health monitoring with automated alerts
- **Performance Metrics**: Real-time performance tracking with optimization recommendations
- **Data Management**: Automated data cleanup, backup, and retention policies
- **Scalability**: Optimized architecture for high-volume production deployments
- **Queue Processing**: Priority-based message processing with batch optimization

## 📋 Prerequisites

- Node.js 20+ installed
- Chrome/Chromium browser
- Stable internet connection
- Access to WhatsApp Web

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd whatsapp-ai
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```bash
# Mistral Agents Configuration (REQUIRED)
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_AGENT_ID=ag_your_agent_id
# Set to true only if you want to prepend src/config/context.js system prompt to every request
MISTRAL_INCLUDE_LOCAL_SYSTEM_PROMPT=false

# Bot Configuration
BOT_NAME=Your Bot Name
MAX_CONTEXT_MESSAGES=20
MESSAGE_SPLIT_LENGTH=1500

# WhatsApp / Puppeteer
# Where WhatsApp Web auth/session cache will be stored
WHATSAPP_SESSION_PATH=./session
PUPPETEER_HEADLESS=true
# Optional. Useful in servers where chromium path is custom.
PUPPETEER_EXECUTABLE_PATH=

# Admin Configuration (REQUIRED)
ADMIN_WHATSAPP_NUMBER=5511999999999@c.us

# Development
NODE_ENV=production
DEBUG=false
```

**Important**: Replace example values with your actual configuration.

### 4. Business Context Setup

Edit `config.json` in the root directory to customize your AI assistant:

```json
{
  "ai_identity": {
    "name": "Your AI Name",
    "gender": "female",
    "role": "Customer Service Representative",
    "personality": "professional, courteous and helpful",
    "language": "English",
    "tone": "professional and polite, but warm and human"
  },
  "business": {
    "name": "Your Company Name",
    "description": "Your business description",
    "website": "https://yourwebsite.com",
    "email": "contact@yourcompany.com",
    "phone": "+1 555-123-4567",
    "address": "Your business address",
    "working_hours": "Monday to Friday, 9 AM to 5 PM (UTC-5)"
  }
}
```

**No coding required** - just edit the JSON configuration file.

### 5. Start the Bot

```bash
pnpm start
```

### 6. WhatsApp Authentication

1. A QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to Settings > Linked Devices > Link a Device
4. Scan the QR code displayed in the terminal
5. Wait for "WhatsApp bot is ready!" message

## Usage

### Available Commands

**Note**: All commands are admin-only for security. Only the configured admin WhatsApp number can use these commands.

#### Basic Commands

- `/help` - Display available commands and usage instructions
- `/status` - Check bot status, API connectivity, and system overview
- `/about` - Information about the bot and its capabilities
- `/reset` - Clear conversation history for the current chat
- `/clear` - Alias for `/reset`

#### Context Management

- `/context` - View current AI configuration and business context
- `/reload` - Reload AI context from config.json without restarting

#### Analytics & Reporting

- `/analytics` - Detailed conversation analytics and usage reports (7-day period)
- `/cleanup` - Clean up old conversation data (30+ days) to optimize storage

#### System Monitoring

- `/health` - System health check and component status
- `/monitor` - Comprehensive monitoring dashboard with real-time metrics
- `/performance` - Performance metrics, memory usage, and optimization status
- `/errors` - Error logs, diagnostics, and system issues

#### Advanced Administration

- `/admin` - Admin command statistics and access control information
- `/sqlite` - SQLite status and performance information

### Business Context Configuration

The bot features a comprehensive business context system for creating professional AI assistants:

#### Configuration Structure

1. **AI Identity**: Name, gender, role, personality, language, and communication tone
2. **Business Information**: Company details, services, products, contact information
3. **Owner Details**: Your information, expertise, and specialties
4. **FAQ System**: Common questions and standardized answers
5. **Capabilities & Limitations**: What the AI can and cannot do
6. **Standard Responses**: Predefined responses for common scenarios

#### Configuration Management

- **Edit `config.json`** in the root directory to customize all aspects
- **Use `/reload`** command to apply changes without restarting the bot
- **Use `/context`** to verify current configuration and settings
- **No coding required** - all configuration is done through JSON

#### Example Business Configuration

```json
{
  "services": [
    {
      "name": "Website Development",
      "description": "Custom website design and development",
      "price": "$2,500",
      "duration": "2 weeks"
    }
  ],
  "products": [
    {
      "name": "Hosting Package",
      "description": "Managed web hosting with SSL",
      "price": "$29/month",
      "availability": "Available"
    }
  ]
}
```

### Normal Conversations

Users can send regular text messages to interact with the AI assistant. The bot:

- Maintains conversation context across messages
- Responds with business-specific knowledge
- Uses the configured personality and tone
- Automatically handles long messages by splitting them

### Usage Examples

```text
User: Hello! What services do you offer?
AI: Hello! I'm [AI Name], your assistant for [Company]. We offer:
- Website Development: Custom design ($2,500, 2 weeks)
- Hosting Package: Managed hosting ($29/month)
...

User: /status
AI: 📊 Bot Status
    Mistral Agent API: ✅ Connected
    Active conversations: 3
    Total messages: 127
    ...
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
| ---------- | ------------- | ------- | -------- |
| `MISTRAL_API_KEY` | Mistral API key | None | Yes |
| `MISTRAL_AGENT_ID` | Mistral Agent ID (format: ag_...) | None | Yes |
| `MISTRAL_INCLUDE_LOCAL_SYSTEM_PROMPT` | Prepend local system prompt to every request | `false` | No |
| `BOT_NAME` | Display name for the bot | `WhatsApp AI Bot` | No |
| `MAX_CONTEXT_MESSAGES` | Maximum messages to keep in context | `20` | No |
| `MESSAGE_SPLIT_LENGTH` | Maximum length before splitting messages | `1500` | No |
| `WHATSAPP_SESSION_PATH` | Where WhatsApp Web session/auth cache is stored | `./session` | No |
| `PUPPETEER_HEADLESS` | Run browser in headless mode | `true` | No |
| `PUPPETEER_EXECUTABLE_PATH` | Custom Chromium executable path | None | No |
| `ADMIN_WHATSAPP_NUMBER` | Admin WhatsApp number (format: <5511999999999@c.us>) | None | Yes |
| `NODE_ENV` | Environment mode | `development` | No |
| `DEBUG` | Enable debug logging | `false` | No |

### Complete Configuration Structure

The `config.json` file supports comprehensive business configuration:

#### AI Identity Configuration

```json
{
  "ai_identity": {
    "name": "Assistant Name",
    "gender": "female",
    "role": "Customer Service Representative",
    "personality": "professional, courteous and helpful",
    "language": "English",
    "tone": "professional and polite, but warm and human"
  }
}
```

**Gender Pronoun Support**: Automatically uses appropriate pronouns (she/her, he/him, they/them, neutral) based on gender setting.

#### Business Information

```json
{
  "business": {
    "name": "Your Company Name",
    "description": "Complete business description",
    "website": "https://yourwebsite.com",
    "email": "contact@yourcompany.com",
    "phone": "+1 555-123-4567",
    "address": "Your business address",
    "working_hours": "Monday to Friday, 9 AM to 5 PM (UTC-5)"
  }
}
```

#### Services and Products

```json
{
  "services": [
    {
      "name": "Service Name",
      "description": "Detailed service description",
      "price": "$299",
      "duration": "2 hours"
    }
  ],
  "products": [
    {
      "name": "Product Name",
      "description": "Product description",
      "price": "$199",
      "availability": "In stock"
    }
  ]
}
```

#### FAQ and Owner Information

```json
{
  "faq": [
    {
      "question": "What are your payment methods?",
      "answer": "We accept credit cards, PayPal, and bank transfers."
    }
  ],
  "owner": {
    "name": "Your Name",
    "title": "Founder & CEO",
    "bio": "Brief professional biography",
    "experience": "10+ years in the industry",
    "specialties": ["Specialty 1", "Specialty 2"]
  }
}
```

#### Advanced System Prompt Customization

The `system_prompt` section provides complete control over AI behavior:

```json
{
  "system_prompt": {
    "instructions": [
      "Always be helpful, professional, and knowledgeable about the business",
      "Provide accurate information about services, products, and policies",
      "If you don't know something, admit it and offer to connect them with a human",
      "Be proactive in offering relevant services based on customer needs"
    ],
    "sections": {
      "identity_header": "IDENTITY & PERSONALITY:",
      "business_header": "BUSINESS INFORMATION:",
      "services_header": "SERVICES OFFERED:",
      "products_header": "PRODUCTS AVAILABLE:",
      "faq_header": "FREQUENTLY ASKED QUESTIONS:",
      "owner_header": "OWNER INFORMATION:",
      "capabilities_header": "YOUR CAPABILITIES:",
      "limitations_header": "IMPORTANT LIMITATIONS:",
      "instructions_header": "INSTRUCTIONS:",
      "responses_header": "STANDARD RESPONSES:",
      "closing_message": "Remember: You represent {business_name} and {owner_name}!"
    },
    "pronouns": {
      "female": { "subject": "she", "object": "her", "possessive": "her" },
      "male": { "subject": "he", "object": "him", "possessive": "his" },
      "non-binary": { "subject": "they", "object": "them", "possessive": "their" },
      "neutral": { "subject": "they", "object": "them", "possessive": "their" }
    }
  }
}
```

#### Template Variables

Supported template variables for dynamic content:

- `{name}` - AI identity name
- `{working_hours}` - Business working hours
- `{phone}` - Business phone number
- `{business_name}` - Business name
- `{owner_name}` - Owner name

#### Complete Customization Features

- AI personality and behavior instructions
- System prompt structure and headers
- Gender pronouns and language rules
- Business information and context
- Standard responses and templates
- Capabilities and limitations
- FAQ and knowledge base

**All configuration is done through JSON** - no code changes required.

## Architecture

### Project Structure

```text
whatsapp-ai/
├── src/
│   ├── bot/
│   │   └── whatsappBot.js           # Main WhatsApp bot implementation
│   ├── commands/
│   │   └── commandHandler.js        # Command processing and routing
│   ├── config/
│   │   ├── config.js               # System configuration loader
│   │   └── context.js              # Business context and AI prompt generation
│   ├── services/
│   │   ├── mistralAgentService.js  # Mistral Agents API client
│   │   ├── conversationService.js  # Conversation context management
│   │   ├── messageService.js       # Message processing and formatting
│   │   ├── adminService.js         # Admin access control and security
│   │   ├── errorHandler.js         # Centralized error handling
│   │   ├── monitoringService.js    # System monitoring and health checks
│   │   ├── performanceOptimizer.js # Performance optimization
│   │   ├── persistenceService.js   # Data persistence and analytics
│   │   ├── sqliteService.js        # SQLite database integration
│   │   └── timeoutHandler.js       # Request timeout management
│   └── index.js                    # Application entry point
├── data/                           # Persistent data storage (auto-created)
├── session/                        # WhatsApp session data (auto-created)
├── .env                           # Environment configuration
├── config.json                    # Business context configuration
├── package.json                   # Node.js dependencies
└── README.md                      # Documentation
```

### Data Persistence & Analytics

#### Storage System

- **Conversation Persistence**: Automatic backup of all conversations to JSON files
- **Cross-Session Continuity**: Conversations persist across bot restarts
- **On-Demand Loading**: Conversations loaded as needed to optimize memory
- **SQLite Option**: High-performance database alternative (80-90% faster)
- **Data Integrity**: Robust error handling and validation

#### Analytics Features

- **Message Tracking**: Complete message history with timestamps and metadata
- **User Analytics**: Engagement tracking, activity patterns, and usage statistics
- **Command Monitoring**: Popular command tracking and usage analysis
- **Performance Metrics**: Response time analysis and system performance
- **Daily Statistics**: Aggregated daily stats for trend analysis
- **Error Monitoring**: Automatic error categorization and tracking

#### Data Management

- **Automatic Cleanup**: Built-in maintenance for storage optimization
- **Privacy Focused**: All data stored locally, no external transmission
- **Backup Ready**: Simple file-based storage for easy backup and migration
- **Scalable Design**: Handles thousands of conversations efficiently

## Development

### Available Scripts

```bash
pnpm start      # Start the bot in production mode
pnpm dev        # Start with nodemon for development (auto-reload)
pnpm test       # Run unit tests
pnpm run check:secrets  # Scan staged files for accidental secrets before committing
pnpm run hooks:install  # Enable repo git hooks (.githooks) for secret scanning
```

### Git Hooks (Secrets Scan)

This repository includes an optional pre-commit hook that runs a lightweight secrets scan
against staged files.

```bash
pnpm run hooks:install
```

If a secret-like pattern is detected (e.g. `MISTRAL_API_KEY=...`), the commit will be blocked.

### CI

GitHub Actions runs on every Pull Request and on pushes to `main`:

- **Install**: `pnpm install --frozen-lockfile`
- **Test**: `pnpm test`
- **Node versions**: 18 and 20

### Development Workflow

1. **Configuration Changes**: Edit `config.json` for business context modifications
2. **Apply Changes**: Use `/reload` command to apply changes without restarting
3. **Verify Configuration**: Use `/context` command to check current settings
4. **Monitor System**: Use `/health` and `/monitor` commands for system status
5. **Debug Issues**: Enable `DEBUG=true` in `.env` for detailed logging

### Development Tips

- **JSON Validation**: Ensure `config.json` has valid JSON syntax
- **Incremental Testing**: Test configuration changes with `/context` before going live
- **Performance Monitoring**: Use `/performance` to monitor system resources
- **Error Tracking**: Check `/errors` command for system issues
- **Admin Security**: Ensure admin WhatsApp number is correctly configured

### Debugging

#### Enable Debug Mode

```bash
# In .env file
DEBUG=true
NODE_ENV=development
```

#### Common Debug Commands

- `/health` - System component status
- `/errors` - Recent error logs
- `/performance` - Performance metrics
- `/admin status` - Admin configuration status

## Security & Privacy

### Security Features

- **Admin Access Control**: All commands restricted to configured admin WhatsApp numbers
- **Sanitized Logging**: API URLs and sensitive data automatically redacted from logs
- **Secure Error Handling**: Error messages prevent information disclosure
- **Local Data Storage**: All data stored locally, no external transmission
- **Encrypted Communication**: All API communication uses HTTPS
- **WhatsApp Compliance**: Respects WhatsApp Terms of Service

### Privacy Protection

- **No Data Collection**: No personal data sent to external services
- **Local Processing**: All conversation processing happens locally
- **Configurable Retention**: Automatic cleanup of old conversation data
- **User Control**: Users can reset their conversation history anytime
- **Business Data Security**: Business configuration stays in local files

### Security Best Practices

1. **Admin Configuration**: Only add trusted WhatsApp numbers as admins
2. **Environment Security**: Keep `.env` file secure and never commit to version control
3. **API Security**: Use secure API endpoints with proper authentication
4. **Regular Updates**: Keep dependencies updated for security patches
5. **Access Monitoring**: Monitor admin command usage through `/admin` commands

## Troubleshooting

### Common Issues

#### Installation & Setup

##### QR Code doesn't appear

- Ensure Chrome/Chromium is installed
- Check if port 3000 is available
- Run with debug mode: `DEBUG=true pnpm start`
- Verify Node.js version is 20+

##### Bot doesn't respond to messages

- Check API connectivity with `/status` command
- Verify `MISTRAL_API_KEY` and `MISTRAL_AGENT_ID` in `.env` are correct
- Check internet connection stability

##### Authentication failures

- Delete `session/` folder and re-scan QR code
- Ensure WhatsApp Web is not open in other browsers
- Check if WhatsApp account supports linked devices
- Verify phone has stable internet connection

#### Configuration Issues

##### AI responses seem generic

- Edit `config.json` with your business information
- Use `/reload` command to apply changes
- Verify configuration with `/context` command
- Check JSON syntax with online validator

##### Commands not working

- Verify admin WhatsApp number format: `5511999999999@c.us`
- Check if number matches exactly in `.env` file
- Ensure commands start with `/` (forward slash)
- Use `/help` to see available commands

##### Configuration file errors

- Validate JSON syntax using online JSON validator
- Check for missing commas, brackets, or quotes
- Bot uses default configuration if `config.json` has errors
- Check console for specific JSON parsing errors

#### Performance Issues

##### Slow response times

- Check API server performance
- Monitor system resources with `/performance`
- Review error logs with `/errors` command
- Consider enabling SQLite for better performance

##### Memory usage high

- Use `/cleanup` to remove old conversation data
- Check `/monitor` for memory usage statistics
- Restart bot if memory usage is excessive
- Review conversation context limits in configuration

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set in .env file
DEBUG=true
NODE_ENV=development

# Then start the bot
pnpm start
```

### Getting Help

1. **Check System Status**: Use `/health` command for component status
2. **Review Logs**: Enable debug mode and check console output
3. **Validate Configuration**: Use `/context` to verify business setup
4. **Monitor Performance**: Use `/monitor` for system metrics
5. **Check Errors**: Use `/errors` for recent error reports

## Support

### Support Resources

- **Documentation**: This README contains comprehensive setup and usage information
- **Configuration**: Example `config.json` provides complete business setup templates
- **Troubleshooting**: See troubleshooting section for common issues and solutions
- **System Monitoring**: Use built-in commands (`/health`, `/monitor`, `/errors`) for diagnostics

### Technical Support

- **GitHub Issues**: Report bugs and technical problems through GitHub issues
- **API Documentation**: Consult Mistral API documentation for API-related issues
- **JSON Validation**: Use online JSON validators to verify configuration syntax
- **Community**: Check existing issues and discussions for similar problems

### Self-Diagnosis Tools

- `/health` - Complete system health check
- `/status` - Bot and API connectivity status
- `/errors` - Recent error logs and diagnostics
- `/performance` - System performance metrics
- `/admin status` - Admin configuration verification

## License

LGPL-2.1 License - see LICENSE file for details.

---

### Developed with ❤️ using Node.js + WhatsApp Web + Mistral Agents API

## Use Cases

### Business Applications

- **Customer Service**: 24/7 automated customer support with business-specific knowledge
- **Sales Assistant**: Product information, pricing, and service details
- **Technical Support**: AI assistant with your product and service expertise
- **Lead Generation**: Capture and qualify leads through natural conversations
- **FAQ Automation**: Automated responses to frequently asked questions

### Features for Different Users

- **Business Owners**: Complete business context integration with no coding required
- **Developers**: Comprehensive API integration with monitoring and analytics
- **System Administrators**: Advanced monitoring, performance optimization, and security controls
- **Non-Technical Users**: Simple JSON configuration for complete customization
- **Enterprise Users**: Production-ready features with security and compliance

### Technical Capabilities

- **Multi-Language Support**: Configurable language and communication tone
- **Gender-Inclusive AI**: Proper pronoun usage for all gender identities
- **Scalable Architecture**: Handles high-volume conversations efficiently
- **Performance Monitoring**: Real-time system monitoring and optimization
- **Security-First Design**: Admin controls and secure data handling

---

### Built with Node.js, WhatsApp Web.js, and Mistral Agents API integration

---

Code made without AI.
