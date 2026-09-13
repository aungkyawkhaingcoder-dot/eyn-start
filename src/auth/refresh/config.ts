export interface RefreshConfig {
  strategy: "redis" | "bullmq";
  redisUrl: string;
  prefix: string;
  graceMs: number;
  waitMs: number;
  lockMs: number;
}

export function readRefreshConfig(): RefreshConfig {
  const strategy = process.env.AUTH_REFRESH_STRATEGY ?? "redis";
  if (strategy !== "redis" && strategy !== "bullmq") {
    throw new Error("AUTH_REFRESH_STRATEGY must be redis or bullmq");
  }
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || !/^rediss?:\/\//.test(redisUrl)) {
    throw new Error("REDIS_URL must be a redis:// or rediss:// URL");
  }
  const prefix = process.env.AUTH_REFRESH_PREFIX ?? "prisma7-auth";
  if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) throw new Error("Invalid AUTH_REFRESH_PREFIX");
  return { strategy, redisUrl, prefix, graceMs: 3000, waitMs: 5000, lockMs: 6000 };
}
