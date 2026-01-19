const config = require('../config/config');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

class EdgeTtsService {
    constructor({ edgeTts } = {}) {
        this.edgeTts = edgeTts || null;
    }

    async getClient() {
        if (this.edgeTts) {
            return this.edgeTts;
        }

        const mod = await import('node-edge-tts');
        const EdgeTTS = mod?.EdgeTTS || mod?.default?.EdgeTTS || mod?.default;

        if (!EdgeTTS) {
            throw new Error('Failed to load node-edge-tts (EdgeTTS export not found).');
        }

        this.edgeTts = new EdgeTTS({
            voice: config.tts.voice,
            outputFormat: config.tts.outputFormat,
        });

        return this.edgeTts;
    }

    validateText(text, maxChars) {
        if (typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Missing TTS text');
        }

        if (typeof maxChars === 'number' && Number.isFinite(maxChars) && maxChars > 0 && text.length > maxChars) {
            throw new Error(`TTS text exceeds max chars (${maxChars})`);
        }
    }

    getFileExtension(outputFormat) {
        const format = typeof outputFormat === 'string' ? outputFormat.trim().toLowerCase() : '';
        if (format.startsWith('ogg-')) {
            return '.ogg';
        }
        if (format.startsWith('webm-')) {
            return '.webm';
        }
        if (format.startsWith('riff-')) {
            return '.wav';
        }
        if (format.startsWith('raw-')) {
            return '.pcm';
        }
        if (format.includes('mp3')) {
            return '.mp3';
        }

        return '.bin';
    }

    buildTempAudioPath(outputFormat) {
        const extension = this.getFileExtension(outputFormat);
        const randomId = crypto.randomBytes(12).toString('hex');
        return path.join(os.tmpdir(), `whatsapp-ai-tts-${randomId}${extension}`);
    }

    async synthesizeToBuffer(text, { voice, outputFormat, mimeType, maxChars } = {}) {
        const selectedVoice = typeof voice === 'string' && voice.trim().length > 0 ? voice.trim() : config.tts.voice;
        const selectedOutputFormat = typeof outputFormat === 'string' && outputFormat.trim().length > 0
            ? outputFormat.trim()
            : config.tts.outputFormat;
        const selectedMimeType = typeof mimeType === 'string' && mimeType.trim().length > 0 ? mimeType.trim() : config.tts.mimeType;
        const selectedMaxChars = Number.isFinite(maxChars) ? maxChars : config.tts.maxChars;

        this.validateText(text, selectedMaxChars);

        const client = await this.getClient();

        if (typeof selectedVoice === 'string' && selectedVoice.trim().length > 0) {
            client.voice = selectedVoice;
        }

        if (typeof selectedOutputFormat === 'string' && selectedOutputFormat.trim().length > 0) {
            client.outputFormat = selectedOutputFormat;
        }

        const fs = await import('node:fs/promises');
        const filePath = this.buildTempAudioPath(selectedOutputFormat);
        let buffer;

        try {
            await client.ttsPromise(text, filePath);
            buffer = await fs.readFile(filePath);
        } finally {
            await fs.unlink(filePath).catch(() => null);
        }

        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new Error('Empty TTS audio buffer');
        }

        return {
            buffer,
            filePath,
            mimeType: selectedMimeType,
        };
    }
}

module.exports = EdgeTtsService;
