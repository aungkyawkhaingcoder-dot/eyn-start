const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
process.env.NODE_ENV = 'development';
let user;
let writes;
const services = {
  getUserById: async id => user?.id === id ? { ...user } : null,
  getUserByPhone: async phone => user?.phone === phone ? { ...user } : null,
  updateUser: async (id, data) => { writes.push(data); Object.assign(user, data); return user; },
  replaceRefreshToken: async (id, old, token) => {
    if (user.randomToken !== old) return false;
    user.randomToken = token; return true;
  },
};
// Replace only persistence; exercise real JWT, bcrypt, middleware and handlers.
const servicePath = require.resolve('../src/services/authservices.ts');
require.cache[servicePath] = { id: servicePath, filename: servicePath, loaded: true, exports: services };
const { issueTokens } = require('../src/auth/tokens.ts');
const { authMiddleware } = require('../src/middleware/auth.ts');
const { loginHandler, refreshTokenHandler, logoutHandler } = require('../src/ControllerHandler/authHandlers.ts');
function response() {
  return { cookies: [], body: null, cookie(...args) { this.cookies.push(args); return this; },
    clearCookie() { return this; }, setHeader() {}, status() { return this; }, json(body) { this.body = body; return this; } };
}
function request(mobile = false, expired = false) {
  const pair = issueTokens(user); user.randomToken = pair.refreshToken;
  if (expired) pair.accessToken = jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: -1 });
  return mobile ? { headers: { 'x-platform': 'mobile', authorization: `Bearer ${pair.accessToken}`, 'x-refresh-token': pair.refreshToken } }
    : { headers: {}, cookies: pair };
}
beforeEach(() => {
  user = { id: 1, phone: '912345678', status: 'ACTIVE', updatedAt: new Date(), errorLoginCount: 0, password: bcrypt.hashSync('12345678', 4) };
  writes = [];
});
test('valid browser token calls next exactly once', async () => {
  const req = request(); const calls = [];
  await authMiddleware(req, response(), e => calls.push(e));
  assert.deepEqual(calls, [undefined]); assert.equal(req.userId, 1);
});
test('expired browser token rotates and continues exactly once', async () => {
  const req = request(false, true); const res = response(); const calls = [];
  const old = user.randomToken;
  await authMiddleware(req, res, e => calls.push(e));
  assert.deepEqual(calls, [undefined]); assert.equal(res.cookies.length, 2);
  assert.notEqual(user.randomToken, old);
});
test('expired mobile access token returns stable error without rotation', async () => {
  const req = request(true, true); const old = user.randomToken; let error;
  await authMiddleware(req, response(), e => error = e);
  assert.equal(error.code, 'Error_AccessTokenExpired'); assert.equal(error.status, 401);
  assert.equal(user.randomToken, old); assert.equal(req.userId, undefined);
});
test('rejects mismatched access and refresh identities', async () => {
  const req = request(); req.cookies.accessToken = issueTokens({ id: 2, phone: 'other' }).accessToken;
  let error; await authMiddleware(req, response(), e => error = e);
  assert.equal(error.code, 'Error_Unauthenticated');
});
test('rejects malformed claims and revoked refresh tokens', async () => {
  for (const invalid of [jwt.sign({ id: {}, phone: user.phone }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: 60 }), 'broken']) {
    const req = request(); req.cookies.refreshToken = invalid; let error;
    await authMiddleware(req, response(), e => error = e); assert.ok(error);
  }
  const req = request(); user.randomToken = 'revoked'; let error;
  await authMiddleware(req, response(), e => error = e); assert.equal(error.status, 401);
});
test('refresh rotates and old token cannot refresh or logout', async () => {
  const req = request(true); const res = response();
  await refreshTokenHandler(req, res); assert.ok(res.body.accessToken);
  await assert.rejects(refreshTokenHandler(req, response()));
  await assert.rejects(logoutHandler(req, response()));
});
test('concurrent refresh has one winner', async () => {
  const req = request(true);
  const results = await Promise.allSettled([refreshTokenHandler(req, response()), refreshTokenHandler(req, response())]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
});
test('wrong password cannot issue tokens and sixth failure freezes', async () => {
  user.errorLoginCount = 5; const res = response(); let error;
  await loginHandler({ body: { phone: user.phone, password: 'wrong' }, headers: {} }, res, e => error = e);
  assert.equal(error.code, 'ERROR_INVALID'); assert.equal(user.status, 'FREEZE');
  assert.equal(res.body, null); assert.equal(res.cookies.length, 0);
});
test('frozen account cannot login even with correct password', async () => {
  user.status = 'FREEZE'; let error;
  await loginHandler({ body: { phone: user.phone, password: '12345678' }, headers: {} }, response(), e => error = e);
  assert.equal(error.code, 'ERROR_FREEZE'); assert.equal(writes.length, 0);
});
test('mobile login returns tokens and normalizes phone', async () => {
  const res = response();
  await loginHandler({ body: { phone: `09${user.phone}`, password: '12345678' }, headers: { 'x-platform': 'mobile' } }, res, e => { throw e; });
  assert.equal(res.body.refreshToken, user.randomToken); assert.ok(res.body.accessToken);
  assert.equal(res.cookies.length, 0);
});
