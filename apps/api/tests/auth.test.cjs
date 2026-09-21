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
// Unit tests use the real shared rotation policy with in-memory coordination.
// tests/refresh.integration.cjs separately exercises both real Redis/BullMQ strategies.
const { fixture } = require('./helpers/refresh-fixture.cjs');
let shared;
const browserPath = require.resolve('../src/auth/refresh/browserSession.ts');
require.cache[browserPath] = { id: browserPath, filename: browserPath, loaded: true, exports: {
  async resolveMobileSession(token, needsRefresh) {
    return require.cache[browserPath].exports.resolveBrowserSession(token, needsRefresh);
  },
  async resolveBrowserSession(token, needsRefresh) {
    shared.records.set(user.id, user);
    const session = await shared.rotation.authenticate(token);
    if (session.tokens || !needsRefresh) return session;
    await shared.rotation.execute(token);
    return shared.rotation.authenticate(token);
  },
} };
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
  shared = fixture();
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
test('email-only browser sessions rotate expired or absent access cookies and continue', async () => {
  user.phone = null; user.email = 'email-user@example.com';
  for (const absent of [false, true]) {
    const req = request(false, true);
    if (absent) delete req.cookies.accessToken;
    const previous = user.randomToken;
    const res = response(); const calls = [];
    await authMiddleware(req, res, e => calls.push(e));
    assert.deepEqual(calls, [undefined]);
    assert.equal(req.userId, user.id);
    assert.notEqual(user.randomToken, previous);
    const refresh = res.cookies.find(([name]) => name === 'refreshToken')[1];
    assert.equal(refresh, user.randomToken);
    assert.equal(jwt.verify(refresh, process.env.REFRESH_TOKEN_SECRET).email, user.email);
  }
});
test('email-only mobile expiry requests refresh; missing refresh cookie rejects browser', async () => {
  user.phone = null; user.email = 'email-user@example.com';
  const mobile = request(true, true); let error;
  await authMiddleware(mobile, response(), e => { error = e; });
  assert.equal(error.code, 'Error_AccessTokenExpired');
  const browser = request(false, true); delete browser.cookies.refreshToken;
  await authMiddleware(browser, response(), e => { error = e; });
  assert.equal(error.code, 'Error_Unauthenticated');
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
test('mobile refresh shares recent result but stale token cannot logout', async () => {
  const req = request(true); const res = response();
  await refreshTokenHandler(req, res); assert.ok(res.body.accessToken);
  const late = response();
  await refreshTokenHandler(req, late);
  assert.equal(late.body.refreshToken, res.body.refreshToken);
  await assert.rejects(logoutHandler(req, response()));
});
test('concurrent mobile refresh returns one pair with one DB update', async () => {
  const req = request(true);
  const responses = [response(), response(), response()];
  await Promise.all(responses.map(res => refreshTokenHandler(req, res)));
  assert.equal(new Set(responses.map(res => res.body.refreshToken)).size, 1);
  assert.equal(shared.writes, 1);
  assert.ok(responses.every(res => res.cookies.length === 0));
});
test('mobile in-flight old pair requests shared refresh then succeeds with new headers', async () => {
  const req = request(true);
  const res = response(); await refreshTokenHandler(req, res);
  let error; await authMiddleware(req, response(), e => error = e);
  assert.equal(error.code, 'Error_AccessTokenExpired');
  const retry = { headers: { ...req.headers, authorization: `Bearer ${res.body.accessToken}`,
    'x-refresh-token': res.body.refreshToken } };
  const calls = []; await authMiddleware(retry, response(), e => calls.push(e));
  assert.deepEqual(calls, [undefined]); assert.equal(retry.userId, user.id);
});
test('mobile refresh rejects revoked and missing tokens', async () => {
  const req = request(true); await refreshTokenHandler(req, response());
  user.randomToken = 'revoked';
  await assert.rejects(refreshTokenHandler(req, response()), e => e.status === 401);
  await assert.rejects(refreshTokenHandler({ headers: {} }, response()));
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

test('parallel browser requests and late stale cookies share a single pair', async () => {
  const req = request(false, true);
  const responses = [response(), response(), response()];
  const calls = [];
  await Promise.all(responses.map(res => authMiddleware({ ...req }, res, e => calls.push(e))));
  assert.deepEqual(calls, [undefined, undefined, undefined]);
  assert.equal(shared.writes, 1);
  assert.equal(new Set(responses.map(res => res.cookies[1][1])).size, 1);
  const late = response();
  await authMiddleware({ ...req }, late, e => { if (e) throw e; });
  assert.equal(late.cookies[1][1], responses[0].cookies[1][1]);
});
test('cached browser result cannot restore a revoked session', async () => {
  const req = request(false, true);
  await authMiddleware(req, response(), e => { if (e) throw e; });
  user.randomToken = 'revoked';
  let error;
  await authMiddleware({ ...req, userId: undefined }, response(), e => error = e);
  assert.equal(error.status, 401);
});
