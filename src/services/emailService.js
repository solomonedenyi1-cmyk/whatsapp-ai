const config = require('../config/config');

let resendModulePromise = null;

async function loadResendModule() {
    if (!resendModulePromise) {
        resendModulePromise = import('resend');
    }

    return resendModulePromise;
}

class EmailService {
    constructor({ resendClient } = {}) {
        this.client = resendClient || null;
    }

    validateConfig() {
        if (!config.resend?.apiKey) {
            throw new Error('Missing RESEND_API_KEY in environment.');
        }

        if (!config.resend?.fromEmail) {
            throw new Error('Missing RESEND_FROM_EMAIL in environment.');
        }

        if (!config.resend?.fromName) {
            throw new Error('Missing RESEND_FROM_NAME in environment.');
        }
    }

    async getClient() {
        if (this.client) {
            return this.client;
        }

        this.validateConfig();

        const mod = await loadResendModule();
        const Resend = mod?.Resend || mod?.default?.Resend || mod?.default;

        if (!Resend) {
            throw new Error('Failed to load resend SDK (Resend export not found).');
        }

        this.client = new Resend(config.resend.apiKey);
        return this.client;
    }

    buildConfirmationHtml({ name, date, time }) {
        const safeName = String(name || '').trim();
        const safeDate = String(date || '').trim();
        const safeTime = String(time || '').trim();

        return `
      <h2>Olá ${safeName}!</h2>
      <p>Seu agendamento foi confirmado para:</p>
      <p><strong>📅 ${safeDate} às ${safeTime}</strong></p>
    `;
    }

    async sendBookingConfirmation({ to, name, date, time }) {
        this.validateConfig();

        const client = await this.getClient();

        const { data, error } = await client.emails.send({
            from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
            to: [to],
            subject: 'Agendamento Confirmado',
            html: this.buildConfirmationHtml({ name, date, time }),
        });

        if (error) {
            const err = new Error(error?.message || 'Failed to send email');
            err.details = error;
            throw err;
        }

        return data;
    }
}

module.exports = EmailService;
