const test = require('node:test');
const assert = require('node:assert/strict');

const { parseEnvBoolean } = require('../src/utils/env');

test('parseEnvBoolean returns default for empty values', async () => {
    assert.equal(parseEnvBoolean(undefined, false), false);
    assert.equal(parseEnvBoolean(undefined, true), true);
    assert.equal(parseEnvBoolean('', true), true);
});

test('parseEnvBoolean parses common truthy/falsey strings', async () => {
    assert.equal(parseEnvBoolean('true', false), true);
    assert.equal(parseEnvBoolean('1', false), true);
    assert.equal(parseEnvBoolean('yes', false), true);
    assert.equal(parseEnvBoolean('on', false), true);

    assert.equal(parseEnvBoolean('false', true), false);
    assert.equal(parseEnvBoolean('0', true), false);
    assert.equal(parseEnvBoolean('no', true), false);
    assert.equal(parseEnvBoolean('off', true), false);
});

test('parseEnvBoolean throws for invalid values', async () => {
    assert.throws(() => parseEnvBoolean('maybe', false), /Invalid boolean environment value/);
});
