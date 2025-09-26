# WhatsApp AI Bot - Product Requirements Document (PRD)

## 📋 Executive Summary
This document outlines the requirements for developing a WhatsApp Bot integrated with the Yue-F AI model via API. The bot will serve as an intelligent assistant that can engage in natural conversations through WhatsApp, leveraging the Yue-F language model hosted at https://llms.yuricunha.com.

## 🎯 Product Overview

### Vision
To create a seamless conversational AI experience within WhatsApp, allowing users to interact with the Yue-F model through a familiar messaging interface.

### Goals
- Provide 24/7 AI-powered assistance through WhatsApp
- Maintain conversation context across interactions
- Offer a reliable, user-friendly interface for AI interactions
- Enable easy deployment and maintenance

### Success Metrics
- Message response rate > 95%
- Average response time < 10 seconds
- User retention rate > 70% after first week
- System uptime > 99.5%

## 👥 Target Users

### Primary Users
- Individual users seeking AI assistance
- Small business owners wanting automated customer support
- Developers testing AI integrations
- Personal productivity enthusiasts

### Use Cases
- **General Q&A**: Users ask questions and receive intelligent responses
- **Casual Conversation**: Natural dialogue with the AI assistant
- **Problem Solving**: Getting help with various tasks and challenges
- **Information Retrieval**: Quick access to AI-generated information

## ✨ Core Features

### 6. Business Context System
**Priority**: P0 (Critical) - **UPDATED in v1.2**

**Requirements**:
- [x] Customizable AI persona and identity with gender support
- [x] Business information integration (services, products, contact info)
- [x] Owner/founder profile integration
- [x] FAQ database for common questions
- [x] Dynamic context loading and reloading
- [x] Context management commands
- [x] Simplified JSON configuration for non-developers
- [x] Gender identity support with automatic pronoun usage

**Context Configuration**:
- AI Identity: Name, gender, role, personality, communication style
- Business Info: Company details, services, products, pricing
- Owner Profile: Personal information, expertise, background
- FAQ Database: Pre-configured answers to common questions
- Capabilities & Limitations: What the AI can and cannot do
- Gender Support: Female, male, non-binary, neutral with appropriate pronouns

**Acceptance Criteria**:
- [x] Context is loaded from simple config.json file
- [x] AI responds with business-specific knowledge
- [x] Context can be reloaded without restart (/reload command)
- [x] Current context can be viewed (/context command)
- [x] Professional assistant behavior with business context
- [x] Automatic gender pronoun usage (she/her, he/him, they/them)
- [x] User-friendly configuration requiring no coding knowledge

## ✨ Core Features

### 1. Message Processing
**Priority**: P0 (Critical)

**Requirements**:
- [x] Receive and process text messages from WhatsApp users
- [x] Handle messages in real-time with minimal latency
- [x] Support UTF-8 encoding for international characters
- [x] Filter out irrelevant messages (status updates, own messages)

**Acceptance Criteria**:
- [x] Bot receives all text messages sent to it
- [x] Messages are processed within 2 seconds of receipt
- [x] International characters display correctly
- [x] Bot ignores its own messages and status broadcasts

### 2. AI Integration
**Priority**: P0 (Critical)

**Requirements**:
- [x] Connect to Yue-F API at https://llms.yuricunha.com
- [x] Must be compatible with Ollama API format (since Yue-F runs on Ollama)
- [x] Send user messages to the AI model
- [x] Receive and process AI responses
- [x] Handle API failures gracefully

**API Specifications (Ollama Compatible)**:
```json
POST /api/chat
{
  "model": "yue-f",
  "messages": [
    {"role": "user", "content": "user message"}
  ],
  "stream": false
}
```

**Acceptance Criteria**:
- [x] Successfully connects to Yue-F API
- [x] Sends properly formatted Ollama-compatible requests
- [x] Correctly parses Ollama API responses
- [x] Handles API timeouts (30s max)
- [x] Provides fallback responses on API failure
- [x] Compatible with Ollama's chat completion endpoint

### 3. Conversation Context
**Priority**: P1 (High)

**Requirements**:
- [x] Maintain conversation history per user/group
- [x] Include relevant context in API requests
- [x] Limit context size to prevent performance issues
- [x] Clear context when requested by user

**Acceptance Criteria**:
- [x] Context persists across multiple messages
- [x] Context includes last 10-20 message pairs
- [x] Context can be manually reset
- [x] Old context is automatically pruned

### 4. Command System
**Priority**: P1 (High)

**Requirements**:
- [x] Support special commands prefixed with "/"
- [x] Provide help and information commands
- [x] Allow users to check bot status
- [x] Enable context management

**Commands Specification**:
- `/help` - Display available commands and usage
- `/reset` - Clear conversation context
- `/status` - Check bot and API status
- `/about` - Show bot information
- `/context` - Show current AI context/persona
- `/reload` - Reload AI context configuration

**Acceptance Criteria**:
- [x] All commands work as specified
- [x] Commands are case-insensitive
- [x] Invalid commands show helpful error messages
- [x] Command responses are properly formatted

### 5. Message Handling
**Priority**: P1 (High)

**Requirements**:
- [x] Split long responses into multiple messages
- [x] Show "typing" indicator while processing
- [x] Handle rate limiting from WhatsApp
- [x] Ignore emoji-only messages

**Acceptance Criteria**:
- [x] Messages over 1500 characters are split intelligently
- [x] Typing indicator appears during processing
- [x] Rate limits are respected (no spam)
- [x] Single emojis don't trigger responses

## 🔧 Technical Requirements

### Architecture
**Technology Stack**:
- Runtime: Node.js 18+
- WhatsApp Integration: whatsapp-web.js
- HTTP Client: axios
- AI Backend: Ollama-compatible API client
- Process Management: PM2

### API Compatibility
- Must support Ollama API format and endpoints
- Handle Ollama-specific response structures
- Support streaming and non-streaming modes
- Compatible with Ollama's chat completion format

### Infrastructure Requirements
- Server: VPS with 1GB+ RAM, 1 CPU core minimum
- Network: Stable internet connection with <100ms latency to Ollama server
- Storage: 10GB+ for logs and session data
- Dependencies: Chrome/Chromium browser for WhatsApp Web

### Performance Requirements
- Response Time: 95% of messages processed within 10 seconds
- Throughput: Handle 100+ messages per hour
- Memory Usage: Stay below 500MB RAM usage
- CPU Usage: Average <30% CPU utilization

## 🚀 Implementation Plan

### Phase 1: Core Functionality (Completed)
- [x] Basic WhatsApp connection setup
- [x] Simple message echo functionality
- [x] Yue-F API integration
- [x] Basic error handling
- [x] Conversation context system
- [x] Command system implementation
- [x] Message splitting logic
- [x] Typing indicators

### Phase 1.5: Business Context System (Completed)
- [x] Customizable AI persona configuration
- [x] Business information integration
- [x] Dynamic context loading/reloading
- [x] Context management commands
- [x] Professional assistant capabilities
- [x] Simplified JSON configuration system
- [x] Gender identity support with pronouns
- [x] User-friendly setup for non-developers

### Phase 2: Enhanced Features (Next Phase)
- [ ] Advanced context persistence
- [ ] Multi-language support
- [ ] Advanced analytics and reporting
- [ ] Integration with external business systems

### Phase 3: Production Ready (Future)
- [ ] Comprehensive error handling
- [ ] Performance optimization
- [ ] Monitoring and logging
- [ ] Documentation and deployment guides

### Phase 4: Testing & Launch (Future)
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Security review
- [ ] Production deployment

## 📊 Current Status

### Completed Features
- [x] Project structure setup
- [x] PRD documentation created
- [x] Basic Node.js project initialization
- [x] WhatsApp Web integration
- [x] Yue-F API client implementation
- [x] Message processing logic
- [x] Command system with context management
- [x] Business context configuration system
- [x] Dynamic context loading and reloading
- [x] Professional AI assistant capabilities
- [x] All content converted to English
- [x] Simplified JSON configuration system
- [x] Gender identity support with automatic pronouns
- [x] User-friendly setup for non-technical users

### Current Status
- ✅ Phase 1: Core functionality complete
- ✅ Phase 1.5: Business context system complete
- ✅ Phase 1.6: Simplified configuration system complete
- 🔄 Ready for Phase 2: Enhanced features

### Next Steps (Phase 2)
1. Implement advanced context persistence
2. Add multi-language support
3. Create analytics and reporting
4. Integrate with external business systems

## 🔄 API Response Format (Ollama Compatible)
```json
{
  "model": "yue-f",
  "created_at": "2024-01-01T00:00:00.000000000Z",
  "message": {
    "role": "assistant",
    "content": "AI response text here"
  },
  "done": true,
  "total_duration": 1234567890,
  "load_duration": 1234567890,
  "prompt_eval_count": 10,
  "prompt_eval_duration": 1234567890,
  "eval_count": 20,
  "eval_duration": 1234567890
}
```

---

**Document Version**: 1.4  
**Last Updated**: September 26, 2025  
**Next Review**: October 2025  
**Status**: Phase 1.7 Complete - Complete Migration to JSON Configuration System
