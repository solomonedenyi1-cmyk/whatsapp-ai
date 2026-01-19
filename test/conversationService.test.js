const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config/config');
const ConversationService = require('../src/services/conversationService');

function createConversationServiceForTest() {
    const persistenceService = {
        saveConversation: async () => { },
        deleteConversation: async () => { },
        recordAnalytics: async () => { },
        loadConversation: async () => [],
        getStorageStats: async () => ({}),
        getAnalyticsReport: async () => ({}),
    };

    return new ConversationService({ persistenceService });
}

test('ConversationService.getFormattedContext sanitizes messages and does not include system prompt by default', async () => {
    const service = createConversationServiceForTest();
    await service.addMessage('chat1', 'user', 'hello', { extra: 'ignored' });
    await service.addMessage('chat1', 'assistant', 'hi');

    const formatted = service.getFormattedContext('chat1');

    assert.equal(Array.isArray(formatted), true);
    assert.equal(formatted.length, 2);
    assert.deepEqual(Object.keys(formatted[0]).sort(), ['content', 'role']);
    assert.deepEqual(formatted[0], { role: 'user', content: 'hello' });
});
