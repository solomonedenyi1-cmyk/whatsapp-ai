const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveStableChatId } = require('../src/bot/chatIdResolver');

test('resolveStableChatId returns raw id when it is not @lid', async () => {
    const result = await resolveStableChatId({ rawChatId: '123@c.us' });
    assert.equal(result, '123@c.us');
});

test('resolveStableChatId prefers chat.id._serialized when available and not @lid', async () => {
    const chat = { id: { _serialized: '555@c.us' } };
    const result = await resolveStableChatId({ rawChatId: '123@lid', chat });
    assert.equal(result, '555@c.us');
});

test('resolveStableChatId falls back to message.getContact when chat id is not available', async () => {
    const message = {
        getContact: async () => ({ id: { _serialized: '777@c.us' } }),
    };

    const result = await resolveStableChatId({ rawChatId: '123@lid', message });
    assert.equal(result, '777@c.us');
});

test('resolveStableChatId returns raw @lid id when stable id cannot be resolved', async () => {
    const message = {
        getContact: async () => ({ id: { _serialized: '123@lid' } }),
    };

    const result = await resolveStableChatId({ rawChatId: '123@lid', message });
    assert.equal(result, '123@lid');
});
