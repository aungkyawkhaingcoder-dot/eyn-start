import Redis from "ioredis";
import { getUserById, replaceRefreshToken } from "../../services/authservices";
import { unauthenticated } from "../tokens";
import { CustomError } from "../../utils/commonType";
import { readRefreshConfig } from "./config";
import { createRefreshCodec } from "./crypto";
import { BrowserSession, createSharedRotation } from "./rotation";
import { createRedisRefreshStrategy, refreshUnavailable } from "./redisStrategy";
import { createBullMQRefreshStrategy } from "./bullmqStrategy";
import { createRedisConnection } from "./connection";

// Fixed labels only: never log errors containing URLs, credentials, JWTs or emails.
async function measured<T>(stage: string, action: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await action();
    if (Date.now() - start >= 1000) console.warn("[auth-refresh]", { stage, outcome: "slow", elapsedMs: Date.now() - start });
    return result;
  } catch (error) {
    console.warn("[auth-refresh]", { stage, outcome: "failed", elapsedMs: Date.now() - start });
    throw error;
  }
}

function createRuntime() {
  const config = readRefreshConfig();
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error("REFRESH_TOKEN_SECRET is required");
  const codec = createRefreshCodec(secret, config.prefix);
  const redis = new Redis(config.redisUrl, {
    lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1,
    connectTimeout: 2000, commandTimeout: 2000, retryStrategy: () => null,
  });
  redis.on("error", () => {});
  const connection = createRedisConnection(redis);
  const ready = () => measured("redis-connect", connection.ready);
  const rotation = createSharedRotation({
    getUserById: id => measured("db-session-read", () => getUserById(id)),
    replaceRefreshToken: (id, old, replacement) => measured("db-token-commit", () => replaceRefreshToken(id, old, replacement)),
  }, {
    async get(key) {
      await ready();
      return measured("redis-result-read", () => redis.get(`${config.prefix}:${key}`));
    },
    async putIfAbsent(key, value, ttl) {
      await ready();
      return (await measured("redis-result-write", () => redis.set(`${config.prefix}:${key}`, value, "PX", ttl, "NX"))) === "OK";
    },
  }, codec, config.graceMs);
  let strategy: {
    refresh(token: string, deadline?: number): Promise<void>;
    close?(): Promise<void>;
  } | undefined;
  let workerRedis: Redis | undefined;

  return {
    config,
    authenticate: (token: string) => rotation.authenticate(token),
    async refresh(token: string, deadline: number) {
      await ready();
      if (Date.now() >= deadline) throw refreshUnavailable();
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
      await measured("rotation", () => strategy!.refresh(token, deadline));
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
  const deadline = Date.now() + currentRuntime.config.waitMs;
  try {
    return await Promise.race([
      (async () => {
        const session = await currentRuntime.authenticate(token);
        if (session.tokens || !needsRefresh) return session;
        if (Date.now() >= deadline) throw refreshUnavailable();
        return currentRuntime.refresh(token, deadline);
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          console.warn("[auth-refresh]", { stage: "request", outcome: "timeout", elapsedMs: currentRuntime.config.waitMs });
          reject(refreshUnavailable());
        }, currentRuntime.config.waitMs);
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
