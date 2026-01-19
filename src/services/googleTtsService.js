const config = require('../config/config');

class GoogleTtsService {
    constructor({ client } = {}) {
        this.client = client || null;
    }

    async synthesizeViaRest(text, {
        apiKey,
        languageCode,
        voiceName,
        speakingRate,
        pitch,
    }) {
        const url = new URL('https://texttospeech.googleapis.com/v1/text:synthesize');
        url.searchParams.set('key', apiKey);

        const requestBody = {
            input: { text },
            voice: {
                languageCode,
                name: voiceName,
            },
            audioConfig: {
                audioEncoding: 'OGG_OPUS',
                speakingRate,
                pitch,
            },
        };

        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
            const bodyText = await res.text().catch(() => '');
            throw new Error(`Google TTS REST request failed (${res.status}): ${bodyText || res.statusText}`);
        }

        const payload = await res.json();
        const audioContent = payload?.audioContent;
        if (typeof audioContent !== 'string' || audioContent.trim().length === 0) {
            throw new Error('Empty TTS audio content');
        }

        const buffer = Buffer.from(audioContent, 'base64');
        if (buffer.length === 0) {
            throw new Error('Empty TTS audio buffer');
        }

        return {
            buffer,
            mimeType: config.tts.mimeType,
        };
    }

    async getClient() {
        if (this.client) {
            return this.client;
        }

        const mod = await import('@google-cloud/text-to-speech');
        const TextToSpeechClient = mod?.TextToSpeechClient || mod?.default?.TextToSpeechClient || mod?.default;

        if (!TextToSpeechClient) {
            throw new Error('Failed to load @google-cloud/text-to-speech (TextToSpeechClient export not found).');
        }

        this.client = new TextToSpeechClient();
        return this.client;
    }

    validateText(text, maxChars) {
        if (typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Missing TTS text');
        }

        if (typeof maxChars === 'number' && Number.isFinite(maxChars) && maxChars > 0 && text.length > maxChars) {
            throw new Error(`TTS text exceeds max chars (${maxChars})`);
        }
    }

    async synthesizeToBuffer(text, {
        languageCode,
        voiceName,
        speakingRate,
        pitch,
        maxChars,
    } = {}) {
        if (config.tts?.provider !== 'google') {
            throw new Error(`TTS provider is not google (tts.provider=${config.tts?.provider || 'unknown'})`);
        }

        const selectedLanguageCode = typeof languageCode === 'string' && languageCode.trim().length > 0
            ? languageCode.trim()
            : config.tts.google.languageCode;
        const selectedVoiceName = typeof voiceName === 'string' && voiceName.trim().length > 0
            ? voiceName.trim()
            : config.tts.google.voiceName;
        const selectedSpeakingRate = Number.isFinite(speakingRate) ? speakingRate : config.tts.google.speakingRate;
        const selectedPitch = Number.isFinite(pitch) ? pitch : config.tts.google.pitch;
        const selectedMaxChars = Number.isFinite(maxChars) ? maxChars : config.tts.maxChars;

        this.validateText(text, selectedMaxChars);

        const apiKey = config.tts.google.apiKey;
        if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
            return this.synthesizeViaRest(text, {
                apiKey: apiKey.trim(),
                languageCode: selectedLanguageCode,
                voiceName: selectedVoiceName,
                speakingRate: selectedSpeakingRate,
                pitch: selectedPitch,
            });
        }

        const client = await this.getClient();

        const request = {
            input: { text },
            voice: {
                languageCode: selectedLanguageCode,
                name: selectedVoiceName,
            },
            audioConfig: {
                audioEncoding: 'OGG_OPUS',
                speakingRate: selectedSpeakingRate,
                pitch: selectedPitch,
            },
        };

        const [response] = await client.synthesizeSpeech(request);
        const audioContent = response?.audioContent;

        if (!audioContent) {
            throw new Error('Empty TTS audio content');
        }

        const buffer = Buffer.isBuffer(audioContent) ? audioContent : Buffer.from(audioContent);

        if (buffer.length === 0) {
            throw new Error('Empty TTS audio buffer');
        }

        return {
            buffer,
            mimeType: config.tts.mimeType,
        };
    }
}

module.exports = GoogleTtsService;
