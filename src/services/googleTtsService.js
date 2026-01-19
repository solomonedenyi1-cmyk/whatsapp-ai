const config = require('../config/config');

class GoogleTtsService {
    constructor({ client } = {}) {
        this.client = client || null;
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
