const config = require('../config/config');
const { DateTime } = require('luxon');

class CalService {
    constructor({ fetchImpl } = {}) {
        this.fetchImpl = fetchImpl || global.fetch;
    }

    validateConfig() {
        if (!config.cal?.apiKey) {
            throw new Error('Missing CAL_API_KEY in environment.');
        }

        if (!config.cal?.apiVersion) {
            throw new Error('Missing CAL_API_VERSION configuration.');
        }

        if (!config.cal?.apiUrl) {
            throw new Error('Missing CAL_API_URL configuration.');
        }

        if (!config.cal?.eventTypeId) {
            throw new Error('Missing CAL_EVENT_TYPE_ID in environment.');
        }

        if (typeof this.fetchImpl !== 'function') {
            throw new Error('fetch is not available in this runtime.');
        }
    }

    buildStartDateTimeUtc({ date, time, timeZone }) {
        const zone = timeZone || config.cal.defaultTimeZone;
        const dt = DateTime.fromISO(`${date}T${time}`, { zone });

        if (!dt.isValid) {
            throw new Error(`Invalid date/time input: ${dt.invalidReason || 'unknown'}`);
        }

        return dt.toUTC().toISO({ suppressMilliseconds: true });
    }

    async createBooking({ name, email, date, time, timeZone }) {
        this.validateConfig();

        const start = this.buildStartDateTimeUtc({ date, time, timeZone });
        const attendeeTimeZone = timeZone || config.cal.defaultTimeZone;

        const url = `${config.cal.apiUrl.replace(/\/$/, '')}/v2/bookings`;

        const res = await this.fetchImpl(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.cal.apiKey}`,
                'cal-api-version': config.cal.apiVersion,
            },
            body: JSON.stringify({
                start,
                eventTypeId: config.cal.eventTypeId,
                attendee: {
                    name,
                    email,
                    timeZone: attendeeTimeZone,
                },
            }),
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
            const message = body?.error?.message || body?.message || `Cal API error (${res.status})`;
            const error = new Error(message);
            error.status = res.status;
            error.details = body;
            throw error;
        }

        return body;
    }
}

module.exports = CalService;
