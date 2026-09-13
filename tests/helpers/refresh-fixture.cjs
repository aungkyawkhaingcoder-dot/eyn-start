const { createRefreshCodec } = require('../../src/auth/refresh/crypto.ts');
const { createSharedRotation } = require('../../src/auth/refresh/rotation.ts');
function fixture({ graceMs = 3000, now = Date.now } = {}) {
  const records = new Map();
  const entries = new Map();
  let writes = 0;
  const db = {
    getUserById: async id => records.has(id) ? { ...records.get(id) } : null,
    replaceRefreshToken: async (id, previous, replacement) => {
      const user = records.get(id);
      if (!user || user.randomToken !== previous) return false;
      writes++;
      user.randomToken = replacement;
      return true;
    },
  };
  const store = {
    async get(key) {
      const entry = entries.get(key);
      if (!entry || entry.expiresAt <= now()) { entries.delete(key); return null; }
      return entry.value;
    },
    async putIfAbsent(key, value, ttl) {
      // Synchronous map mutation models Redis SET NX atomically.
      const entry = entries.get(key);
      if (entry && entry.expiresAt > now()) return false;
      entries.set(key, { value, expiresAt: now() + ttl }); return true;
    },
  };
  const codec = createRefreshCodec(process.env.REFRESH_TOKEN_SECRET, 'test-refresh');
  return {
    records, db, store, codec, entries, get writes() { return writes; },
    rotation: createSharedRotation(db, store, codec, graceMs, now),
  };
}
module.exports = { fixture };
