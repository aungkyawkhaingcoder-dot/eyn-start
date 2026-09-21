const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { randomUUID } = require('node:crypto');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
process.env.ACCESS_TOKEN_SECRET = 'integration-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'integration-refresh-secret';
const { issueTokens } = require('../src/auth/tokens.ts');
const url = process.env.TEST_REDIS_URL;
if (!url) throw new Error('Set TEST_REDIS_URL to a disposable Redis instance');

async function child(strategy, prefix, redisUrl = url) {
  const worker = fork(require.resolve('./helpers/refresh-process.cjs'), [], {
    execArgv: ['--require', 'tsx/cjs'],
    env: { ...process.env, REDIS_URL: redisUrl, TEST_REPOSITORY_URL: url,
      AUTH_REFRESH_STRATEGY: strategy, AUTH_REFRESH_PREFIX: prefix },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  // Tests never echo Redis/JWT-bearing errors from a child.
  let serial = 0; const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Child startup timed out')), 5000);
    worker.on('message', message => {
      if (message.ready) { clearTimeout(timer); resolve(); return; }
      pending.get(message.id)?.(message); pending.delete(message.id);
    });
  });
  await ready;
  return {
    request(cookies, action) {
      return new Promise((resolve, reject) => {
        const id = ++serial;
        const timer = setTimeout(() => reject(new Error('HTTP middleware timed out')), 8000);
        pending.set(id, value => { clearTimeout(timer); resolve(value); });
        worker.send({ id, cookies, action });
      });
    },
    async close() {
      const exited = once(worker, 'exit');
      const timer = setTimeout(() => worker.kill('SIGKILL'), 4000);
      worker.send({ close: true }); await exited; clearTimeout(timer);
    },
  };
}

for (const strategy of ['redis', 'bullmq']) {
  test(`${strategy}: three processes share rotations, reject replay/revoke and isolate users`, { timeout: 20000 }, async () => {
    const prefix = `auth-test-${randomUUID()}`;
    const redis = new Redis(url); const workers = [];
    try {
      for (let i = 0; i < 3; i++) workers.push(await child(strategy, prefix));
      const key = id => `${prefix}:test-user:${id}`;
      async function login(id) {
        const user = { id, phone: `phone-${id}` }; const tokens = issueTokens(user);
        await redis.hset(key(id), { phone: user.phone, randomToken: tokens.refreshToken, writes: '0' });
        return { ...tokens, accessToken: jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: -1 }) };
      }
      const mobile = await login(10);
      const mobileResults = await Promise.all(Array.from({ length: 12 }, (_, i) =>
        workers[i % 3].request(mobile, 'refresh')));
      assert.deepEqual(mobileResults.map(r => r.status), Array(12).fill(200));
      assert.equal(new Set(mobileResults.map(r => r.body.refreshToken)).size, 1);
      assert.equal(await redis.hget(key(10), 'writes'), '1');
      assert.ok(mobileResults.every(r => Object.keys(r.cookies).length === 0));
      const stale = await workers[1].request(mobile, 'protected');
      assert.equal(stale.code, 'Error_AccessTokenExpired');
      const lateMobile = await workers[2].request(mobile, 'refresh');
      assert.equal(lateMobile.body.refreshToken, mobileResults[0].body.refreshToken);
      assert.equal((await workers[0].request(lateMobile.body, 'protected')).status, 200);
      await redis.hset(key(10), 'randomToken', 'revoked');
      assert.equal((await workers[1].request(mobile, 'refresh')).status, 401);
      const cookies = await login(1);
      const results = await Promise.all(Array.from({ length: 12 }, (_, i) => workers[i % 3].request(cookies)));
      assert.deepEqual(results.map(r => r.status), Array(12).fill(200));
      assert.equal(new Set(results.map(r => r.cookies.refreshToken)).size, 1);
      assert.equal(await redis.hget(key(1), 'writes'), '1');
      const late = await workers[2].request(cookies);
      assert.equal(late.status, 200);
      assert.equal(late.cookies.refreshToken, results[0].cookies.refreshToken);
      // A retry after the former 3-second grace still recovers the committed pair.
      await delay(3100);
      assert.equal((await workers[0].request(cookies)).status, 200);
      assert.equal((await workers[1].request(results[0].cookies)).status, 200);
      const fresh = await login(2);
      const freshResult = await workers[0].request(fresh);
      assert.equal(freshResult.status, 200);
      await redis.hset(key(2), 'randomToken', 'revoked');
      assert.equal((await workers[2].request(fresh)).status, 401);
      const a = await login(3); const b = await login(4);
      const independent = await Promise.all([workers[0].request(a), workers[1].request(b)]);
      assert.deepEqual(independent.map(r => r.status), [200, 200]);
      assert.notEqual(independent[0].cookies.refreshToken, independent[1].cookies.refreshToken);
    } finally {
      await Promise.all(workers.map(w => w.close()));
      const keys = await redis.keys(`${prefix}:*`); if (keys.length) await redis.del(...keys);
      redis.disconnect();
    }
  });
}

test('unavailable coordination returns 503 while a valid session still works', { timeout: 10000 }, async () => {
  const prefix = `auth-test-${randomUUID()}`;
  const redis = new Redis(url);
  const worker = await child('redis', prefix, 'redis://127.0.0.1:1');
  try {
    const tokens = issueTokens({ id: 1, phone: 'phone-1' });
    await redis.hset(`${prefix}:test-user:1`, { phone: 'phone-1', randomToken: tokens.refreshToken });
    assert.equal((await worker.request(tokens)).status, 200);
    const started = Date.now();
    const result = await worker.request({ refreshToken: tokens.refreshToken });
    assert.equal(result.status, 503); assert.equal(result.code, 'Error_RefreshUnavailable');
    assert.ok(Date.now() - started < 6500);
    assert.deepEqual(result.cookies, {});
  } finally {
    await worker.close(); await redis.del(`${prefix}:test-user:1`); redis.disconnect();
  }
});
