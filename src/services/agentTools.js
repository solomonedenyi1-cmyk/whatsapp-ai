const CalService = require('./calService');
const EmailService = require('./emailService');

function getAgentTools({ enableBooking = true, enableEmail = true } = {}) {
    const tools = [];

    if (enableBooking) {
        tools.push({
            type: 'function',
            function: {
                name: 'criar_agendamento',
                description: 'Cria um agendamento no Cal.com',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Nome do cliente' },
                        email: { type: 'string', description: 'Email do cliente' },
                        date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
                        time: { type: 'string', description: 'Hora no formato HH:MM' },
                        timeZone: { type: 'string', description: 'Timezone IANA (ex: America/Sao_Paulo)' },
                    },
                    required: ['name', 'email', 'date', 'time'],
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
                    },
                    required: ['to', 'name', 'date', 'time'],
                },
            },
        });
    }

    return tools;
}

async function criarAgendamento(args, { calService }) {
    const result = await calService.createBooking({
        name: args.name,
        email: args.email,
        date: args.date,
        time: args.time,
        timeZone: args.timeZone,
    });

    return {
        success: true,
        booking: result?.data || result,
    };
}

async function enviarEmailConfirmacao(args, { emailService }) {
    const data = await emailService.sendBookingConfirmation({
        to: args.to,
        name: args.name,
        date: args.date,
        time: args.time,
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
        criar_agendamento: (args) => criarAgendamento(args, deps),
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
