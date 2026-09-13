import { Queue, Worker } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { setTimeout as delay } from "node:timers/promises";
import { RefreshConfig } from "./config";
import { RefreshCodec } from "./crypto";
import { SharedRotation } from "./rotation";
import { refreshUnavailable } from "./redisStrategy";

export function createBullMQRefreshStrategy(
  rotation: SharedRotation,
  codec: RefreshCodec,
  config: RefreshConfig,
  producerConnection: ConnectionOptions,
  workerConnection: ConnectionOptions,
) {
  const options = { prefix: config.prefix };
  const queue = new Queue("browser-refresh", { ...options, connection: producerConnection });
  // Every PM2 process may run this worker. Redis job ownership coordinates them.
  const worker = new Worker("browser-refresh", async job => {
    const data = codec.open<{ token: string; deadline: number }>(job.data.payload);
    if (Date.now() >= data.deadline) throw refreshUnavailable();
    await rotation.execute(data.token);
    return { completed: true }; // Tokens are kept only in the encrypted TTL store.
  }, { ...options, connection: workerConnection, concurrency: 8 });
  queue.on("error", () => {});
  worker.on("error", () => {}); // Request path reports bounded 503; no secret-bearing logs.

  async function refresh(token: string): Promise<void> {
    if ((await rotation.authenticate(token)).tokens) return;
    const deadline = Date.now() + config.waitMs;
    // Same old token => same job ID in every PM2 process. Never include raw JWTs.
    const job = await queue.add("rotate", {
      payload: codec.seal({ token, deadline }),
    }, {
      jobId: codec.id(token), attempts: 2, backoff: { type: "fixed", delay: 100 },
      removeOnComplete: { age: 60, count: 1000 },
      removeOnFail: { age: 60, count: 1000 },
    });

    // Poll job status across processes; B/C do not create their own rotation.
    // Token availability is governed by the 3s TTL, not job retention time.
    while (Date.now() < deadline) {
      if ((await rotation.authenticate(token)).tokens) return;
      const state = await job.getState();
      if (state === "failed" || state === "unknown" || state === "completed") {
        // Final recheck covers a completion racing the preceding DB read.
        if ((await rotation.authenticate(token)).tokens) return;
        throw refreshUnavailable();
      }
      await delay(40);
    }
    throw refreshUnavailable();
  }

  async function close(): Promise<void> {
    await worker.close();
    await queue.close();
  }
  return { refresh, close };
}
