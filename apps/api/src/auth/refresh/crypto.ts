import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

// Tokens must not appear in Redis key names, BullMQ job data or job return values.
export function createRefreshCodec(secret: string, namespace: string) {
  const key = Buffer.from(hkdfSync("sha256", secret, namespace, "browser-refresh-v1", 32));
  return {
    id(token: string) {
      return createHmac("sha256", key).update(token).digest("hex");
    },
    seal(value: unknown): string {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
    },
    open<T>(value: string): T {
      const data = Buffer.from(value, "base64url");
      const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(12, 28));
      return JSON.parse(Buffer.concat([
        decipher.update(data.subarray(28)), decipher.final(),
      ]).toString("utf8")) as T;
    },
  };
}
export type RefreshCodec = ReturnType<typeof createRefreshCodec>;
