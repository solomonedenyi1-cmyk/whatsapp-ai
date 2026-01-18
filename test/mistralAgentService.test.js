const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config/config');
const MistralAgentService = require('../src/services/mistralAgentService');

test('MistralAgentService.sendChatMessage returns first choice content', async () => {
    const previousKey = config.mistral.apiKey;
    const previousAgentId = config.mistral.agentId;

    config.mistral.apiKey = 'test-key';
    config.mistral.agentId = 'ag_test';

    const fakeClient = {
        agents: {
            complete: async () => ({
                choices: [
                    {
                        message: {
                            content: 'ok',
                        },
                    },
                ],
            }),
        },
    };

    const service = new MistralAgentService({ mistralClient: fakeClient });
    const result = await service.sendChatMessage([{ role: 'user', content: 'hello' }]);

    assert.equal(result, 'ok');

    config.mistral.apiKey = previousKey;
    config.mistral.agentId = previousAgentId;
});

test('MistralAgentService.sendMessageWithTools loops tool calls and returns final content', async () => {
    const previousKey = config.mistral.apiKey;
    const previousAgentId = config.mistral.agentId;

    config.mistral.apiKey = 'test-key';
    config.mistral.agentId = 'ag_test';

    const fakeClient = {
        agents: {
            complete: async ({ messages }) => {
                const last = messages[messages.length - 1];

                if (!last || last.role !== 'tool') {
                    return {
                        choices: [
                            {
                                message: {
                                    content: null,
                                    tool_calls: [
                                        {
                                            id: 'call_1',
                                            function: {
                                                name: 'criar_agendamento',
                                                arguments: JSON.stringify({
                                                    name: 'Jane',
                                                    email: '[email protected]',
                                                    date: '2026-01-19',
                                                    time: '14:00',
                                                }),
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    };
                }

                return {
                    choices: [
                        {
                            message: {
                                content: 'ok',
                                tool_calls: null,
                            },
                        },
                    ],
                };
            },
        },
    };

    const dispatcher = {
        dispatchToolCall: async () => ({ success: true, bookingId: 123 }),
    };

    const service = new MistralAgentService({ mistralClient: fakeClient });
    const result = await service.sendMessageWithTools(
        'hello',
        [],
        {
            tools: [{ type: 'function', function: { name: 'criar_agendamento' } }],
            dispatcher,
        }
    );

    assert.equal(result.content, 'ok');
    assert.equal(Array.isArray(result.toolMessages), true);
    assert.equal(result.toolMessages.length, 1);
    assert.equal(result.toolMessages[0].role, 'tool');
    assert.equal(result.toolMessages[0].name, 'criar_agendamento');
    assert.equal(result.toolMessages[0].tool_call_id, 'call_1');

    config.mistral.apiKey = previousKey;
    config.mistral.agentId = previousAgentId;
});
