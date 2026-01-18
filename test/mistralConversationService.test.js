const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config/config');
const MistralConversationService = require('../src/services/mistralConversationService');

function createPersistenceStub() {
    let conversationId = null;

    return {
        loadMistralConversationId: async () => conversationId,
        saveMistralConversationId: async (_chatId, value) => {
            conversationId = value;
        },
        clearMistralConversationId: async () => {
            conversationId = null;
        },
        getConversationId: () => conversationId,
    };
}

test('MistralConversationService.sendMessage starts a conversation when none exists', async () => {
    const previousKey = config.mistral.apiKey;
    const previousAgentId = config.mistral.agentId;

    config.mistral.apiKey = 'test-key';
    config.mistral.agentId = 'ag_test';

    const persistence = createPersistenceStub();

    let startCalls = 0;
    const fakeClient = {
        beta: {
            conversations: {
                start: async (req) => {
                    startCalls += 1;
                    assert.equal(req.agentId, 'ag_test');
                    assert.equal(Array.isArray(req.inputs), true);
                    assert.equal(req.inputs[0].role, 'user');
                    assert.equal(req.inputs[0].content, 'hello');

                    return {
                        conversationId: 'conv_1',
                        outputs: [{ type: 'message.output', content: 'ok' }],
                        usage: {},
                    };
                },
            },
        },
    };

    const service = new MistralConversationService({ mistralClient: fakeClient, persistenceService: persistence });
    const result = await service.sendMessage('chat_1', 'hello');

    assert.equal(result, 'ok');
    assert.equal(startCalls, 1);
    assert.equal(persistence.getConversationId(), 'conv_1');

    config.mistral.apiKey = previousKey;
    config.mistral.agentId = previousAgentId;
});

test('MistralConversationService.sendMessage appends when conversation already exists', async () => {
    const previousKey = config.mistral.apiKey;
    const previousAgentId = config.mistral.agentId;

    config.mistral.apiKey = 'test-key';
    config.mistral.agentId = 'ag_test';

    const persistence = createPersistenceStub();
    await persistence.saveMistralConversationId('chat_1', 'conv_1');

    let appendCalls = 0;
    const fakeClient = {
        beta: {
            conversations: {
                append: async (req) => {
                    appendCalls += 1;
                    assert.equal(req.conversationId, 'conv_1');
                    assert.equal(Array.isArray(req.conversationAppendRequest.inputs), true);
                    assert.equal(req.conversationAppendRequest.inputs[0].role, 'user');

                    return {
                        conversationId: 'conv_1',
                        outputs: [{ type: 'message.output', content: 'ok' }],
                        usage: {},
                    };
                },
            },
        },
    };

    const service = new MistralConversationService({ mistralClient: fakeClient, persistenceService: persistence });
    const result = await service.sendMessage('chat_1', 'hello');

    assert.equal(result, 'ok');
    assert.equal(appendCalls, 1);

    config.mistral.apiKey = previousKey;
    config.mistral.agentId = previousAgentId;
});

test('MistralConversationService.sendMessage loops over function calls and sends function results', async () => {
    const previousKey = config.mistral.apiKey;
    const previousAgentId = config.mistral.agentId;

    config.mistral.apiKey = 'test-key';
    config.mistral.agentId = 'ag_test';

    const persistence = createPersistenceStub();

    const calls = [];

    const fakeClient = {
        beta: {
            conversations: {
                start: async () => {
                    calls.push('start');
                    return {
                        conversationId: 'conv_1',
                        outputs: [
                            {
                                type: 'function.call',
                                toolCallId: 'call_1',
                                name: 'interpretar_data_hora',
                                arguments: '{"text":"amanhã 14h"}',
                            },
                        ],
                        usage: {},
                    };
                },
                append: async (req) => {
                    calls.push('append');
                    assert.equal(req.conversationId, 'conv_1');

                    const [input] = req.conversationAppendRequest.inputs;
                    assert.equal(input.toolCallId, 'call_1');
                    assert.equal(typeof input.result, 'string');

                    return {
                        conversationId: 'conv_1',
                        outputs: [{ type: 'message.output', content: 'done' }],
                        usage: {},
                    };
                },
            },
        },
    };

    const dispatcher = {
        dispatchToolCall: async (toolCall) => {
            assert.equal(toolCall.function.name, 'interpretar_data_hora');
            return { success: true, date: '2026-01-19', time: '14:00' };
        },
    };

    const service = new MistralConversationService({ mistralClient: fakeClient, persistenceService: persistence });
    const result = await service.sendMessage('chat_1', 'hello', {
        tools: [{ type: 'function', function: { name: 'interpretar_data_hora' } }],
        dispatcher,
    });

    assert.equal(result, 'done');
    assert.deepEqual(calls, ['start', 'append']);

    config.mistral.apiKey = previousKey;
    config.mistral.agentId = previousAgentId;
});
