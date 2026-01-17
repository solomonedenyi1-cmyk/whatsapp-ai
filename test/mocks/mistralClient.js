// Mock Mistral client for testing
class MockMistralClient {
  constructor() {
    this.chat = {
      complete: jest.fn()
    };
  }
}

function mockMistralClient() {
  return new MockMistralClient();
}

module.exports = {
  MockMistralClient,
  mockMistralClient
};