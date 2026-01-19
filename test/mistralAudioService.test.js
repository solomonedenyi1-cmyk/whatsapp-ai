const test = require('node:test');
const assert = require('node:assert/strict');

function createFetchMock({ ok = true, status = 200, json = null, text = '' } = {}) {
    const calls = [];

    const fetchMock = async (url, options) => {
        calls.push({ url, options });

        return {
            ok,
            status,
            statusText: 'mock',
            json: async () => (json ?? { text: 'ok' }),
            text: async () => text,
        };
    };

    return { fetchMock, calls };
}

test('MistralAudioService.transcribeAudio posts multipart data and returns transcription', async () => {
    process.env.MISTRAL_API_KEY = 'test_key';

    delete require.cache[require.resolve('../src/config/config')];
    delete require.cache[require.resolve('../src/services/mistralAudioService')];

    const MistralAudioService = require('../src/services/mistralAudioService');

    const { fetchMock, calls } = createFetchMock({
        ok: true,
        status: 200,
        json: { text: 'olá mundo', language: 'pt' },
    });

    const service = new MistralAudioService({ fetchImpl: fetchMock });

    const result = await service.transcribeAudio({
        buffer: Buffer.from('abc'),
        mimeType: 'audio/ogg',
        fileName: 'audio.ogg',
        model: 'voxtral-mini-latest',
        language: 'pt',
    });

    assert.equal(result.text, 'olá mundo');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.mistral.ai/v1/audio/transcriptions');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test_key');
    assert.equal(typeof calls[0].options.body, 'object');
});

test('MistralAudioService.transcribeAudio throws on non-2xx response', async () => {
    process.env.MISTRAL_API_KEY = 'test_key';

    delete require.cache[require.resolve('../src/config/config')];
    delete require.cache[require.resolve('../src/services/mistralAudioService')];

    const MistralAudioService = require('../src/services/mistralAudioService');

    const { fetchMock } = createFetchMock({
        ok: false,
        status: 401,
        text: 'unauthorized',
    });

    const service = new MistralAudioService({ fetchImpl: fetchMock });

    await assert.rejects(
        () => service.transcribeAudio({ buffer: Buffer.from('abc'), mimeType: 'audio/ogg' }),
        /Mistral transcription failed \(401\): unauthorized/
    );
});
