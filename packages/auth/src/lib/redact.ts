// Recursively redact proofs/tokens even when an unexpected response includes them.
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /token|password|nonce|challengeId|secret|otp/i.test(key)
          ? "[hidden]"
          : redact(item),
      ]),
    );
  return value;
}
