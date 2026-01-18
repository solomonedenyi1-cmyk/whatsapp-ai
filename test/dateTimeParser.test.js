const test = require('node:test');
const assert = require('node:assert/strict');

const { DateTime } = require('luxon');
const { parseDateTimePtBr } = require('../src/utils/dateTimeParser');

test('parseDateTimePtBr parses "amanhã 14h" relative to now', async () => {
    const now = DateTime.fromISO('2026-01-18T10:00:00', { zone: 'America/Sao_Paulo' }).toJSDate();
    const result = parseDateTimePtBr({ text: 'amanhã 14h', zone: 'America/Sao_Paulo', now });

    assert.deepEqual(result, {
        date: '2026-01-19',
        time: '14:00',
        timeZone: 'America/Sao_Paulo',
    });
});

test('parseDateTimePtBr parses "hoje 9h" and rolls to tomorrow if time already passed', async () => {
    const now = DateTime.fromISO('2026-01-18T10:00:00', { zone: 'America/Sao_Paulo' }).toJSDate();
    const result = parseDateTimePtBr({ text: 'hoje 9h', zone: 'America/Sao_Paulo', now });

    assert.deepEqual(result, {
        date: '2026-01-19',
        time: '09:00',
        timeZone: 'America/Sao_Paulo',
    });
});

test('parseDateTimePtBr parses weekday ("quinta 14h") to next occurrence', async () => {
    // 2026-01-18 is Sunday
    const now = DateTime.fromISO('2026-01-18T10:00:00', { zone: 'America/Sao_Paulo' }).toJSDate();
    const result = parseDateTimePtBr({ text: 'quinta 14h', zone: 'America/Sao_Paulo', now });

    assert.deepEqual(result, {
        date: '2026-01-22',
        time: '14:00',
        timeZone: 'America/Sao_Paulo',
    });
});
