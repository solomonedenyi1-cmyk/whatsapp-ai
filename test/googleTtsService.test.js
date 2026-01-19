const test = require('node:test');
const assert = require('node:assert/strict');

const GoogleTtsService = require('../src/services/googleTtsService');

test('GoogleTtsService.synthesizeToBuffer returns audio buffer from client', async () => {
    const calls = [];

    const client = {
        synthesizeSpeech: async (request) => {
            calls.push(request);
            return [{ audioContent: Buffer.from('ogg-opus-bytes') }];
        },
    };

    const service = new GoogleTtsService({ client });

    const result = await service.synthesizeToBuffer('hello world', {
        languageCode: 'pt-BR',
        voiceName: 'pt-BR-Standard-A',
        speakingRate: 1.05,
        pitch: 0.0,
        maxChars: 1000,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].input.text, 'hello world');
    assert.equal(calls[0].voice.languageCode, 'pt-BR');
    assert.equal(calls[0].voice.name, 'pt-BR-Standard-A');
    assert.equal(calls[0].audioConfig.audioEncoding, 'OGG_OPUS');
    assert.equal(calls[0].audioConfig.speakingRate, 1.05);

    assert.ok(Buffer.isBuffer(result.buffer));
    assert.equal(result.buffer.toString(), 'ogg-opus-bytes');
});

test('GoogleTtsService.synthesizeToBuffer throws when text exceeds maxChars', async () => {
    const client = {
        synthesizeSpeech: async () => {
            throw new Error('should not be called');
        },
    };

    const service = new GoogleTtsService({ client });

    await assert.rejects(
        () => service.synthesizeToBuffer('x'.repeat(10), { maxChars: 5 }),
        /exceeds max chars/
    );
});
