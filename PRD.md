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

### 1. Message Processing
**Priority**: P0 (Critical)

**Requirements**:
- [x] Receive and process text messages from WhatsApp users
- [x] Handle messages in real-time with minimal latency
- [x] Support UTF-8 encoding for international characters
- [x] Filter out irrelevant messages (status updates, own messages)

**Acceptance Criteria**:
- [ ] Bot receives all text messages sent to it
- [ ] Messages are processed within 2 seconds of receipt
- [ ] International characters display correctly
- [ ] Bot ignores its own messages and status broadcasts

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
- [ ] Successfully connects to Yue-F API
- [ ] Sends properly formatted Ollama-compatible requests
- [ ] Correctly parses Ollama API responses
- [ ] Handles API timeouts (30s max)
- [ ] Provides fallback responses on API failure
- [ ] Compatible with Ollama's chat completion endpoint

### 3. Conversation Context
**Priority**: P1 (High)

**Requirements**:
- [ ] Maintain conversation history per user/group
- [ ] Include relevant context in API requests
- [ ] Limit context size to prevent performance issues
- [ ] Clear context when requested by user

**Acceptance Criteria**:
- [ ] Context persists across multiple messages
- [ ] Context includes last 10-20 message pairs
- [ ] Context can be manually reset
- [ ] Old context is automatically pruned

### 4. Command System
**Priority**: P1 (High)

**Requirements**:
- [ ] Support special commands prefixed with "/"
- [ ] Provide help and information commands
- [ ] Allow users to check bot status
- [ ] Enable context management

**Commands Specification**:
- `/help` - Display available commands and usage
- `/reset` - Clear conversation context
- `/status` - Check bot and API status
- `/about` - Show bot information

**Acceptance Criteria**:
- [ ] All commands work as specified
- [ ] Commands are case-insensitive
- [ ] Invalid commands show helpful error messages
- [ ] Command responses are properly formatted

### 5. Message Handling
**Priority**: P1 (High)

**Requirements**:
- [ ] Split long responses into multiple messages
- [ ] Show "typing" indicator while processing
- [ ] Handle rate limiting from WhatsApp
- [ ] Ignore emoji-only messages

**Acceptance Criteria**:
- [ ] Messages over 1500 characters are split intelligently
- [ ] Typing indicator appears during processing
- [ ] Rate limits are respected (no spam)
- [ ] Single emojis don't trigger responses

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

### Phase 1: Core Functionality (Current Phase)
- [x] Basic WhatsApp connection setup
- [x] Simple message echo functionality
- [x] Yue-F API integration
- [x] Basic error handling

### Phase 2: Enhanced Features (Next Phase)
- [ ] Conversation context system
- [ ] Command system implementation
- [ ] Message splitting logic
- [ ] Typing indicators

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

### In Progress
- [ ] WhatsApp Web integration
- [ ] Yue-F API client implementation
- [ ] Message processing logic

### Next Steps
1. Complete WhatsApp Web connection
2. Implement Yue-F API integration
3. Create basic message echo functionality
4. Add error handling

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

**Document Version**: 1.0  
**Last Updated**: September 26, 2025  
**Next Review**: October 2025  
**Status**: Phase 1 - In Development
