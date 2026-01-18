process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'test_api_key_1234567890';

const WhatsAppBot = require('../src/bot/whatsappBot');

function createFakeClient() {
    const listeners = new Map();

    return {
        on: (event, handler) => {
            const arr = listeners.get(event) || [];
            arr.push(handler);
            listeners.set(event, arr);
        },
        once: (event, handler) => {
            const wrapper = (...args) => {
                handler(...args);
                const arr = listeners.get(event) || [];
                listeners.set(
                    event,
                    arr.filter(h => h !== wrapper)
                );
            };
            const arr = listeners.get(event) || [];
            arr.push(wrapper);
            listeners.set(event, arr);
        },
        off: (event, handler) => {
            const arr = listeners.get(event) || [];
            listeners.set(
                event,
                arr.filter(h => h !== handler)
            );
        },
        emit: (event, ...args) => {
            const arr = listeners.get(event) || [];
            for (const handler of arr) {
                handler(...args);
            }
        }
    };
}

describe('WhatsAppBot.waitForClientReady', () => {
    test('resolves when client emits ready', async () => {
        const bot = Object.create(WhatsAppBot.prototype);
        const client = createFakeClient();
        bot.client = client;

        const promise = bot.waitForClientReady();
        client.emit('ready');

        await expect(promise).resolves.toBeUndefined();
    });

    test('rejects when client emits auth_failure', async () => {
        const bot = Object.create(WhatsAppBot.prototype);
        const client = createFakeClient();
        bot.client = client;

        const promise = bot.waitForClientReady();
        client.emit('auth_failure', 'bad session');

        await expect(promise).rejects.toThrow('WhatsApp authentication failed: bad session');
    });

    test('rejects when client emits error', async () => {
        const bot = Object.create(WhatsAppBot.prototype);
        const client = createFakeClient();
        bot.client = client;

        const promise = bot.waitForClientReady();
        client.emit('error', new Error('boom'));

        await expect(promise).rejects.toThrow('boom');
    });
});
