import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type Redis from "ioredis";
import { createError } from "../../utils";
import { RefreshConfig } from "./config";
import { RefreshCodec } from "./crypto";
import { SharedRotation } from "./rotation";

export const refreshUnavailable = () => createError(
  "Session refresh is temporarily unavailable. Please try again.", 503, "Error_RefreshUnavailable",
);

// Setup တစ်ကြိမ်လုပ်ပြီး request တိုင်းသုံးမယ့် refresh function ကို ပြန်ပေးသည်။
export function createRedisRefreshStrategy(
  redis: Redis,
  rotation: SharedRotation,
  codec: RefreshCodec,
  config: RefreshConfig,
) {
  async function refresh(token: string): Promise<void> {
    const deadline = Date.now() + config.waitMs;
    const lockKey = `${config.prefix}:lock:${codec.id(token)}`;
    const owner = randomUUID();
    // အခြား request က refresh လုပ်ပြီးပြီဆို result ကို ပြန်သုံးမည်။
    while (Date.now() < deadline) {
      if ((await rotation.authenticate(token)).tokens) return;
      const acquired = await redis.set(lockKey, owner, "PX", config.lockMs, "NX");
      // Lock ရတဲ့ request ကသာ rotation ကို စလုပ်မည်။
      if (acquired) {
        try {
          await rotation.execute(token);
          return;
        } finally {
          // Never delete a lock acquired by somebody else after our lease expired.
          await redis.eval(
            "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
            1, lockKey, owner,
          );
        }
      }
      // Lock မရသေးရင် ခဏစောင့်ပြီး result ကို ပြန်စစ်မည်။
      await delay(40);
    }
    throw refreshUnavailable();
  }
  return { refresh };
}
