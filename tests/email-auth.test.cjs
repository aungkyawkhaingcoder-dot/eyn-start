const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
process.env.ACCESS_TOKEN_SECRET = 'test-access';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh';
process.env.NODE_ENV = 'development';
let otps, users, sent, sendFails, transaction;
const copy = value => value == null ? value : structuredClone(value);
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value instanceof Date) return row[key] instanceof Date && row[key].getTime() === value.getTime();
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('gt' in value) return row[key] != null && row[key] > value.gt;
      if ('lt' in value) return row[key] < value.lt;
      if ('not' in value) return row[key] !== value.not;
      if ('equals' in value) return row[key]?.toLowerCase() === value.equals.toLowerCase();
    }
    return row[key] === value;
  });
}
function apply(row, data) {
  for (const [key, value] of Object.entries(data)) {
    row[key] = value && typeof value === 'object' && 'increment' in value ? row[key] + value.increment : value;
  }
}
function model(table) {
  return {
    async findUnique({ where }) { return copy(table().find(row => matches(row, where)) ?? null); },
    async findFirst(args) { return this.findUnique(args); },
    async findUniqueOrThrow(args) { const row = await this.findUnique(args); if (!row) throw Error('missing'); return row; },
    async upsert({ where, create }) {
      let row = table().find(row => matches(row, where));
      if (!row) { row = { id: table().length + 1, otp: '', count: 0, error: 0, quotaDay: '',
        rememberToken: null, verifyToken: null, expiresAt: null, verifiedAt: null,
        verifyExpiresAt: null, lastSentAt: null, ...create }; table().push(row); }
      return copy(row);
    },
    async updateMany({ where, data }) {
      let count = 0; for (const row of table()) if (matches(row, where)) { apply(row, data); count++; }
      return { count };
    },
    async update({ where, data }) {
      const row = table().find(row => matches(row, where)); if (!row) throw Error('missing');
      apply(row, data); return copy(row);
    },
    async create({ data }) {
      if (table().some(row => row.email === data.email)) throw Object.assign(Error('duplicate'), { code: 'P2002' });
      const row = { id: table().length + 1, phone: null, status: 'ACTIVE', errorLoginCount: 0,
        emailVerifiedAt: null, ...data }; table().push(row); return copy(row);
    },
  };
}
const prisma = { emailOtp: model(() => otps), user: model(() => users), async $queryRaw() { return []; },
  $transaction(fn) {
    const run = transaction.then(async () => {
      const before = copy({ otps, users });
      try { return await fn(prisma); } catch (e) { otps = before.otps; users = before.users; throw e; }
    });
    transaction = run.catch(() => {}); return run;
  },
};
function mock(path, exports) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports }; }
mock('../src/lib/prisma.ts', { prisma });
mock('../src/services/email/index.ts', { async sendVerificationEmail(email, otp) {
  if (sendFails) throw Object.assign(Error('send failed'), { status: 503 });
  sent.push({ email, otp });
} });
const handlers = require('../src/ControllerHandler/emailAuthHandlers.ts');
const services = require('../src/services/emailAuthServices.ts');
const { verifyRefreshToken, matchesRefreshIdentity, issueTokens } = require('../src/auth/tokens.ts');
const { authenticateRefreshToken } = require('../src/auth/session.ts');
const { fixture } = require('./helpers/refresh-fixture.cjs');
function response() { return { cookies: {}, body: null, code: null, setHeader() {},
  cookie(key, value) { this.cookies[key] = value; return this; },
  status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
async function call(name, body, mobile = false) {
  const res = response(); await handlers[name]({ body, headers: mobile ? { 'x-platform': 'mobile' } : {} }, res); return res;
}
const email = 'person@example.com';
async function register() { return call('registerEmailHandler', { email }); }
async function verify(reg) { return call('verifyEmailOtpHandler', { email, token: reg.body.token, otp: sent.at(-1).otp }); }
beforeEach(() => { otps = []; users = []; sent = []; sendFails = false; transaction = Promise.resolve(); });
test('email register → verify → password → mobile login → refresh session works', async () => {
  const reg = await call('registerEmailHandler', { email: ' Person@Example.com ' });
  assert.equal(reg.body.email, email); assert.match(sent[0].otp, /^[0-9]{6}$/);
  assert.notEqual(otps[0].otp, sent[0].otp); assert.notEqual(otps[0].rememberToken, reg.body.token);
  assert.ok(await bcrypt.compare(sent[0].otp, otps[0].otp));
  const verified = await verify(reg); assert.notEqual(otps[0].verifyToken, verified.body.verifyToken);
  const confirmed = await call('confirmEmailPasswordHandler', { email, token: verified.body.verifyToken, password: '12345678' });
  assert.equal(confirmed.code, 201); assert.ok(confirmed.cookies.refreshToken);
  assert.equal(users[0].phone, null); assert.ok(users[0].emailVerifiedAt instanceof Date);
  const login = await call('loginEmailHandler', { email: 'PERSON@example.com', password: '12345678' }, true);
  assert.ok(login.body.accessToken); assert.deepEqual(login.cookies, {});
  assert.equal((await authenticateRefreshToken(login.body.refreshToken)).id, users[0].id);
  const f = fixture(); f.records.set(users[0].id, users[0]);
  await f.rotation.execute(login.body.refreshToken);
  assert.ok((await f.rotation.authenticate(login.body.refreshToken)).tokens);
});
test('email login returns tokens only with the explicit mobile application header', async () => {
  users.push({id:1,phone:null,email,status:'ACTIVE',emailVerifiedAt:new Date(),
    password:await bcrypt.hash('12345678',4),randomToken:'initial',errorLoginCount:0});
  const {ACCESS_TOKEN_SECONDS}=require('../src/auth/tokens.ts');
  for (const headers of [{}, {'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'}, {'x-platform':'mobile'}]) {
    const res=response();
    await handlers.loginEmailHandler({body:{email,password:'12345678'},headers},res);
    assert.equal(res.code,200); assert.equal(res.body.id,1);
    if(headers['x-platform']==='mobile') {
      assert.ok(res.body.accessToken); assert.ok(res.body.refreshToken);
      assert.equal(res.body.expiresIn,ACCESS_TOKEN_SECONDS);
      assert.equal(res.body.refreshToken,users[0].randomToken);
      assert.deepEqual(res.cookies,{});
    } else {
      assert.ok(res.cookies.accessToken); assert.ok(res.cookies.refreshToken);
      for(const field of ['accessToken','refreshToken','expiresIn']) assert.equal(field in res.body,false);
    }
  }
});
test('email logout revokes browser/mobile sessions and rejects replay and cached successors', async () => {
  const router = require('../src/routes/v1/emailAuth.ts').default;
  const logout = router.stack.find(layer => layer.route?.path === '/logout').route;
  assert.equal(logout.methods.post, true);
  const handler = logout.stack[0].handle;
  for (const mobile of [false, true]) {
    const user = { id: users.length + 1, phone: null, email };
    const old = issueTokens(user);
    users.push({ ...user, randomToken: old.refreshToken });
    const f = fixture(); f.records.set(user.id, users.at(-1));
    await f.rotation.execute(old.refreshToken);
    const current = (await f.rotation.authenticate(old.refreshToken)).tokens;
    const req = mobile
      ? { headers: { 'x-platform': 'mobile', 'x-refresh-token': current.refreshToken } }
      : { headers: {}, cookies: { refreshToken: current.refreshToken } };
    const res = response(); const cleared = [];
    res.clearCookie = name => { cleared.push(name); return res; };
    await handler(req, res);
    assert.equal(res.code, 200);
    assert.deepEqual(cleared, ['accessToken', 'refreshToken']);
    await assert.rejects(authenticateRefreshToken(current.refreshToken), e => e.status === 401);
    await assert.rejects(f.rotation.authenticate(old.refreshToken), e => e.status === 401);
    await assert.rejects(handler(req, res), e => e.status === 401);
  }
});
test('wrong OTP attempts do not extend expiry and stop at five', async () => {
  const reg = await register(); const expires = otps[0].expiresAt.getTime();
  const wrong = sent[0].otp === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) await assert.rejects(call('verifyEmailOtpHandler', { email, token: reg.body.token, otp: wrong }), e => e.code === 'Error_Incorrect_OTP');
  assert.equal(otps[0].expiresAt.getTime(), expires);
  await assert.rejects(verify(reg), e => e.code === 'Error_OverLimit');
});
test('expired OTP and invalid request token cannot verify', async () => {
  const reg = await register();
  await assert.rejects(call('verifyEmailOtpHandler', { email, otp: sent[0].otp, token: 'bad' }), e => e.code === 'Error_Invalid_Token');
  otps[0].expiresAt = new Date(0);
  await assert.rejects(verify(reg), e => e.code === 'Error_OTP_Expired');
});
test('cooldown and daily send limit; resend invalidates old proof', async () => {
  const reg = await register(); const verified = await verify(reg);
  await assert.rejects(register(), e => e.code === 'Error_ResendCooldown');
  otps[0].lastSentAt = new Date(Date.now() - 61000);
  await register();
  await assert.rejects(call('confirmEmailPasswordHandler', { email, token: verified.body.verifyToken, password: '12345678' }));
  otps[0].lastSentAt = new Date(Date.now() - 61000); await register();
  otps[0].lastSentAt = new Date(Date.now() - 61000);
  await assert.rejects(register(), e => e.code === 'Error_OverLimit');
});
test('delivery failure returns error and invalidates challenge', async () => {
  sendFails = true; await assert.rejects(register(), e => e.status === 503);
  assert.equal(otps[0].rememberToken, null); assert.equal(otps[0].expiresAt, null);
});
test('verification and password confirmation are each single use', async () => {
  const reg = await register(); const verified = await verify(reg);
  await assert.rejects(verify(reg), e => e.code === 'Error_OTP_Used');
  const body = { email, token: verified.body.verifyToken, password: '12345678' };
  const result = await Promise.allSettled([call('confirmEmailPasswordHandler', body), call('confirmEmailPasswordHandler', body)]);
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1); assert.equal(users.length, 1);
});
test('expired confirmation cannot create account', async () => {
  const verified = await verify(await register()); otps[0].verifyExpiresAt = new Date(0);
  await assert.rejects(call('confirmEmailPasswordHandler', { email, token: verified.body.verifyToken, password: '12345678' }));
  assert.equal(users.length, 0);
});
test('login rejects unverified, wrong password and frozen accounts', async () => {
  users.push({ id: 1, phone: null, email, password: await bcrypt.hash('12345678', 4), status: 'ACTIVE', errorLoginCount: 0, emailVerifiedAt: null });
  await assert.rejects(call('loginEmailHandler', { email, password: '12345678' }), e => e.code === 'Error_EmailNotVerified');
  users[0].emailVerifiedAt = new Date();
  for (let i = 0; i < 6; i++) await assert.rejects(call('loginEmailHandler', { email, password: '87654321' }), e => e.code === 'ERROR_INVALID');
  assert.equal(users[0].status, 'FREEZE');
  await assert.rejects(call('loginEmailHandler', { email, password: '12345678' }), e => e.code === 'ERROR_FREEZE');
});
test('email identity checks reject changed DB email; phone tokens remain supported', () => {
  const user = { id: 1, phone: null, email }; const claims = verifyRefreshToken(issueTokens(user).refreshToken);
  assert.ok(matchesRefreshIdentity(user, claims));
  assert.equal(matchesRefreshIdentity({ ...user, email: 'other@example.com' }, claims), false);
  const phoneUser = { id: 2, phone: '912345678' };
  assert.ok(matchesRefreshIdentity(phoneUser, verifyRefreshToken(issueTokens(phoneUser).refreshToken)));
});
test('route validators reject missing email, malformed OTP/proof and nonnumeric password', async () => {
  const { validationResult } = require('express-validator');
  const validations = require('../src/validation/emailAuthValidation.ts');
  for (const [name, body] of [
    ['registerEmailValidation', {}], ['registerEmailValidation', { email: [] }],
    ['verifyEmailOtpValidation', { email, otp: 'abc', token: 'a'.repeat(64) }],
    ['confirmEmailPasswordValidation', { email, token: 'bad', password: '12345678' }],
    ['loginEmailValidation', { email, password: 'password' }],
  ]) {
    const req = { body }; for (const rule of validations[name]) await rule.run(req);
    assert.equal(validationResult(req).isEmpty(), false);
  }
  const req = { body: { email: ' PERSON@example.com ', password: '12345678' } };
  for (const rule of validations.loginEmailValidation) await rule.run(req);
  assert.ok(validationResult(req).isEmpty()); assert.equal(req.body.email, email);
});
