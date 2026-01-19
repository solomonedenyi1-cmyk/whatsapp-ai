const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../src/config/config');
const AdminService = require('../src/services/adminService');

test('AdminService treats clear as an admin-only command', async () => {
    const previous = config.admin.whatsappNumber;
    const previousList = config.admin.whatsappNumbers;

    config.admin.whatsappNumber = '5511999999999@c.us';
    config.admin.whatsappNumbers = ['5511999999999@c.us'];

    const service = new AdminService();

    assert.equal(service.isAdminCommand('clear'), true);
    assert.equal(service.isAdminCommand('reset'), true);

    config.admin.whatsappNumber = previous;
    config.admin.whatsappNumbers = previousList;
});
