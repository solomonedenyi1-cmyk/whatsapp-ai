const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const SqlitePersistenceService = require('../src/services/sqlitePersistenceService');

async function createTempDir() {
    const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'whatsapp-ai-test-'));
    return tmpBase;
}

test('SqlitePersistenceService supports concurrent saveConversation calls', async () => {
    const dir = await createTempDir();
    const service = new SqlitePersistenceService({ dataDir: dir });

    await Promise.all(
        Array.from({ length: 20 }).map(async (_, i) => {
            await service.saveConversation(`chat_${i}`, [{ role: 'user', content: `hi ${i}` }], {
                participantCount: 1,
            });
        })
    );

    const dbPath = path.join(dir, 'whatsapp-ai.sqlite');
    const stat = await fs.stat(dbPath);
    assert.equal(typeof stat.size, 'number');
    assert.equal(stat.size > 0, true);

    for (let i = 0; i < 20; i += 1) {
        const ctx = await service.loadConversation(`chat_${i}`);
        assert.equal(Array.isArray(ctx), true);
        assert.equal(ctx[0]?.role, 'user');
    }
});

test('SqlitePersistenceService.cleanupOldData returns compatible object shape', async () => {
    const dir = await createTempDir();

    const service = new SqlitePersistenceService({ dataDir: dir });
    await service.saveConversation('old', [{ role: 'user', content: 'hello' }], {
        lastUpdated: '2000-01-01T00:00:00.000Z',
        participantCount: 1,
    });

    const result = await service.cleanupOldData(1);

    assert.equal(typeof result, 'object');
    assert.equal(typeof result.cleanedConversations, 'number');
    assert.equal(typeof result.cleanedAnalytics, 'number');
    assert.equal(typeof result.spaceSaved, 'string');
});
