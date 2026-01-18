const { DateTime } = require('luxon');

const weekdayMap = {
    segunda: 1,
    "segunda-feira": 1,
    terca: 2,
    "terça": 2,
    "terça-feira": 2,
    "terca-feira": 2,
    quarta: 3,
    "quarta-feira": 3,
    quinta: 4,
    "quinta-feira": 4,
    sexta: 5,
    "sexta-feira": 5,
    sabado: 6,
    "sábado": 6,
    "sábado-feira": 6,
    "sabado-feira": 6,
    domingo: 7,
};

function normalizeText(text) {
    return String(text || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ');
}

function parseTimeFromText(text) {
    const normalized = normalizeText(text);

    const colonMatch = normalized.match(/\b(\d{1,2}):(\d{2})\b/);
    if (colonMatch) {
        const hour = Number(colonMatch[1]);
        const minute = Number(colonMatch[2]);

        if (Number.isNaN(hour) || Number.isNaN(minute)) {
            return null;
        }

        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }

        const hh = String(hour).padStart(2, '0');
        const mm = String(minute).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    const hMatch = normalized.match(/\b(\d{1,2})h(\d{2})?\b/);
    if (!hMatch) {
        return null;
    }

    const hour = Number(hMatch[1]);
    const minute = hMatch[2] ? Number(hMatch[2]) : 0;

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
        return null;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }

    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    return `${hh}:${mm}`;
}

function parseExplicitDateFromText(text, now, zone) {
    const normalized = normalizeText(text);

    const isoMatch = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
        const dt = DateTime.fromISO(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, { zone }).startOf('day');
        return dt.isValid ? dt : null;
    }

    const brMatch = normalized.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (!brMatch) {
        return null;
    }

    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    let year = brMatch[3] ? Number(brMatch[3]) : now.year;

    if (brMatch[3] && brMatch[3].length === 2) {
        year += 2000;
    }

    let dt = DateTime.fromObject({ year, month, day }, { zone }).startOf('day');
    if (!dt.isValid) {
        return null;
    }

    if (!brMatch[3] && dt < now.startOf('day')) {
        dt = dt.plus({ years: 1 });
    }

    return dt;
}

function parseWeekdayFromText(text) {
    const normalized = normalizeText(text);
    const tokens = normalized.split(' ');

    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (weekdayMap[token]) {
            return weekdayMap[token];
        }

        if (i + 1 < tokens.length) {
            const two = `${tokens[i]} ${tokens[i + 1]}`;
            if (weekdayMap[two]) {
                return weekdayMap[two];
            }
        }
    }

    return null;
}

function nextOccurrenceOfWeekday(now, targetWeekday) {
    const currentWeekday = now.weekday; // 1..7
    let daysToAdd = targetWeekday - currentWeekday;
    if (daysToAdd <= 0) {
        daysToAdd += 7;
    }

    return now.plus({ days: daysToAdd }).startOf('day');
}

function parseDateTimePtBr({ text, zone, now = null }) {
    const safeZone = zone || 'America/Sao_Paulo';
    const baseNow = (now ? DateTime.fromJSDate(now) : DateTime.now()).setZone(safeZone);

    const normalized = normalizeText(text);
    if (!normalized) {
        throw new Error('Missing date/time text');
    }

    const time = parseTimeFromText(normalized);
    if (!time) {
        throw new Error('Missing time (ex: 14h, 14:30)');
    }

    const explicitDate = parseExplicitDateFromText(normalized, baseNow, safeZone);
    if (explicitDate) {
        const date = explicitDate.toISODate();
        return { date, time, timeZone: safeZone };
    }

    if (normalized.includes('hoje')) {
        const candidate = baseNow.startOf('day');
        const dt = DateTime.fromISO(`${candidate.toISODate()}T${time}`, { zone: safeZone });

        if (dt < baseNow) {
            return { date: baseNow.plus({ days: 1 }).toISODate(), time, timeZone: safeZone };
        }

        return { date: candidate.toISODate(), time, timeZone: safeZone };
    }

    if (normalized.includes('amanha')) {
        return { date: baseNow.plus({ days: 1 }).toISODate(), time, timeZone: safeZone };
    }

    const weekday = parseWeekdayFromText(normalized);
    if (weekday) {
        let day = nextOccurrenceOfWeekday(baseNow, weekday);
        const dt = DateTime.fromISO(`${day.toISODate()}T${time}`, { zone: safeZone });

        if (dt < baseNow) {
            day = day.plus({ days: 7 });
        }

        return { date: day.toISODate(), time, timeZone: safeZone };
    }

    const dtToday = DateTime.fromISO(`${baseNow.toISODate()}T${time}`, { zone: safeZone });
    if (dtToday.isValid && dtToday >= baseNow) {
        return { date: baseNow.toISODate(), time, timeZone: safeZone };
    }

    return { date: baseNow.plus({ days: 1 }).toISODate(), time, timeZone: safeZone };
}

module.exports = {
    parseDateTimePtBr,
};
