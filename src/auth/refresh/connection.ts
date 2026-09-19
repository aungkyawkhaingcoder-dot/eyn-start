import type Redis from "ioredis";

// Coalesce probes after idle/sleep. A timed-out socket is discarded, not reused.
export function createRedisConnection(redis: Redis) {
  let checking: Promise<void> | undefined;
  async function ready() {
    if (!checking) {
      checking = (async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (redis.status !== "ready") await redis.connect();
            await redis.ping();
            return;
          } catch (error) {
            redis.disconnect();
            if (attempt === 1) throw error;
          }
        }
      })().finally(() => { checking = undefined; });
    }
    await checking;
  }
  return { ready };
}
