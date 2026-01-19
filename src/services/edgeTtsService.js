const config = require('../config/config');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const dns = require('node:dns');

class EdgeTtsService {
    constructor({ edgeTts } = {}) {
        this.edgeTts = edgeTts || null;
        this.dnsConfigured = false;
    }

    configureDns() {
        if (this.dnsConfigured) {
            return;
        }

        this.dnsConfigured = true;

        const order = config.tts?.dnsResultOrder;
        if (!order || typeof order !== 'string' || order.trim().length === 0) {
            return;
        }

        if (typeof dns.setDefaultResultOrder !== 'function') {
            return;
        }

        try {
            dns.setDefaultResultOrder(order.trim());
        } catch (error) {
            if (config.env?.debug) {
                console.warn('⚠️ Failed to set dns result order for TTS:', error?.message || error);
            }
        }
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
            lang: config.tts.lang,
            outputFormat: config.tts.outputFormat,
            proxy: config.tts.proxy || undefined,
            timeout: config.tts.timeoutMs,
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

    async synthesizeToBuffer(text, {
        voice,
        lang,
        outputFormat,
        mimeType,
        maxChars,
        timeoutMs,
        proxy,
    } = {}) {
        const selectedVoice = typeof voice === 'string' && voice.trim().length > 0 ? voice.trim() : config.tts.voice;
        const selectedLang = typeof lang === 'string' && lang.trim().length > 0 ? lang.trim() : config.tts.lang;
        const selectedOutputFormat = typeof outputFormat === 'string' && outputFormat.trim().length > 0
            ? outputFormat.trim()
            : config.tts.outputFormat;
        const selectedMimeType = typeof mimeType === 'string' && mimeType.trim().length > 0 ? mimeType.trim() : config.tts.mimeType;
        const selectedMaxChars = Number.isFinite(maxChars) ? maxChars : config.tts.maxChars;
        const selectedTimeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : config.tts.timeoutMs;
        const selectedProxy = typeof proxy === 'string' && proxy.trim().length > 0
            ? proxy.trim()
            : (config.tts.proxy || null);

        this.validateText(text, selectedMaxChars);

        this.configureDns();

        const client = await this.getClient();

        if (typeof selectedVoice === 'string' && selectedVoice.trim().length > 0) {
            client.voice = selectedVoice;
        }

        if (typeof selectedLang === 'string' && selectedLang.trim().length > 0) {
            client.lang = selectedLang;
        }

        if (typeof selectedOutputFormat === 'string' && selectedOutputFormat.trim().length > 0) {
            client.outputFormat = selectedOutputFormat;
        }

        if (Number.isFinite(selectedTimeoutMs) && selectedTimeoutMs > 0) {
            client.timeout = selectedTimeoutMs;
        }

        if (selectedProxy) {
            client.proxy = selectedProxy;
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
