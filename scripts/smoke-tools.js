require('dotenv').config();

const config = require('../src/config/config');
const CalService = require('../src/services/calService');
const EmailService = require('../src/services/emailService');
const { parseDateTimePtBr } = require('../src/utils/dateTimeParser');

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i += 1) {
        const key = argv[i];
        if (!key.startsWith('--')) {
            continue;
        }

        const name = key.slice(2);
        const next = argv[i + 1];

        if (!next || next.startsWith('--')) {
            args[name] = true;
            continue;
        }

        args[name] = next;
        i += 1;
    }

    return args;
}

async function main() {
    const args = parseArgs(process.argv);
    const execute = Boolean(args.execute);

    const name = String(args.name || '').trim();
    const email = String(args.email || '').trim();
    const when = String(args.when || 'amanhã 14h').trim();

    if (!name) {
        throw new Error('Missing --name');
    }

    if (!email) {
        throw new Error('Missing --email');
    }

    const parsed = parseDateTimePtBr({ text: when, zone: 'America/Sao_Paulo' });

    const cal = new CalService();
    const mail = new EmailService();

    if (!execute) {
        // Validate config without doing side-effects
        cal.validateConfig();
        mail.validateConfig();

        console.log('✅ smoke:tools dry-run');
        console.log('config.cal.eventTypeId:', config.cal.eventTypeId);
        console.log('from:', `${config.resend.fromName} <${config.resend.fromEmail}>`);
        console.log('to:', email);
        console.log('when input:', when);
        console.log('parsed:', parsed);
        console.log('To actually create booking + send email, run with --execute');
        return;
    }

    console.log('⚠️ smoke:tools execute mode: creating booking + sending email');

    const booking = await cal.createBooking({
        name,
        email,
        date: parsed.date,
        time: parsed.time,
        timeZone: parsed.timeZone,
    });

    const sent = await mail.sendBookingConfirmation({
        to: email,
        name,
        date: parsed.date,
        time: parsed.time,
    });

    console.log('✅ booking created:', booking?.data?.id || booking?.data?.uid || booking?.data || booking);
    console.log('✅ email sent:', sent);
}

main().catch((err) => {
    console.error('❌ smoke:tools failed:', err?.message || err);
    process.exitCode = 1;
});
