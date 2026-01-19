async function resolveStableChatId({ rawChatId, message = null, chat = null } = {}) {
    const candidate = typeof rawChatId === 'string' ? rawChatId : '';
    if (!candidate) {
        return null;
    }

    const isLid = candidate.endsWith('@lid');
    if (!isLid) {
        return candidate;
    }

    const chatSerialized = chat?.id?._serialized;
    if (typeof chatSerialized === 'string' && chatSerialized.length > 0 && !chatSerialized.endsWith('@lid')) {
        return chatSerialized;
    }

    try {
        if (message && typeof message.getContact === 'function') {
            const contact = await message.getContact();
            const serialized = contact?.id?._serialized;
            if (typeof serialized === 'string' && serialized.length > 0 && !serialized.endsWith('@lid')) {
                return serialized;
            }
        }
    } catch {
        // non-critical
    }

    return candidate;
}

module.exports = {
    resolveStableChatId,
};
