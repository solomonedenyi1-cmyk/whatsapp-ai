function generateRequestId(prefix = '') {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return prefix ? `${prefix}_${suffix}` : suffix;
}

module.exports = {
    generateRequestId,
};
