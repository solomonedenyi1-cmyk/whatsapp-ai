# WhatsApp AI Bot - Yue-F Integration

An intelligent WhatsApp bot integrated with the Yue-F AI model via Ollama API, featuring customizable business context and persona.

## 🚀 Features

- **Natural Conversations**: Interact with Yue-F AI directly through WhatsApp
- **Business Context**: Customizable AI persona with your business information
- **Persistent Context**: Maintains conversation history for more relevant responses
- **Useful Commands**: Command system to control the bot and manage context
- **Smart Responses**: Automatic splitting of long messages
- **Familiar Interface**: Uses WhatsApp Web for maximum compatibility

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
Edit the `.env` file if needed (default settings should work).

4. **Customize your AI assistant** (Important!):
Edit `src/config/context.js` to set up your business information:
- Business name, services, and products
- AI assistant name and personality
- Owner information and expertise
- FAQ and standard responses

5. **Run the bot**:
```bash
npm start
```

6. **Scan the QR Code**:
   - A QR code will appear in the terminal
   - Open WhatsApp on your phone
   - Go to "Linked Devices" > "Link a device"
   - Scan the QR code displayed in the terminal

## 🎮 How to Use

### Available Commands

- `/help` - Show list of available commands
- `/reset` - Clear current conversation history
- `/status` - Check bot and API status
- `/about` - Information about the bot
- `/context` - Show current AI context/persona
- `/reload` - Reload AI context configuration

### Business Context Setup

The bot comes with a powerful context system that allows you to create a professional AI assistant:

1. **Edit `src/config/context.js`** to customize:
   - **Identity**: AI name, role, personality
   - **Business Info**: Company name, services, products, contact info
   - **Owner Details**: Your information and expertise
   - **FAQ**: Common questions and answers
   - **Capabilities**: What the AI can and cannot do

2. **Use `/reload`** command to apply changes without restarting

3. **Use `/context`** to verify current configuration

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
| `YUE_F_API_URL` | Yue-F API URL | `https://llms.yuricunha.com` |
| `YUE_F_MODEL_NAME` | Model name | `yue-f` |
| `API_TIMEOUT` | API timeout (ms) | `30000` |
| `BOT_NAME` | Bot name | `WhatsApp AI Bot` |
| `MAX_CONTEXT_MESSAGES` | Max messages in context | `20` |
| `MESSAGE_SPLIT_LENGTH` | Max message size | `1500` |

### Business Context Configuration

The most important configuration is in `src/config/context.js`. This file defines:

- **AI Identity**: Name, role, personality, communication style
- **Business Information**: Company details, services, products, contact info
- **Owner Profile**: Your information, expertise, and background
- **FAQ Database**: Pre-configured answers to common questions
- **Capabilities & Limitations**: What the AI can and cannot do

**Example customization:**
```javascript
const businessContext = {
  identity: {
    name: "Yue",
    role: "Customer Service AI Assistant",
    personality: "Professional, helpful, and knowledgeable"
  },
  business: {
    name: "Tech Solutions Inc",
    description: "We provide innovative tech solutions for businesses",
    services: [
      {
        name: "Web Development",
        description: "Custom websites and web applications",
        price: "R$ 2,999",
        duration: "2-4 weeks"
      }
    ]
  }
};
```

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

1. **Edit Context**: Modify `src/config/context.js` to customize the AI's knowledge and personality
2. **Test Changes**: Use `/reload` command to apply changes without restarting
3. **Verify Setup**: Use `/context` command to check current configuration
4. **Monitor Performance**: Use `/status` to check system health

## 📊 Implementation Status

### ✅ Phase 1 - Core Functionality (Completed)
- [x] Basic WhatsApp connection
- [x] Yue-F API integration (Ollama compatible)
- [x] Message echo functionality
- [x] Basic error handling
- [x] Basic command system
- [x] Conversation context management

### ✅ Phase 1.5 - Business Context System (Completed)
- [x] Customizable AI persona and business context
- [x] Dynamic context loading and reloading
- [x] Business information integration (services, products, FAQ)
- [x] Context management commands (/context, /reload)
- [x] Professional assistant capabilities

### 🔄 Next Phases
- [ ] Advanced context system with persistence
- [ ] Typing indicators
- [ ] Smart message splitting
- [ ] Advanced monitoring and logs
- [ ] Automated testing
- [ ] Production deployment

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
   - Edit `src/config/context.js` with your business information
   - Use `/reload` to apply changes
   - Use `/context` to verify configuration

### Error Logs

Logs are displayed in the console. For detailed logs:

```bash
DEBUG=true npm start
```

## 📞 Support

- **Issues**: Open a GitHub issue for technical problems
- **Documentation**: Check this README for common questions
- **API**: Check Yue-F API documentation for connectivity issues
- **Context Setup**: See `src/config/context.js` for business configuration examples

## 📝 Changelog

### v1.1.0 (September 2025)
- **NEW**: Business context system for professional AI assistants
- **NEW**: Customizable AI persona and knowledge base
- **NEW**: `/context` and `/reload` commands for context management
- **NEW**: Dynamic business information integration
- **IMPROVED**: All content converted to English
- **IMPROVED**: Enhanced command system with context features

### v1.0.0 (September 2025)
- Initial Phase 1 implementation
- Basic WhatsApp Web connection
- Yue-F API integration via Ollama
- Basic command system
- Conversation context management
- Basic error handling

## 📄 License

MIT License - see LICENSE file for details.

---

**Developed with ❤️ using Node.js + WhatsApp Web + Yue-F AI**

## 🎯 Perfect for:
- **Business Customer Service**: Set up Yue as your professional assistant
- **Personal Productivity**: AI helper with your specific knowledge base
- **Technical Support**: AI that knows your products and services
- **Sales Assistant**: AI that can provide pricing and product information
