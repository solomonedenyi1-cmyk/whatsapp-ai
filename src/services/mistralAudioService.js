const config = require('../config/config');

class MistralAudioService {
    constructor({ fetchImpl } = {}) {
        this.apiKey = config.mistral.apiKey;
        this.baseUrl = 'https://api.mistral.ai/v1';
        this.fetch = fetchImpl || globalThis.fetch;
    }

    validateConfig() {
        if (!this.apiKey) {
            throw new Error('Missing MISTRAL_API_KEY in environment.');
        }

        if (!this.fetch) {
            throw new Error('Global fetch is not available. Node 20+ is required.');
        }
    }

    async transcribeAudio({ buffer, mimeType, fileName, model = 'voxtral-mini-latest', language } = {}) {
        this.validateConfig();

        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new Error('Missing audio buffer');
        }

        const safeFileName = typeof fileName === 'string' && fileName.trim().length > 0
            ? fileName.trim()
            : 'audio.ogg';

        const contentType = typeof mimeType === 'string' && mimeType.trim().length > 0
            ? mimeType.trim()
            : 'application/octet-stream';

        const form = new FormData();
        form.append('model', model);

        if (typeof language === 'string' && language.trim().length > 0) {
            form.append('language', language.trim());
        }

        form.append('file', new Blob([buffer], { type: contentType }), safeFileName);

        const response = await this.fetch(`${this.baseUrl}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: form,
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Mistral transcription failed (${response.status}): ${text || response.statusText}`);
        }

        const data = await response.json();

        if (!data || typeof data.text !== 'string') {
            throw new Error('Invalid response format from Mistral Audio Transcriptions API');
        }

        return data;
    }
}

module.exports = MistralAudioService;
