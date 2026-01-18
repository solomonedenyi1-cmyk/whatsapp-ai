const test = require('node:test');
const assert = require('node:assert/strict');

const TimeoutHandler = require('../src/services/timeoutHandler');

test('TimeoutHandler.registerRequest stores chatId correctly and emits warning with same chatId', async (t) => {
    const handler = new TimeoutHandler();
    handler.stopTimeoutMonitoring();

    t.after(async () => {
        await handler.shutdown();
    });

    const chatId = '123@c.us';
    const requestId = 'req_1';

    handler.registerRequest(chatId, requestId, 'hello');

    const req = handler.activeRequests.get(requestId);
    assert.equal(req.chatId, chatId);

    req.startTime = Date.now() - 120000;

    const eventPromise = new Promise((resolve) => {
        handler.once('sendTimeoutMessage', resolve);
    });

    handler.checkTimeouts();

    const evt = await eventPromise;
    assert.equal(evt.chatId, chatId);
    assert.equal(evt.type, 'warning');
});

test('TimeoutHandler.handleMaxTimeout emits timeout message with correct chatId', async (t) => {
    const handler = new TimeoutHandler();
    handler.stopTimeoutMonitoring();

    t.after(async () => {
        await handler.shutdown();
    });

    const chatId = '999@c.us';
    const requestId = 'req_2';

    handler.registerRequest(chatId, requestId, 'hello');

    const eventPromise = new Promise((resolve) => {
        handler.once('sendTimeoutMessage', resolve);
    });

    await handler.handleMaxTimeout(requestId);

    const evt = await eventPromise;
    assert.equal(evt.chatId, chatId);
    assert.equal(evt.type, 'timeout');
});
