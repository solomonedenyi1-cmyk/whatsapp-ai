const test = require('node:test');
const assert = require('node:assert/strict');

const { createToolDispatcher } = require('../src/services/agentTools');

function createToolCall({ name, args, id = 'call_1' }) {
    return {
        id,
        function: {
            name,
            arguments: JSON.stringify(args || {}),
        },
    };
}

test('createToolDispatcher blocks tool calls when tool is not allowed', async () => {
    const dispatcher = createToolDispatcher({
        allowedTools: new Set(['enviar_email_confirmacao']),
        calService: {
            createBooking: async () => ({ data: { id: 123 } }),
        },
        emailService: {
            sendBookingConfirmation: async () => ({ id: 'email_1' }),
        },
    });

    await assert.rejects(
        () => dispatcher.dispatchToolCall(createToolCall({ name: 'criar_agendamento' })),
        /Tool disabled: criar_agendamento/
    );
});

test('createToolDispatcher executes allowed tool calls', async () => {
    const dispatcher = createToolDispatcher({
        allowedTools: new Set(['criar_agendamento']),
        calService: {
            createBooking: async () => ({ data: { id: 999 } }),
        },
        emailService: {
            sendBookingConfirmation: async () => ({ id: 'email_1' }),
        },
    });

    const result = await dispatcher.dispatchToolCall(
        createToolCall({
            name: 'criar_agendamento',
            args: {
                name: 'Jane',
                email: 'jane@example.com',
                date: '2026-01-19',
                time: '14:00',
            },
        })
    );

    assert.equal(result.success, true);
    assert.equal(result.booking.id, 999);
});
