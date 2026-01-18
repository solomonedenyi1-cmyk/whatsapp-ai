function redactSecrets(input) {
    if (typeof input !== 'string') {
        return input;
    }

    let result = input;

    const envSecrets = [
        process.env.MISTRAL_API_KEY,
        process.env.OPENAI_API_KEY,
    ].filter((v) => typeof v === 'string' && v.trim().length > 0);

    for (const secret of envSecrets) {
        result = result.split(secret).join('[REDACTED]');
    }

    result = result.replace(/\bsk-[A-Za-z0-9]{10,}\b/g, '[REDACTED]');
    result = result.replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]');

    return result;
}

function redactError(error) {
    if (!error) return error;

    const message = redactSecrets(error.message);
    const stack = redactSecrets(error.stack);

    return {
        name: error.name,
        message,
        stack,
    };
}

module.exports = {
    redactSecrets,
    redactError,
};
