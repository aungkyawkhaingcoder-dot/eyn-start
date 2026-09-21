const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.ACCESS_TOKEN_SECRET = 'test-access';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh';
process.env.NODE_ENV = 'development';
let proof;
let created;
const path = require.resolve('../src/services/authservices.ts');
require.cache[path] = { id: path, filename: path, loaded: true, exports: {
  getUserByPhone: async () => null,
  getOtpByPhone: async () => proof,
  updateOtpData: async (id, data) => { Object.assign(proof, data); return proof; },
  createUser: async data => { created = data; return { id: 1, ...data }; },
  updateUser: async () => ({}),
} };
const { confirmPasswordHandler, registerUserHandler } = require('../src/ControllerHandler/authHandlers.ts');
const response = () => ({ cookie() { return this; }, setHeader() {}, status() { return this; }, json() {} });
beforeEach(() => {
  proof = { verifyToken: 'valid-proof', error: 0, updatedAt: new Date() };
  created = undefined;
});
test('verified phone registration records a timestamp only after valid proof', async () => {
  const before = Date.now();
  await confirmPasswordHandler({ body: { phone: '09912345678', password: '12345678', token: 'valid-proof' }, headers: {} }, response(), error => { throw error; });
  assert.equal(created.phone, '912345678');
  assert.ok(created.phoneVerifiedAt instanceof Date);
  assert.ok(created.phoneVerifiedAt.getTime() >= before);
});
test('phone resend replaces request token and invalidates previous password proof', async () => {
  proof = { id: 1, count: 1, error: 0, rememberToken: 'old-request', verifyToken: 'valid-proof', updatedAt: new Date() };
  await registerUserHandler({ body: { phone: '09912345678' } }, response(), e => { throw e; });
  assert.notEqual(proof.rememberToken, 'old-request');
  assert.equal(proof.verifyToken, null);
  let error;
  await confirmPasswordHandler({ body: { phone: '09912345678', password: '12345678', token: 'valid-proof' }, headers: {} }, response(), e => { error = e; });
  assert.equal(error.code, 'Error_Invalid_Token');
  assert.equal(created, undefined);
});
test('wrong, expired, blocked or missing verification never creates a verified user', async () => {
  for (const scenario of ['wrong', 'expired', 'blocked', 'missing']) {
    proof = { verifyToken: 'valid-proof', error: 0, updatedAt: new Date() };
    let token = 'valid-proof';
    if (scenario === 'wrong') token = 'wrong';
    if (scenario === 'expired') proof.updatedAt = new Date(Date.now() - 11 * 60 * 1000);
    if (scenario === 'blocked') proof.error = 5;
    if (scenario === 'missing') { token = undefined; proof.verifyToken = undefined; }
    let error;
    await confirmPasswordHandler({ body: { phone: '09912345678', password: '12345678', token }, headers: {} }, response(), e => error = e);
    assert.ok(error); assert.equal(created, undefined);
  }
});
