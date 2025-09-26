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
| `YUE_F_API_URL` | Yue-F API URL | `https://llms.yuricunha.com` |
| `YUE_F_MODEL_NAME` | Model name | `yue-f` |
| `API_TIMEOUT` | API timeout (ms) | `30000` |
| `BOT_NAME` | Bot name | `WhatsApp AI Bot` |
| `MAX_CONTEXT_MESSAGES` | Max messages in context | `20` |
| `MESSAGE_SPLIT_LENGTH` | Max message size | `1500` |

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

## 📝 Changelog

### v1.3.0 (September 2025)
- **NEW**: Complete migration of all hardcoded values to `config.json`
- **NEW**: Fully customizable system prompt structure and instructions
- **NEW**: Configurable section headers and prompt formatting
- **NEW**: Advanced template variable system with business/owner name support
- **IMPROVED**: Zero hardcoded values remaining in codebase
- **IMPROVED**: Complete separation of configuration from code logic
- **IMPROVED**: Enhanced customization capabilities for non-developers

### v1.2.0 (September 2025)
- **NEW**: Simplified JSON configuration system (no coding required!)
- **NEW**: Gender identity support with automatic pronoun usage
- **NEW**: User-friendly configuration format for non-developers
- **NEW**: Dynamic template variables in standard responses
- **IMPROVED**: Configuration now in simple `config.json` file
- **IMPROVED**: Better error handling for configuration issues
- **IMPROVED**: Eliminated code duplication between config files
- **FIXED**: Export issues with reloadConfig function
- **FIXED**: Command handler references to use config.json instead of context.js

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
- **Non-Technical Users**: Simple JSON configuration, no coding required!
- **Gender-Inclusive AI**: Supports all gender identities with proper pronouns
