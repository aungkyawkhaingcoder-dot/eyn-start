const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
const { issueTokens } = require('../src/auth/tokens.ts');
const { readRefreshConfig } = require('../src/auth/refresh/config.ts');
const { fixture } = require('./helpers/refresh-fixture.cjs');
function session(f, id = 1) {
  const user = { id, phone: `phone-${id}` };
  const tokens = issueTokens(user);
  f.records.set(id, { ...user, randomToken: tokens.refreshToken });
  return tokens.refreshToken;
}
test('config accepts exactly redis/bullmq and requires Redis URL', () => {
  const saved = { ...process.env };
  try {
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    for (const strategy of ['redis', 'bullmq']) {
      process.env.AUTH_REFRESH_STRATEGY = strategy;
      assert.equal(readRefreshConfig().strategy, strategy);
    }
    process.env.AUTH_REFRESH_STRATEGY = 'typo';
    assert.throws(readRefreshConfig, /must be redis or bullmq/);
    process.env.AUTH_REFRESH_STRATEGY = 'redis'; delete process.env.REDIS_URL;
    assert.throws(readRefreshConfig, /REDIS_URL/);
  } finally {
    for (const key of ['REDIS_URL', 'AUTH_REFRESH_STRATEGY']) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  }
});
test('parallel executions converge to one stored token pair', async () => {
  const f = fixture(); const token = session(f);
  await Promise.all(Array.from({ length: 20 }, () => f.rotation.execute(token)));
  assert.equal(f.writes, 1);
  assert.ok((await f.rotation.authenticate(token)).tokens);
  const stored = [...f.entries.values()][0].value;
  assert.ok(!stored.includes(token));
  assert.ok(!stored.includes(f.records.get(1).randomToken));
});
test('prepared result alone never authorizes an uncommitted rotation', async () => {
  const f = fixture(); const token = session(f);
  f.db.replaceRefreshToken = async () => false;
  await assert.rejects(f.rotation.execute(token));
  const result = await f.rotation.authenticate(token);
  assert.equal(result.tokens, undefined);
});
test('retry recovers exact pair after commit then worker failure', async () => {
  const f = fixture(); const token = session(f);
  const replace = f.db.replaceRefreshToken;
  f.db.replaceRefreshToken = async (...args) => { await replace(...args); throw new Error('crash after commit'); };
  await assert.rejects(f.rotation.execute(token), /crash/);
  const committed = f.records.get(1).randomToken;
  f.db.replaceRefreshToken = replace;
  await f.rotation.execute(token);
  assert.equal(f.writes, 1);
  assert.equal((await f.rotation.authenticate(token)).tokens.refreshToken, committed);
});
test('grace expires without extending on repeated reads', async () => {
  let now = Date.now(); const f = fixture({ now: () => now }); const token = session(f);
  await f.rotation.execute(token);
  now += 2999; assert.ok((await f.rotation.authenticate(token)).tokens);
  now += 2; await assert.rejects(f.rotation.authenticate(token), e => e.status === 401);
});
test('logout, new login, phone change and deleted user reject cached results', async () => {
  for (const mutation of [
    user => user.randomToken = 'logout',
    user => user.randomToken = issueTokens(user).refreshToken,
    user => user.phone = 'changed',
    (_, f) => f.records.delete(1),
  ]) {
    const f = fixture(); const token = session(f); await f.rotation.execute(token);
    mutation(f.records.get(1), f);
    await assert.rejects(f.rotation.authenticate(token), e => e.status === 401);
  }
});
test('different sessions rotate independently', async () => {
  const f = fixture(); const a = session(f, 1); const b = session(f, 2);
  await Promise.all([f.rotation.execute(a), f.rotation.execute(b)]);
  assert.equal(f.writes, 2);
  assert.notEqual((await f.rotation.authenticate(a)).tokens.refreshToken,
    (await f.rotation.authenticate(b)).tokens.refreshToken);
});
