const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config/config');
const EmailService = require('../src/services/emailService');

test('EmailService.sendBookingConfirmation builds html, text and subject', async () => {
    const previousResend = { ...config.resend };
    const previousCal = { ...config.cal };

    config.resend.apiKey = 'test-resend-key';
    config.resend.fromName = 'YoungCostumer by Yuri Cunha';
    config.resend.fromEmail = '[email protected]';
    config.cal.defaultTimeZone = 'America/Sao_Paulo';

    let capturedPayload = null;

    const fakeResendClient = {
        emails: {
            send: async (payload) => {
                capturedPayload = payload;
                return { data: { id: 'email_1' }, error: null };
            },
        },
    };

    const service = new EmailService({ resendClient: fakeResendClient });

    const result = await service.sendBookingConfirmation({
        to: '[email protected]',
        name: 'Silvio <Pinheiro>',
        date: '2026-01-22',
        time: '10:00',
        timeZone: 'America/Sao_Paulo',
    });

    assert.deepEqual(result, { id: 'email_1' });
    assert.ok(capturedPayload);

    assert.equal(capturedPayload.from, 'YoungCostumer by Yuri Cunha <[email protected]>');
    assert.deepEqual(capturedPayload.to, ['[email protected]']);

    assert.equal(typeof capturedPayload.subject, 'string');
    assert.ok(capturedPayload.subject.startsWith('Agendamento confirmado - '));
    assert.ok(capturedPayload.subject.includes('10:00'));

    assert.equal(typeof capturedPayload.html, 'string');
    assert.ok(capturedPayload.html.includes('Agendamento confirmado'));
    assert.ok(capturedPayload.html.includes('Silvio &lt;Pinheiro&gt;'));
    assert.ok(capturedPayload.html.includes('America/Sao_Paulo'));

    assert.equal(typeof capturedPayload.text, 'string');
    assert.ok(capturedPayload.text.includes('Seu agendamento foi confirmado.'));
    assert.ok(capturedPayload.text.includes('Quando:'));
    assert.ok(capturedPayload.text.includes('America/Sao_Paulo'));

    config.resend.apiKey = previousResend.apiKey;
    config.resend.fromName = previousResend.fromName;
    config.resend.fromEmail = previousResend.fromEmail;
    config.cal.defaultTimeZone = previousCal.defaultTimeZone;
});
