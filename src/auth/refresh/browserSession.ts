import Redis from "ioredis";
import { getUserById, replaceRefreshToken } from "../../services/authservices";
import { unauthenticated } from "../tokens";
import { CustomError } from "../../utils/commonType";
import { readRefreshConfig } from "./config";
import { createRefreshCodec } from "./crypto";
import { BrowserSession, createSharedRotation } from "./rotation";
import { createRedisRefreshStrategy, refreshUnavailable } from "./redisStrategy";
import { createBullMQRefreshStrategy } from "./bullmqStrategy";

function createRuntime() {
  const config = readRefreshConfig();
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error("REFRESH_TOKEN_SECRET is required");
  const codec = createRefreshCodec(secret, config.prefix);
  const redis = new Redis(config.redisUrl, {
    lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1,
    connectTimeout: 1000, commandTimeout: 1000, retryStrategy: () => null,
  });
  redis.on("error", () => {});
  let connecting: Promise<void> | undefined;
  async function ready() {
    if (redis.status === "ready") return;
    if (!connecting) connecting = redis.connect().finally(() => { connecting = undefined; });
    await connecting;
  }
  const rotation = createSharedRotation({ getUserById, replaceRefreshToken }, {
    async get(key) {
      await ready();
      return redis.get(`${config.prefix}:${key}`);
    },
    async putIfAbsent(key, value, ttl) {
      await ready();
      return (await redis.set(`${config.prefix}:${key}`, value, "PX", ttl, "NX")) === "OK";
    },
  }, codec, config.graceMs);
  let strategy: {
    refresh(token: string): Promise<void>;
    close?(): Promise<void>;
  } | undefined;
  let workerRedis: Redis | undefined;

  return {
    config,
    authenticate: (token: string) => rotation.authenticate(token),
    async refresh(token: string) {
      await ready();
      if (!strategy) {
        if (config.strategy === "redis") {
          strategy = createRedisRefreshStrategy(redis, rotation, codec, config);
        } else {
          // BullMQ blocking worker connection must retry independently of HTTP commands.
          workerRedis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
          workerRedis.on("error", () => {});
          strategy = createBullMQRefreshStrategy(rotation, codec, config, redis, workerRedis);
        }
      }
      await strategy.refresh(token);
      const result = await rotation.authenticate(token);
      if (!result.tokens) throw refreshUnavailable();
      return result;
    },
    async close() {
      await strategy?.close?.();
      workerRedis?.disconnect();
      redis.disconnect();
    },
  };
}

let runtime: ReturnType<typeof createRuntime> | undefined;

// One config choice per process. Restart ALL PM2 processes when changing config.
export async function resolveBrowserSession(token: string | null, needsRefresh: boolean): Promise<BrowserSession> {
  if (!token) throw unauthenticated();
  runtime ??= createRuntime();
  const currentRuntime = runtime;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const session = await currentRuntime.authenticate(token);
        if (session.tokens || !needsRefresh) return session;
        return currentRuntime.refresh(token);
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(refreshUnavailable()), currentRuntime.config.waitMs);
      }),
    ]);
  } catch (error) {
    const status = (error as CustomError).status;
    if (status === 400 || status === 401 || status === 503) throw error;
    throw refreshUnavailable();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function closeBrowserSessions(): Promise<void> {
  const current = runtime;
  runtime = undefined;
  await current?.close();
}

// Mobile uses the same coordinator, but gets tokens through /refresh-token JSON.
// false only validates the session (including its recent successor); it never rotates.
export async function resolveMobileSession(token: string | null, needsRefresh: boolean): Promise<BrowserSession> {
  return resolveBrowserSession(token, needsRefresh);
}
