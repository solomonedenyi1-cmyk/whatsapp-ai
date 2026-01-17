// Directly require the class and mock dependencies
const { Mistral } = require('@mistralai/mistralai');
const MistralApiServiceClass = require('../src/services/mistralApiService');
const { mockMistralClient } = require('./mocks/mistralClient');

describe('MistralApiService', () => {
  let service;
  let mockClient;

  beforeEach(() => {
    // Mock the Mistral client
    mockClient = mockMistralClient();
    
    // Create service instance with mocked config
    service = new MistralApiServiceClass();
    service.apiKey = 'test_api_key';
    service.modelName = 'mistral-medium-latest';
    service.timeout = 0;
    service.warningTimeout = 300000;
    
    // Inject mock client
    service.client = mockClient;
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
    if (service && service.cleanup) {
      service.cleanup();
    }
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(service.apiKey).toBe('test_api_key');
      expect(service.modelName).toBe('mistral-medium-latest');
      expect(service.timeout).toBe(0);
      expect(service.warningTimeout).toBe(300000);
      expect(service.cacheEnabled).toBe(true);
      expect(service.cache).toBeInstanceOf(Map);
    });

    it('should initialize cache cleanup interval', () => {
      expect(service.cacheCleanupInterval).toBeDefined();
    });
  });

  describe('cache management', () => {
    it('should enable and disable cache', () => {
      expect(service.cacheEnabled).toBe(true);
      
      service.setCacheEnabled(false);
      expect(service.cacheEnabled).toBe(false);
      expect(service.cache.size).toBe(0); // Should clear cache when disabled
      
      service.setCacheEnabled(true);
      expect(service.cacheEnabled).toBe(true);
    });

    it('should clear cache', () => {
      // Add something to cache
      service.cache.set('test', { response: 'test', timestamp: Date.now() });
      expect(service.cache.size).toBe(1);
      
      service.clearCache();
      expect(service.cache.size).toBe(0);
    });

    it('should generate cache keys', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const key = service.generateCacheKey(messages);
      expect(key).toBe('user:Hello');
    });

    it('should get cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('ttl');
      expect(stats).toHaveProperty('enabled');
      expect(stats.ttl).toBe(300000); // 5 minutes
    });
  });

  describe('error handling', () => {
    it('should identify retryable errors', () => {
      // Network errors
      const networkError = new Error('Connection timeout');
      networkError.code = 'ECONNABORTED';
      expect(service.isRetryableError(networkError)).toBe(true);

      // HTTP 429
      const rateLimitError = new Error('Too many requests');
      rateLimitError.response = { status: 429 };
      expect(service.isRetryableError(rateLimitError)).toBe(true);

      // HTTP 500
      const serverError = new Error('Internal server error');
      serverError.response = { status: 500 };
      expect(service.isRetryableError(serverError)).toBe(true);

      // Timeout errors
      const timeoutError = new Error('Request timeout');
      expect(service.isRetryableError(timeoutError)).toBe(true);

      // Non-retryable errors
      const authError = new Error('Authentication failed');
      authError.response = { status: 401 };
      expect(service.isRetryableError(authError)).toBe(false);

      const validationError = new Error('Invalid input');
      validationError.response = { status: 400 };
      expect(service.isRetryableError(validationError)).toBe(false);
    });
  });

  describe('sendChatMessage', () => {
    it('should send message and return response', async () => {
      // Mock successful API response
      mockClient.chat.complete.mockResolvedValue({
        choices: [{ message: { content: 'Test response' } }]
      });

      const messages = [{ role: 'user', content: 'Hello' }];
      const response = await service.sendChatMessage(messages);

      expect(response).toBe('Test response');
      expect(mockClient.chat.complete).toHaveBeenCalledWith({
        model: 'mistral-medium-latest',
        messages: messages,
        stream: false
      });
    });

    it('should cache responses when caching is enabled', async () => {
      // Mock successful API response
      mockClient.chat.complete.mockResolvedValue({
        choices: [{ message: { content: 'Cached response' } }]
      });

      const messages = [{ role: 'user', content: 'Test' }];
      const cacheKey = service.generateCacheKey(messages);

      // First call - should hit API
      const response1 = await service.sendChatMessage(messages);
      expect(response1).toBe('Cached response');
      expect(mockClient.chat.complete).toHaveBeenCalledTimes(1);

      // Second call - should hit cache
      const response2 = await service.sendChatMessage(messages);
      expect(response2).toBe('Cached response');
      expect(mockClient.chat.complete).toHaveBeenCalledTimes(1); // Still 1 - cached
    });

    it('should not cache when useCache is false', async () => {
      // Mock successful API response
      mockClient.chat.complete.mockResolvedValue({
        choices: [{ message: { content: 'No cache response' } }]
      });

      const messages = [{ role: 'user', content: 'Test' }];

      // First call with cache disabled
      const response1 = await service.sendChatMessage(messages, null, false);
      expect(response1).toBe('No cache response');

      // Second call with cache disabled
      const response2 = await service.sendChatMessage(messages, null, false);
      expect(response2).toBe('No cache response');
      expect(mockClient.chat.complete).toHaveBeenCalledTimes(2); // No caching
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      const error = new Error('API unavailable');
      mockClient.chat.complete.mockRejectedValue(error);

      const messages = [{ role: 'user', content: 'Hello' }];
      const response = await service.sendChatMessage(messages);

      // Should return fallback message
      expect(response).toMatch(/Desculpe|Ops!|Estou/);
    });

    it('should return fallback for non-retryable errors when useCache is true', async () => {
      // Mock authentication error (non-retryable)
      const authError = new Error('Authentication failed');
      authError.response = { status: 401 };
      mockClient.chat.complete.mockRejectedValue(authError);

      const messages = [{ role: 'user', content: 'Hello' }];

      // With cache enabled, it returns fallback
      const response = await service.sendChatMessage(messages);
      expect(response).toMatch(/Desculpe|Ops!|Estou/);
    });
  });

  describe('sendChatMessageWithRetry', () => {
    it('should succeed on first attempt when no error', async () => {
      // Mock successful response
      mockClient.chat.complete.mockResolvedValue({
        choices: [{ message: { content: 'Success' } }]
      });

      const messages = [{ role: 'user', content: 'Test' }];
      const response = await service.sendChatMessageWithRetry(messages);

      expect(response).toBe('Success');
      expect(mockClient.chat.complete).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      // Mock: fail twice, succeed on third attempt
      let callCount = 0;
      mockClient.chat.complete.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          const error = new Error('Network error');
          error.code = 'ECONNABORTED';
          throw error;
        }
        return Promise.resolve({
          choices: [{ message: { content: 'Success after retry' } }]
        });
      });

      const messages = [{ role: 'user', content: 'Test' }];
      const response = await service.sendChatMessageWithRetry(messages, null, false, 3);

      expect(response).toBe('Success after retry');
      expect(callCount).toBe(3);
    });

    it('should return fallback after max retries', async () => {
      // Mock: always fail
      const error = new Error('Network error');
      error.code = 'ECONNABORTED';
      mockClient.chat.complete.mockRejectedValue(error);

      const messages = [{ role: 'user', content: 'Test' }];
      const response = await service.sendChatMessageWithRetry(messages, null, false, 3);

      // Should return fallback message
      expect(response).toMatch(/Desculpe|Ops!|Estou/);
      expect(mockClient.chat.complete).toHaveBeenCalledTimes(4); // 3 retries + 1 initial = 4
    });

    it('should return fallback for non-retryable errors in retry', async () => {
      // Mock: authentication error (non-retryable)
      const authError = new Error('Authentication failed');
      authError.response = { status: 401 };
      mockClient.chat.complete.mockRejectedValue(authError);

      const messages = [{ role: 'user', content: 'Test' }];

      // Non-retryable errors still get fallback in retry mechanism
      const response = await service.sendChatMessageWithRetry(messages, null, false, 3);
      expect(response).toMatch(/Desculpe|Ops!|Estou/);

      expect(mockClient.chat.complete).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('sendMessage', () => {
    it('should send simple message', async () => {
      // Mock successful response
      mockClient.chat.complete.mockResolvedValue({
        choices: [{ message: { content: 'Simple response' } }]
      });

      const response = await service.sendMessage('Hello');
      expect(response).toBe('Simple response');
    });

    it('should pass conversation history', async () => {
      // Mock successful response
      mockClient.chat.complete.mockResolvedValue({
        choices: [{ message: { content: 'Response with history' } }]
      });

      const history = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' }
      ];

      const response = await service.sendMessage('New message', history);
      expect(response).toBe('Response with history');

      // Check that history was included in the call
      const callArgs = mockClient.chat.complete.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(3); // history + new message
      expect(callArgs.messages[0]).toEqual(history[0]);
      expect(callArgs.messages[1]).toEqual(history[1]);
      expect(callArgs.messages[2]).toEqual({ role: 'user', content: 'New message' });
    });
  });

  describe('checkApiStatus', () => {
    it('should return true when API is available', async () => {
      // Mock successful response
      mockClient.chat.complete.mockResolvedValue({
        choices: [{ message: { content: 'pong' } }]
      });

      const status = await service.checkApiStatus();
      expect(status).toBe(true);
    });

    it('should return false when API is unavailable', async () => {
      // Mock API error
      const error = new Error('API unavailable');
      mockClient.chat.complete.mockRejectedValue(error);

      const status = await service.checkApiStatus();
      expect(status).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      const interval = service.cacheCleanupInterval;
      expect(interval).toBeDefined();

      service.cleanup();
      expect(service.cacheCleanupInterval).toBeNull();
      expect(service.cache.size).toBe(0);
    });
  });
});