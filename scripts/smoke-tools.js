require('dotenv').config();

const config = require('../src/config/config');
const CalService = require('../src/services/calService');
const EmailService = require('../src/services/emailService');
const { parseDateTimePtBr } = require('../src/utils/dateTimeParser');
const { DateTime } = require('luxon');

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

    const desiredLocal = DateTime.fromISO(`${parsed.date}T${parsed.time}`, { zone: parsed.timeZone });
    const slots = await cal.getAvailableSlots({
        startDate: desiredLocal.toISODate(),
        endDate: desiredLocal.plus({ days: 7 }).toISODate(),
        timeZone: parsed.timeZone,
    });

    if (!Array.isArray(slots) || slots.length === 0) {
        throw new Error('No available slots returned by Cal.com');
    }

    const slotDts = slots
        .map((s) => ({ raw: s, dt: DateTime.fromISO(s).setZone(parsed.timeZone) }))
        .filter((x) => x.dt.isValid);

    const nextOrEqual = slotDts.find((x) => x.dt >= desiredLocal);
    const chosen = nextOrEqual || slotDts[0];
    const chosenUtc = chosen.dt.toUTC().toISO({ suppressMilliseconds: true });

    console.log('desired:', desiredLocal.toISO());
    console.log('chosen slot:', chosen.dt.toISO());

    const booking = await cal.createBooking({
        name,
        email,
        date: parsed.date,
        time: parsed.time,
        timeZone: parsed.timeZone,
        startUtc: chosenUtc,
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
    if (err && err.details) {
        console.error('details:', JSON.stringify(err.details, null, 2));
    }
    process.exitCode = 1;
});
