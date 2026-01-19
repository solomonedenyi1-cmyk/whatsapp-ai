const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

const EdgeTtsService = require('../src/services/edgeTtsService');

test('EdgeTtsService.synthesizeToBuffer returns buffer written by edge client', async () => {
    const written = Buffer.from('fake-audio');

    const edgeTts = {
        voice: null,
        outputFormat: null,
        ttsPromise: async (text, audioPath) => {
            assert.equal(typeof text, 'string');
            assert.equal(typeof audioPath, 'string');
            await fs.writeFile(audioPath, written);
        },
    };

    const service = new EdgeTtsService({ edgeTts });
    const result = await service.synthesizeToBuffer('hello world', {
        outputFormat: 'ogg-24khz-16bit-mono-opus',
        mimeType: 'audio/ogg; codecs=opus',
        maxChars: 1000,
    });

    assert.equal(result.mimeType, 'audio/ogg; codecs=opus');
    assert.ok(Buffer.isBuffer(result.buffer));
    assert.equal(result.buffer.toString(), written.toString());
});

test('EdgeTtsService.synthesizeToBuffer throws when text exceeds maxChars', async () => {
    const edgeTts = {
        ttsPromise: async () => {
            throw new Error('should not be called');
        },
    };

    const service = new EdgeTtsService({ edgeTts });

    await assert.rejects(
        () => service.synthesizeToBuffer('x'.repeat(10), { maxChars: 5 }),
        /exceeds max chars/
    );
});
