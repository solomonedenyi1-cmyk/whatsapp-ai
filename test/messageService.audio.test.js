const test = require('node:test');
const assert = require('node:assert/strict');

const MessageService = require('../src/services/messageService');

test('MessageService.shouldIgnoreMessage allows ptt messages with media', () => {
    const service = new MessageService();

    const message = {
        fromMe: false,
        from: '551234567890@c.us',
        type: 'ptt',
        hasMedia: true,
        body: '',
    };

    assert.equal(service.shouldIgnoreMessage(message), false);
});

test('MessageService.shouldIgnoreMessage ignores ptt messages without media', () => {
    const service = new MessageService();

    const message = {
        fromMe: false,
        from: '551234567890@c.us',
        type: 'ptt',
        hasMedia: false,
        body: '',
    };

    assert.equal(service.shouldIgnoreMessage(message), true);
});

test('MessageService.shouldIgnoreMessage keeps chat validation behavior', () => {
    const service = new MessageService();

    assert.equal(
        service.shouldIgnoreMessage({
            fromMe: false,
            from: '551234567890@c.us',
            type: 'chat',
            body: '😀',
        }),
        true
    );

    assert.equal(
        service.shouldIgnoreMessage({
            fromMe: false,
            from: '551234567890@c.us',
            type: 'chat',
            body: 'oi',
        }),
        false
    );
});
