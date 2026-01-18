const config = require('../config/config');

async function safeSendSeen(chatId, chat, client, debug = config.env.debug) {
    try {
        if (chatId && typeof chatId === 'string' && chatId.endsWith('@lid')) {
            return;
        }

        if (chat && typeof chat.sendSeen === 'function') {
            await chat.sendSeen();
            return;
        }

        if (client && typeof client.sendSeen === 'function') {
            await client.sendSeen(chatId);
        }
    } catch (error) {
        if (debug) {
            console.warn(`⚠️ Could not send seen for ${chatId}:`, error?.message || error);
        }
    }
}

async function safeSendMessage(chatId, text, { message = null, chat = null, client = null, debug = config.env.debug } = {}) {
    let lastError = null;

    const isLidChat = chatId && typeof chatId === 'string' && chatId.endsWith('@lid');

    if (isLidChat && client && typeof client.sendMessage === 'function') {
        try {
            await client.sendMessage(chatId, text, { sendSeen: false });
            return;
        } catch (error) {
            lastError = error;
        }
    }

    if (message && typeof message.reply === 'function') {
        try {
            await message.reply(text);
            return;
        } catch (error) {
            lastError = error;
        }
    }

    if (chat && typeof chat.sendMessage === 'function') {
        try {
            await chat.sendMessage(text);
            return;
        } catch (error) {
            lastError = error;
        }
    }

    if (!client || typeof client.sendMessage !== 'function') {
        throw lastError || new Error('No available method to send message');
    }

    let targetId = chatId;
    if (targetId && typeof targetId === 'string' && targetId.endsWith('@lid')) {
        targetId = null;

        try {
            if (message && typeof message.getContact === 'function') {
                const contact = await message.getContact();
                const serialized = contact?.id?._serialized;
                if (typeof serialized === 'string' && !serialized.endsWith('@lid')) {
                    targetId = serialized;
                }
            }
        } catch (error) {
            lastError = error;
        }
    }

    if (!targetId) {
        if (debug) {
            console.warn(`⚠️ Could not resolve send target for ${chatId}`);
        }
        throw lastError || new Error('Could not resolve send target');
    }

    try {
        await client.sendMessage(targetId, text, { sendSeen: false });
        return;
    } catch (error) {
        lastError = error;
    }

    throw lastError || new Error('No available method to send message');
}

module.exports = {
    safeSendSeen,
    safeSendMessage,
};
