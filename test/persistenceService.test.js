const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const PersistenceService = require('../src/services/persistenceService');

async function createTempDir() {
    const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'whatsapp-ai-test-'));
    return tmpBase;
}

test('PersistenceService writes JSON atomically and supports concurrent saveConversation calls', async () => {
    const dir = await createTempDir();
    const service = new PersistenceService({ dataDir: dir });

    await Promise.all(
        Array.from({ length: 20 }).map(async (_, i) => {
            await service.saveConversation(`chat_${i}`, [{ role: 'user', content: `hi ${i}` }], {
                participantCount: 1,
            });
        })
    );

    const filePath = path.join(dir, 'conversations.json');
    const raw = await fs.readFile(filePath, 'utf8');

    assert.doesNotThrow(() => JSON.parse(raw));
    const parsed = JSON.parse(raw);

    for (let i = 0; i < 20; i += 1) {
        assert.equal(typeof parsed[`chat_${i}`], 'object');
        assert.equal(Array.isArray(parsed[`chat_${i}`].context), true);
    }
});

test('PersistenceService.cleanupOldData returns compatible object shape', async () => {
    const dir = await createTempDir();
    const service = new PersistenceService({ dataDir: dir });

    // Seed one old conversation
    service.conversationsCache.set('old', {
        context: [{ role: 'user', content: 'hello' }],
        lastUpdated: '2000-01-01T00:00:00.000Z',
        messageCount: 1,
    });

    // Seed minimal analytics cache
    service.analyticsCache = {
        totalMessages: 0,
        totalConversations: 0,
        dailyStats: {
            '2000-01-01': { messages: 1, conversations: 1, commands: 0, errors: 0 },
        },
        userStats: {},
        popularCommands: {},
        responseTimeStats: [],
        errorStats: {},
    };

    await service.saveConversationsToFile();
    await service.saveAnalyticsToFile();

    const result = await service.cleanupOldData(1);

    assert.equal(typeof result, 'object');
    assert.equal(typeof result.cleanedConversations, 'number');
    assert.equal(typeof result.cleanedAnalytics, 'number');
    assert.equal(typeof result.spaceSaved, 'string');
});
