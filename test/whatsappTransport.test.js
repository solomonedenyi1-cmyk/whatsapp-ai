const test = require('node:test');
const assert = require('node:assert/strict');

const { safeSendSeen, safeSendMessage } = require('../src/bot/whatsappTransport');

test('safeSendSeen does nothing for @lid chats', async () => {
    let chatSeenCalls = 0;
    let clientSeenCalls = 0;

    const chat = {
        sendSeen: async () => {
            chatSeenCalls += 1;
        },
    };

    const client = {
        sendSeen: async () => {
            clientSeenCalls += 1;
        },
    };

    await safeSendSeen('123@lid', chat, client, true);

    assert.equal(chatSeenCalls, 0);
    assert.equal(clientSeenCalls, 0);
});

test('safeSendSeen prefers chat.sendSeen over client.sendSeen', async () => {
    let chatSeenCalls = 0;
    let clientSeenCalls = 0;

    const chat = {
        sendSeen: async () => {
            chatSeenCalls += 1;
        },
    };

    const client = {
        sendSeen: async () => {
            clientSeenCalls += 1;
        },
    };

    await safeSendSeen('123@c.us', chat, client, true);

    assert.equal(chatSeenCalls, 1);
    assert.equal(clientSeenCalls, 0);
});

test('safeSendMessage uses client.sendMessage first for @lid and forces sendSeen=false', async () => {
    const calls = [];

    const client = {
        sendMessage: async (id, text, options) => {
            calls.push({ id, text, options });
        },
    };

    await safeSendMessage('123@lid', 'hello', { client });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].id, '123@lid');
    assert.equal(calls[0].text, 'hello');
    assert.deepEqual(calls[0].options, { sendSeen: false });
});

test('safeSendMessage falls back from message.reply to chat.sendMessage', async () => {
    const calls = [];

    const message = {
        reply: async () => {
            calls.push('reply');
            throw new Error('reply failed');
        },
    };

    const chat = {
        sendMessage: async () => {
            calls.push('chat.sendMessage');
        },
    };

    const client = {
        sendMessage: async () => {
            calls.push('client.sendMessage');
        },
    };

    await safeSendMessage('123@c.us', 'hello', { message, chat, client });

    assert.deepEqual(calls, ['reply', 'chat.sendMessage']);
});

test('safeSendMessage resolves @lid target via message.getContact when needed', async () => {
    const calls = [];

    const client = {
        sendMessage: async (id, text, options) => {
            calls.push({ id, text, options });

            if (id.endsWith('@lid')) {
                throw new Error('cannot send to lid');
            }
        },
    };

    const message = {
        getContact: async () => ({ id: { _serialized: '555@c.us' } }),
    };

    await safeSendMessage('123@lid', 'hello', { message, client });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].id, '123@lid');
    assert.equal(calls[1].id, '555@c.us');
    assert.deepEqual(calls[1].options, { sendSeen: false });
});
