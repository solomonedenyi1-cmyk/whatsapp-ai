function parseEnvBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value !== 'string') {
        throw new Error('Invalid boolean environment value type');
    }

    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
        return false;
    }

    throw new Error(`Invalid boolean environment value: ${value}`);
}

module.exports = {
    parseEnvBoolean,
};
