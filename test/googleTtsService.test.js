const test = require('node:test');
const assert = require('node:assert/strict');

const GoogleTtsService = require('../src/services/googleTtsService');

function loadGoogleTtsServiceWithEnv(env = {}) {
    for (const [key, value] of Object.entries(env)) {
        process.env[key] = value;
    }

    delete require.cache[require.resolve('../src/config/config')];
    delete require.cache[require.resolve('../src/services/googleTtsService')];

    const Service = require('../src/services/googleTtsService');
    return Service;
}

test('GoogleTtsService.synthesizeToBuffer returns audio buffer from client', async () => {
    const previousApiKey = process.env.GOOGLE_TTS_API_KEY;
    delete process.env.GOOGLE_TTS_API_KEY;

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

    if (typeof previousApiKey === 'string') {
        process.env.GOOGLE_TTS_API_KEY = previousApiKey;
    }
});

test('GoogleTtsService.synthesizeToBuffer throws when text exceeds maxChars', async () => {
    const previousApiKey = process.env.GOOGLE_TTS_API_KEY;
    delete process.env.GOOGLE_TTS_API_KEY;

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

    if (typeof previousApiKey === 'string') {
        process.env.GOOGLE_TTS_API_KEY = previousApiKey;
    }
});

test('GoogleTtsService.synthesizeToBuffer uses REST when GOOGLE_TTS_API_KEY is set', async () => {
    const previousFetch = global.fetch;
    const previousApiKey = process.env.GOOGLE_TTS_API_KEY;

    const fetchCalls = [];
    global.fetch = async (url, init) => {
        fetchCalls.push({ url, init });
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ audioContent: Buffer.from('ogg-opus-rest').toString('base64') }),
        };
    };

    const Service = loadGoogleTtsServiceWithEnv({ GOOGLE_TTS_API_KEY: 'test-key' });
    const service = new Service({ client: null });

    const result = await service.synthesizeToBuffer('hello rest', {
        languageCode: 'pt-BR',
        voiceName: 'pt-BR-Standard-A',
        speakingRate: 1.0,
        pitch: 0.0,
        maxChars: 1000,
    });

    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0].url, /^https:\/\/texttospeech\.googleapis\.com\/v1\/text:synthesize\?key=test-key/);
    assert.equal(fetchCalls[0].init.method, 'POST');
    assert.equal(fetchCalls[0].init.headers['Content-Type'], 'application/json');

    const body = JSON.parse(fetchCalls[0].init.body);
    assert.equal(body.input.text, 'hello rest');
    assert.equal(body.audioConfig.audioEncoding, 'OGG_OPUS');

    assert.ok(Buffer.isBuffer(result.buffer));
    assert.equal(result.buffer.toString(), 'ogg-opus-rest');

    global.fetch = previousFetch;
    if (typeof previousApiKey === 'string') {
        process.env.GOOGLE_TTS_API_KEY = previousApiKey;
    } else {
        delete process.env.GOOGLE_TTS_API_KEY;
    }
});
