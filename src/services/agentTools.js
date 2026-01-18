const CalService = require('./calService');
const EmailService = require('./emailService');
const { parseDateTimePtBr } = require('../utils/dateTimeParser');
const { DateTime } = require('luxon');

function getAgentTools({ enableBooking = true, enableEmail = true } = {}) {
    const tools = [];

    if (enableBooking) {
        tools.push({
            type: 'function',
            function: {
                name: 'interpretar_data_hora',
                description: 'Converte data/hora em português (ex: "amanhã 14h") para YYYY-MM-DD e HH:MM (America/Sao_Paulo)',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Texto com data/hora (ex: "amanhã 14h", "quinta 09:30", "hoje 16h")' },
                    },
                    required: ['text'],
                },
            },
        });

        tools.push({
            type: 'function',
            function: {
                name: 'criar_agendamento',
                description: 'Cria um agendamento no Cal.com e envia email de confirmação',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Nome do cliente' },
                        email: { type: 'string', description: 'Email do cliente' },
                        when: { type: 'string', description: 'Data e hora em português (ex: "amanhã 14h", "quinta-feira 09:30", "hoje 16h")' },
                        date: { type: 'string', description: 'Opcional. Data no formato YYYY-MM-DD' },
                        time: { type: 'string', description: 'Opcional. Hora no formato HH:MM' },
                    },
                    required: ['name', 'email'],
                },
            },
        });
    }

    if (enableEmail) {
        tools.push({
            type: 'function',
            function: {
                name: 'enviar_email_confirmacao',
                description: 'Envia email de confirmação via Resend',
                parameters: {
                    type: 'object',
                    properties: {
                        to: { type: 'string', description: 'Email de destino' },
                        name: { type: 'string', description: 'Nome do cliente' },
                        date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
                        time: { type: 'string', description: 'Hora no formato HH:MM' },
                        timeZone: { type: 'string', description: 'Opcional. Timezone (ex: America/Sao_Paulo)' },
                    },
                    required: ['to', 'name', 'date', 'time'],
                },
            },
        });
    }

    return tools;
}

async function interpretarDataHora(args) {
    const text = args?.text;
    if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Missing text');
    }

    return {
        success: true,
        ...parseDateTimePtBr({ text, zone: 'America/Sao_Paulo' }),
    };
}

async function criarAgendamento(args, { calService }) {
    const name = args?.name;
    const email = args?.email;

    if (typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('Missing name');
    }

    if (typeof email !== 'string' || email.trim().length === 0) {
        throw new Error('Missing email');
    }

    let date = args?.date;
    let time = args?.time;
    let timeZone = 'America/Sao_Paulo';

    if ((!date || !time) && args?.when) {
        const parsed = parseDateTimePtBr({ text: args.when, zone: timeZone });
        date = date || parsed.date;
        time = time || parsed.time;
        timeZone = parsed.timeZone || timeZone;
    }

    if (!date || !time) {
        throw new Error('Missing date/time. Provide "when" (ex: "amanhã 14h") or date+time.');
    }

    try {
        const result = await calService.createBooking({
            name,
            email,
            date,
            time,
            timeZone,
        });

        return {
            success: true,
            booking: result?.data || result,
            date,
            time,
            timeZone,
        };
    } catch (error) {
        const msg = error?.message || '';
        if (msg.includes("can't be booked") && msg.includes('GET /v2/slots')) {
            const tz = timeZone || 'America/Sao_Paulo';
            const desiredLocal = DateTime.fromISO(`${date}T${time}`, { zone: tz });

            const starts = await calService.getAvailableSlots({
                startDate: desiredLocal.toISODate(),
                endDate: desiredLocal.plus({ days: 7 }).toISODate(),
                timeZone: tz,
            });

            const options = (Array.isArray(starts) ? starts : [])
                .map((s) => DateTime.fromISO(s).setZone(tz))
                .filter((dt) => dt.isValid)
                .slice(0, 6)
                .map((dt) => ({
                    date: dt.toISODate(),
                    time: dt.toFormat('HH:mm'),
                    label: `${dt.toFormat('dd/LL')} ${dt.toFormat('HH:mm')}`,
                    timeZone: tz,
                }));

            return {
                success: false,
                error: 'slot_unavailable',
                message: 'Horário indisponível. Escolha um dos horários disponíveis.',
                desired: { date, time, timeZone: tz },
                options,
            };
        }

        throw error;
    }
}

async function enviarEmailConfirmacao(args, { emailService }) {
    const data = await emailService.sendBookingConfirmation({
        to: args.to,
        name: args.name,
        date: args.date,
        time: args.time,
        timeZone: args.timeZone,
    });

    return {
        success: true,
        email: data,
    };
}

function createToolDispatcher({ allowedTools, calService, emailService } = {}) {
    const deps = {
        calService: calService || new CalService(),
        emailService: emailService || new EmailService(),
    };

    const handlers = {
        interpretar_data_hora: (args) => interpretarDataHora(args),
        criar_agendamento: async (args) => {
            const bookingResult = await criarAgendamento(args, deps);
            if (!bookingResult || bookingResult.success !== true) {
                return bookingResult;
            }
            const emailResult = await deps.emailService.sendBookingConfirmation({
                to: args.email,
                name: args.name,
                date: bookingResult.date,
                time: bookingResult.time,
                timeZone: bookingResult.timeZone,
            });

            return {
                ...bookingResult,
                email: emailResult,
            };
        },
        enviar_email_confirmacao: (args) => enviarEmailConfirmacao(args, deps),
    };

    const allowed = allowedTools instanceof Set ? allowedTools : new Set(Object.keys(handlers));

    async function dispatchToolCall(toolCall) {
        const functionName = toolCall?.function?.name;
        const rawArgs = toolCall?.function?.arguments;

        if (!functionName || typeof functionName !== 'string') {
            throw new Error('Invalid tool call: missing function name');
        }

        const handler = handlers[functionName];
        if (!handler) {
            throw new Error(`Tool not found: ${functionName}`);
        }

        if (!allowed.has(functionName)) {
            throw new Error(`Tool disabled: ${functionName}`);
        }

        let parsedArgs = {};
        if (typeof rawArgs === 'string' && rawArgs.trim().length > 0) {
            parsedArgs = JSON.parse(rawArgs);
        }

        return await handler(parsedArgs);
    }

    return {
        dispatchToolCall,
    };
}

module.exports = {
    getAgentTools,
    createToolDispatcher,
};
