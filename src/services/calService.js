const config = require('../config/config');
const { DateTime } = require('luxon');

const calSlotsApiVersion = '2024-09-04';

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

    async getAvailableSlots({ startDate, endDate, timeZone }) {
        this.validateConfig();

        const tz = timeZone || config.cal.defaultTimeZone;
        const qs = new URLSearchParams({
            eventTypeId: String(config.cal.eventTypeId),
            start: startDate,
            end: endDate,
            timeZone: tz,
            format: 'range',
        });

        const url = `${config.cal.apiUrl.replace(/\/$/, '')}/v2/slots?${qs.toString()}`;

        const res = await this.fetchImpl(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.cal.apiKey}`,
                'cal-api-version': calSlotsApiVersion,
            },
        });

        const raw = await res.text().catch(() => null);
        let body = null;
        if (typeof raw === 'string' && raw.length > 0) {
            try {
                body = JSON.parse(raw);
            } catch {
                body = null;
            }
        }

        if (!res.ok) {
            const message = body?.error?.message || body?.message || `Cal API error (${res.status})`;
            const error = new Error(message);
            error.status = res.status;
            error.details = body || { raw };
            throw error;
        }

        const data = body?.data;
        if (!data || typeof data !== 'object') {
            return [];
        }

        const starts = [];
        for (const value of Object.values(data)) {
            if (!Array.isArray(value)) {
                continue;
            }

            for (const slot of value) {
                if (typeof slot === 'string' && slot.length > 0) {
                    starts.push(slot);
                    continue;
                }

                const start = slot?.start;
                if (typeof start === 'string' && start.length > 0) {
                    starts.push(start);
                }
            }
        }

        return starts;
    }

    async createBooking({ name, email, date, time, timeZone, startUtc = null }) {
        this.validateConfig();

        const start = startUtc || this.buildStartDateTimeUtc({ date, time, timeZone });
        const attendeeTimeZone = timeZone || config.cal.defaultTimeZone;

        const url = `${config.cal.apiUrl.replace(/\/$/, '')}/v2/bookings`;

        const payload = {
            start,
            eventTypeId: config.cal.eventTypeId,
            // API v2 field for custom booking fields (safe default)
            bookingFieldsResponses: {
                title: `Atendimento - ${name}`,
            },
            attendee: {
                name,
                email,
                timeZone: attendeeTimeZone,
            },
        };

        if (config.env?.debug) {
            console.log('cal.createBooking request', {
                url,
                apiVersion: config.cal.apiVersion,
                eventTypeId: config.cal.eventTypeId,
                payloadKeys: Object.keys(payload),
            });
        }

        const res = await this.fetchImpl(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.cal.apiKey}`,
                'cal-api-version': config.cal.apiVersion,
            },
            body: JSON.stringify(payload),
        });

        const raw = await res.text().catch(() => null);
        let body = null;
        if (typeof raw === 'string' && raw.length > 0) {
            try {
                body = JSON.parse(raw);
            } catch {
                body = null;
            }
        }

        if (!res.ok) {
            const message = body?.error?.message || body?.message || `Cal API error (${res.status})`;
            const error = new Error(message);
            error.status = res.status;
            error.details = body || { raw };
            throw error;
        }

        return body;
    }
}

module.exports = CalService;
