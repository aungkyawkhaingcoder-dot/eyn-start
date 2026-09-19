// Each deployment has its own .env (or host-injected environment variables).
// APP_ENV identifies the deployment; NODE_ENV controls the Node runtime mode.
export function readServerConfig() {
  const environment = process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "local");
  if (!["local", "development", "production"].includes(environment)) {
    throw new Error("APP_ENV must be local, development or production");
  }
  const hosted = environment !== "local";
  if (hosted && process.env.NODE_ENV !== "production") {
    throw new Error("Online development and production servers require NODE_ENV=production");
  }
  const origins = (process.env.CORS_ORIGINS ?? (hosted ? "" :
    "http://localhost:3000,http://localhost:3001,http://localhost:5173"))
    .split(",").map(value => value.trim()).filter(Boolean);
  if (!origins.length) throw new Error("CORS_ORIGINS must list the allowed frontend origins");
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !["http:", "https:"].includes(parsed.protocol) ||
        (hosted && parsed.protocol !== "https:")) {
      throw new Error("CORS_ORIGINS must contain exact origins without paths; online servers require HTTPS");
    }
  }
  const secure = hosted || process.env.NODE_ENV !== "development";
  const sameSite = process.env.COOKIE_SAME_SITE ?? (secure ? "none" : "lax");
  if (!["lax", "strict", "none"].includes(sameSite)) throw new Error("Invalid COOKIE_SAME_SITE");
  if (sameSite === "none" && !secure) throw new Error("SameSite=none requires secure HTTPS cookies");
  // Leave false unless the deployment has a trusted, fixed proxy topology.
  const hops = process.env.TRUST_PROXY_HOPS ?? "0";
  if (!/^\d+$/.test(hops) || Number(hops) > 10) throw new Error("TRUST_PROXY_HOPS must be between 0 and 10");
  return { environment, origins, secure, sameSite: sameSite as "lax" | "strict" | "none", trustProxy: Number(hops) || false };
}
