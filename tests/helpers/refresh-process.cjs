// Separate process with a shared Redis-backed fake repository. Real middleware,
// strategies, JWTs and BullMQ run unchanged; no application database is touched.
const Redis = require('ioredis');
const redis = new Redis(process.env.TEST_REPOSITORY_URL);
redis.on('error', () => {});
const key = id => `${process.env.AUTH_REFRESH_PREFIX}:test-user:${id}`;
const path = require.resolve('../../src/services/authservices.ts');
require.cache[path] = { id: path, filename: path, loaded: true, exports: {
  async getUserById(id) {
    const data = await redis.hgetall(key(id));
    return data.phone ? { id, phone: data.phone, randomToken: data.randomToken } : null;
  },
  async replaceRefreshToken(id, old, replacement) {
    const result = await redis.eval(`
      if redis.call('hget', KEYS[1], 'randomToken') ~= ARGV[1] then return 0 end
      redis.call('hset', KEYS[1], 'randomToken', ARGV[2])
      redis.call('hincrby', KEYS[1], 'writes', 1)
      return 1`, 1, key(id), old, replacement);
    return result === 1;
  },
} };
const { refreshTokenHandler } = require('../../src/ControllerHandler/authHandlers.ts');
const { authMiddleware } = require('../../src/middleware/auth.ts');
const { closeBrowserSessions } = require('../../src/auth/refresh/browserSession.ts');
process.on('message', async message => {
  if (message.close) {
    await closeBrowserSessions(); redis.disconnect(); process.disconnect(); return;
  }
  const req = message.action ? { headers: {
    'x-platform': 'mobile', authorization: `Bearer ${message.cookies.accessToken ?? ''}`,
    'x-refresh-token': message.cookies.refreshToken,
  } } : { headers: {}, cookies: message.cookies };
  const result = { id: message.id, cookies: {} };
  const res = { cookie(name, value) { result.cookies[name] = value; return this; }, setHeader() {}, status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; } };
  if (message.action === 'refresh') {
    try { await refreshTokenHandler(req, res); }
    catch (error) { result.status = error.status ?? 500; result.code = error.code; }
  } else await authMiddleware(req, res, error => {
    result.status = error?.status ?? 200;
    result.code = error?.code;
  });
  result.userId = req.userId;
  process.send(result);
});
process.send({ ready: true });
