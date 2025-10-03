# WhatsApp AI Bot - Yue-F Integration

An intelligent WhatsApp bot integrated with the Yue-F AI model via Ollama API, featuring customizable business context and persona.

### Keep in mind
- All configurations is example only
- You need to configure yor own api/model/configs and a others things

## 🚀 Features

### Core Features
- **Natural Conversations**: Interact with Yue-F AI directly through WhatsApp
- **Business Context**: Customizable AI persona with your business information
- **Advanced Persistence**: Permanent conversation storage with automatic backup
- **Analytics & Reporting**: Comprehensive usage analytics and performance metrics
- **Smart Responses**: Automatic splitting of long messages
- **Familiar Interface**: Uses WhatsApp Web for maximum compatibility

Production Ready Features
- **Comprehensive Error Handling**: Centralized error logging, categorization, and automatic recovery
- **Performance Optimization**: Real-time monitoring, intelligent caching, and resource optimization
- **System Monitoring**: Health checks, component status tracking, and automated alerts
- **Production Logging**: Structured logging with rotation and retention policies
- **Scalability**: Optimized for high-volume production deployments

Performance Optimization Features
- **AI Response Timeout Handling**: Smart timeout notifications (60s warning, 120s timeout) without terminating requests
- **Admin Access Control**: Environment-configured admin restrictions for sensitive commands
- **SQLite Performance**: High-performance database option with 80-90% faster operations
- **Advanced Caching**: Intelligent response caching with 70-90% hit rates
- **Memory Optimization**: Automatic cleanup, garbage collection, and resource management
- **Queue Processing**: Priority-based message processing with batch optimization

## 📋 Prerequisites

- Node.js 18+ installed
- Chrome/Chromium browser
- Stable internet connection
- Access to WhatsApp Web

## 🛠️ Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd whatsapp-ai
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
```bash
cp .env.example .env
```
Edit the `.env` file and set your admin WhatsApp number:
```bash
ADMIN_WHATSAPP_NUMBER=your_number@c.us
```
Replace `your_number@c.us` with your actual WhatsApp number in the format `551234567890@c.us`.

4. **Customize your AI assistant** (Important!):
Edit `config.json` in the root directory to set up your business information:
- AI identity (name, gender, personality)
- Business details (services, products, contact info)
- Owner information and expertise
- FAQ and standard responses

**No coding required!** Just edit the simple JSON file.

5. **Run the bot**:
```bash
npm start
```

6. **Scan the QR Code**:
   - A QR code will appear in the terminal
   - Open WhatsApp on your phone
   - Go to "WhatsApp Settings" > "Linked Devices" > "Link a device"
   - Scan the QR code displayed in the terminal

## 🎮 How to Use

### 📱 Available Commands

**Basic Commands:**
- `/help` - Show available commands and usage tips
- `/status` - Check bot status, API connectivity, and analytics overview
- `/about` - Information about the bot and its capabilities
- `/reset` - Clear conversation history and start fresh

**Context Management:**
- `/context` - View current AI configuration and business context
- `/reload` - Reload AI context from config.json (apply changes without restart)

**Analytics & Data Management:**
- `/analytics` - View detailed conversation analytics and usage reports
- `/cleanup` - Clean up old conversation data (30+ days) to optimize storage

**System Monitoring (Admin Only):**
- `/health` - System health check and component status
- `/monitor` - Comprehensive monitoring dashboard with metrics
- `/performance` - Performance metrics and optimization status
- `/errors` - Error logs and system diagnostics
- `/admin` - Admin command statistics and access control
- `/sqlite` - SQLite performance comparison and migration tools
- `/optimize` - Advanced performance optimization controls

### Business Context Setup

The bot comes with a powerful context system that allows you to create a professional AI assistant:

1. **Edit `config.json`** (in the root directory) to customize:
   - **AI Identity**: Name, gender, role, personality
   - **Business Info**: Company name, services, products, contact info
   - **Owner Details**: Your information and expertise
   - **FAQ**: Common questions and answers
   - **Capabilities**: What the AI can and cannot do

2. **Use `/reload`** command to apply changes without restarting

3. **Use `/context`** to verify current configuration

**Easy Configuration - No Coding Required!**
The configuration is now in simple JSON format that anyone can edit.

### Normal Conversation

Simply send any text message to the bot and it will respond using Yue-F AI with your business context. The bot automatically maintains conversation context.

### Usage Examples

```
User: Hello! How can you help me?
Bot: Hello! I'm Yue, your AI assistant for [Your Company]. I can help with...

User: What services do you offer?
Bot: We offer the following services:
- Service 1: Description (R$ 299, 2 hours)
- Service 2: Description (R$ 599, 1 day)
...

User: /status
Bot: 📊 Bot Status
Yue-F API: ✅ Online
Active conversations: 1
...
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `YUE_F_API_URL` | Yue-F API URL | `http://localhost:11434` |
| `YUE_F_MODEL_NAME` | Model name | `yue-f` |
| `API_TIMEOUT` | API timeout (ms) | `30000` |
| `BOT_NAME` | Bot name | `WhatsApp AI Bot` |
| `MAX_CONTEXT_MESSAGES` | Max messages in context | `20` |
| `MESSAGE_SPLIT_LENGTH` | Max message size | `1500` |
| `ADMIN_WHATSAPP_NUMBER` | Admin WhatsApp number for restricted commands | `551234567890@c.us` |

### Business Context Configuration
```json
{
  "ai_identity": {
    "name": "Yue",
    "gender": "female",
    "role": "AI Assistant", 
    "personality": "friendly, professional, and helpful",
    "language": "Portuguese (Brazilian)",
    "tone": "professional but approachable"
  }
}
```

**Gender Identity Support**: The system automatically uses appropriate pronouns (she/her, he/him, they/them) based on the gender setting.

### Business Information

Configure your business details:

```json
{
  "business": {
    "name": "Your Company Name",
    "description": "Brief description of your business",
    "website": "https://yourwebsite.com",
    "email": "contact@yourcompany.com", 
    "phone": "+55 11 99999-9999",
    "address": "Your business address",
    "working_hours": "Monday to Friday, 9 AM to 6 PM (GMT-3)"
  }
}
```

### Services and Products

Add your offerings:

```json
{
  "services": [
    {
      "name": "Service 1",
      "description": "Description of your service",
      "price": "R$ 299",
      "duration": "2 hours"
    }
  ],
  "products": [
    {
      "name": "Product 1", 
      "description": "Description of your product",
      "price": "R$ 199",
      "availability": "In stock"
    }
  ]
}
```

### Advanced Configuration Options

#### System Prompt Customization

The `system_prompt` section allows complete customization of how the AI generates its personality and responses:

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
      "closing_message": "Remember: You represent {business_name} and {owner_name}. Always provide excellent customer service!"
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

#### Dynamic Template Variables

The configuration supports template variables in various sections:
- `{name}` - Replaced with AI identity name
- `{working_hours}` - Replaced with business working hours
- `{phone}` - Replaced with business phone number
- `{business_name}` - Replaced with business name
- `{owner_name}` - Replaced with owner name

These are automatically processed when the configuration is loaded.

#### Complete Customization

**Everything is now configurable in `config.json`:**
- ✅ AI personality and behavior instructions
- ✅ System prompt section headers and structure
- ✅ Gender pronouns and language rules
- ✅ Business information and context
- ✅ Standard responses and templates
- ✅ Capabilities and limitations
- ✅ FAQ and knowledge base

**No more hardcoded values in the code!** All customization happens through the simple JSON file.

### Advanced Persistence & Analytics

#### Persistent Conversation Storage
- **Automatic Backup**: All conversations are automatically saved to JSON files in the `data/` directory
- **Cross-Session Continuity**: Conversations persist across bot restarts and system reboots
- **Smart Loading**: Conversations are loaded on-demand to optimize memory usage
- **Data Integrity**: Robust error handling and data validation

#### Comprehensive Analytics System
- **Message Tracking**: Records all messages with timestamps and metadata
- **User Analytics**: Tracks user engagement, message counts, and activity patterns
- **Command Usage**: Monitors which commands are most popular
- **Performance Metrics**: Response time tracking and system performance analysis
- **Daily Statistics**: Aggregated daily stats for trend analysis
- **Error Monitoring**: Automatic error tracking and categorization

#### Enhanced Commands
- **`/status`**: Now includes persistence stats and analytics overview
- **`/analytics`**: Detailed 7-day analytics report with charts and insights
- **`/cleanup`**: Automated cleanup of old data (30+ days) for storage optimization

#### Data Management
- **Automatic Cleanup**: Built-in maintenance functions to prevent storage bloat
- **File-Based Storage**: Simple JSON files for easy backup and migration
- **Scalable Architecture**: Designed to handle thousands of conversations efficiently
- **Privacy Focused**: All data stored locally, no external dependencies

### Project Structure

```
whatsapp-ai/
├── src/
│   ├── bot/
│   │   └── whatsappBot.js         # Main bot class
│   ├── commands/
│   │   └── commandHandler.js      # Command handler
│   ├── config/
│   │   ├── config.js             # System configuration
│   │   └── context.js            # AI context & business info
│   ├── services/
│   │   ├── yueApiService.js      # Yue-F API client
│   │   ├── conversationService.js # Context management
│   │   └── messageService.js     # Message processing
│   └── index.js                  # Application entry point
├── .env                          # Environment variables
├── package.json                  # Project dependencies
└── README.md                     # This file
```

## 🔧 Development

### Available Scripts

```bash
npm start      # Start the bot
npm run dev    # Start with nodemon (auto-reload)
```

### Logs and Debug

To enable detailed logs, set `DEBUG=true` in the `.env` file.

### Customizing the AI Assistant

1. **Edit Configuration**: Modify `config.json` to customize the AI's knowledge and personality
2. **Test Changes**: Use `/reload` command to apply changes without restarting
3. **Verify Setup**: Use `/context` command to check current configuration
4. **Monitor Performance**: Use `/status` to check system health

**Configuration Tips:**
- Use simple, clear language in the JSON file
- Add as many services, products, and FAQ items as needed
- The AI will automatically use the correct gender pronouns
- Test your configuration with `/context` before going live


## 🛡️ Security and Privacy

- **Temporary Data**: Conversation context is stored only in memory
- **No Personal Logs**: We don't log users' personal data
- **HTTPS**: All API communication is encrypted
- **Compliance**: Respects WhatsApp Terms of Service
- **Business Data**: Your business information stays in your configuration files

## 🐛 Troubleshooting

### Common Issues

1. **QR Code doesn't appear**:
   - Check if Chrome/Chromium is installed
   - Try running with `DEBUG=true npm start`

2. **Bot doesn't respond**:
   - Check if Yue-F API is online using `/status`
   - Check your internet connection
   - Restart the bot

3. **Authentication error**:
   - Delete the `session/` folder and scan QR code again
   - Make sure WhatsApp Web is not open elsewhere

4. **AI responses seem generic**:
   - Edit `config.json` with your business information
   - Use `/reload` to apply changes
   - Use `/context` to verify configuration

5. **Configuration file errors**:
   - Check that `config.json` has valid JSON syntax
   - Use a JSON validator online if needed
   - The bot will use default settings if config.json has errors

### Error Logs

Logs are displayed in the console. For detailed logs:

```bash
DEBUG=true npm start
```

## 📞 Support

- **Issues**: Open a GitHub issue for technical problems
- **Documentation**: Check this README for common questions
- **API**: Check Yue-F API documentation for connectivity issues
- **Context Setup**: See `config.json` for business configuration examples
- **JSON Help**: Use online JSON validators to check your configuration syntax

## 📄 License

LGPL2v.1 License - see LICENSE file for details.

---

**Developed with ❤️ using Node.js + WhatsApp Web + Yue-F AI**

## 🎯 Perfect for:
- **Business Customer Service**: Set up Yue as your professional assistant
- **Personal Productivity**: AI helper with your specific knowledge base
- **Technical Support**: AI that knows your products and services
- **Sales Assistant**: AI that can provide pricing and product information
- **Non-Technical Users**: Simple JSON configuration, no coding required!
- **Gender-Inclusive AI**: Supports all gender identities with proper pronouns
