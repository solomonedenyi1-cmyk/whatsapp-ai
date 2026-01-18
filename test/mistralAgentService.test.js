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
