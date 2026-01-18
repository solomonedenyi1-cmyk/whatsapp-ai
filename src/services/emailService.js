const config = require('../config/config');
const { DateTime } = require('luxon');

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

    escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    formatBookingDateTime({ date, time, timeZone }) {
        const safeDate = String(date || '').trim();
        const safeTime = String(time || '').trim();
        const zone = (timeZone || config.cal?.defaultTimeZone || 'America/Sao_Paulo').trim();

        const dt = DateTime.fromISO(`${safeDate}T${safeTime}`, { zone }).setLocale('pt-BR');
        if (!dt.isValid) {
            return {
                label: `${safeDate} às ${safeTime}`,
                dateLabel: safeDate,
                timeLabel: safeTime,
                timeZone: zone,
            };
        }

        return {
            label: `${dt.toFormat("cccc, dd 'de' LLLL 'de' yyyy")} às ${dt.toFormat('HH:mm')}`,
            dateLabel: dt.toFormat("cccc, dd 'de' LLLL 'de' yyyy"),
            timeLabel: dt.toFormat('HH:mm'),
            timeZone: zone,
        };
    }

    buildConfirmationText({ name, date, time, timeZone }) {
        const safeName = String(name || '').trim();
        const formatted = this.formatBookingDateTime({ date, time, timeZone });
        const company = String(config.resend?.fromName || '').trim();

        return [
            `Olá ${safeName}!`,
            '',
            'Seu agendamento foi confirmado.',
            '',
            `Quando: ${formatted.label} (${formatted.timeZone})`,
            company ? `Organização: ${company}` : null,
            '',
            'Se precisar reagendar, responda este email.',
        ]
            .filter((line) => typeof line === 'string' && line.length > 0)
            .join('\n');
    }

    buildConfirmationHtml({ name, date, time, timeZone }) {
        const safeName = this.escapeHtml(String(name || '').trim());
        const formatted = this.formatBookingDateTime({ date, time, timeZone });
        const safeWhen = this.escapeHtml(formatted.label);
        const safeTz = this.escapeHtml(formatted.timeZone);

        const brand = this.escapeHtml(String(config.resend?.fromName || ''));

        return `
      <div style="margin:0;padding:0;background-color:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f6f8fb;padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e7ebf3;">
                <tr>
                  <td style="padding:20px 24px;background:linear-gradient(135deg,#111827,#1f2937);color:#ffffff;">
                    <div style="font-size:14px;opacity:0.9;">${brand}</div>
                    <div style="font-size:18px;font-weight:700;line-height:1.25;margin-top:6px;">Agendamento confirmado</div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:22px 24px;color:#111827;">
                    <div style="font-size:16px;line-height:1.5;">Olá <strong>${safeName}</strong>,</div>
                    <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#374151;">Seu agendamento foi confirmado com sucesso.</div>

                    <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:#f3f4f6;border:1px solid #e5e7eb;">
                      <div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">Quando</div>
                      <div style="margin-top:6px;font-size:16px;font-weight:700;color:#111827;">${safeWhen}</div>
                      <div style="margin-top:4px;font-size:13px;color:#6b7280;">Horário: ${safeTz}</div>
                    </div>

                    <div style="margin-top:18px;font-size:13px;line-height:1.6;color:#374151;">
                      Se você precisar reagendar, basta responder este email informando um novo horário.
                    </div>

                    <hr style="margin:22px 0;border:none;border-top:1px solid #e5e7eb;" />

                    <div style="font-size:12px;line-height:1.6;color:#6b7280;">
                      Este email foi enviado automaticamente. Se você não solicitou este agendamento, responda esta mensagem.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
    }

    async sendBookingConfirmation({ to, name, date, time, timeZone }) {
        this.validateConfig();

        const client = await this.getClient();

        const formatted = this.formatBookingDateTime({ date, time, timeZone });

        const { data, error } = await client.emails.send({
            from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
            to: [to],
            subject: `Agendamento confirmado - ${formatted.dateLabel} ${formatted.timeLabel}`,
            html: this.buildConfirmationHtml({ name, date, time, timeZone }),
            text: this.buildConfirmationText({ name, date, time, timeZone }),
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
