import "dotenv/config";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { createError } from "../utils";

function readTokenSeconds(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const seconds = Number(raw);
  // Keep JWT seconds and cookie milliseconds within a representable Date range.
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(seconds) || seconds < 1 || seconds > 2147483647) {
    throw new Error(`${name} must be an integer between 1 and 2147483647 (seconds)`);
  }
  return seconds;
}

// Loaded once per process; restart all workers after changing these values.
export const ACCESS_TOKEN_SECONDS = readTokenSeconds("ACCESS_TOKEN_TTL_SECONDS", 15 * 60);
export const REFRESH_TOKEN_SECONDS = readTokenSeconds("REFRESH_TOKEN_TTL_SECONDS", 30 * 24 * 60 * 60);
export interface TokenPair { accessToken: string; refreshToken: string }
export interface TokenUser { id: number; phone: string | null; email?: string | null }

function secret(kind: "ACCESS" | "REFRESH"): string {
  const value = process.env[`${kind}_TOKEN_SECRET`];
  if (!value) throw new Error(`${kind}_TOKEN_SECRET is required`);
  return value;
}

export function issueTokens(user: TokenUser): TokenPair {
  const identity = user.phone ? { phone: user.phone } : { email: user.email };
  if (!user.phone && !user.email) throw unauthenticated();
  return {
    accessToken: jwt.sign({ id: user.id }, secret("ACCESS"), {
      algorithm: "HS256", expiresIn: ACCESS_TOKEN_SECONDS,
    }),
    refreshToken: jwt.sign({ id: user.id, ...identity }, secret("REFRESH"), {
      algorithm: "HS256", expiresIn: REFRESH_TOKEN_SECONDS, jwtid: randomUUID(),
    }),
  };
}

function verify(token: string, kind: "ACCESS" | "REFRESH") {
  const key = secret(kind);
  try {
    const payload = jwt.verify(token, key, { algorithms: ["HS256"] });
    if (typeof payload === "string" ||
        !["number", "string"].includes(typeof payload.id) ||
        !Number.isSafeInteger(Number(payload.id)) || Number(payload.id) <= 0 ||
        typeof payload.exp !== "number") throw new Error("Invalid claims");
    if (kind === "REFRESH") {
      const phoneIdentity = typeof payload.phone === "string" && payload.phone.length > 0 && payload.email === undefined;
      const emailIdentity = typeof payload.email === "string" && payload.email.length > 0 && payload.phone === undefined;
      if (!phoneIdentity && !emailIdentity) throw new Error("Invalid identity claim");
    }
    return { ...payload, id: Number(payload.id), phone: payload.phone as string | undefined, email: payload.email as string | undefined };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw kind === "ACCESS" ? accessTokenExpired() : unauthenticated();
    }
    throw createError(`Invalid ${kind.toLowerCase()} token.`, 400,
      kind === "ACCESS" ? "Error_InvalidAccessToken" : "Error_InvalidRefreshToken");
  }
}

export const unauthenticated = () => createError(
  "You are not an authenticated user.", 401, "Error_Unauthenticated");
export const accessTokenExpired = () => createError(
  "Access token has expired. Please refresh your token.", 401, "Error_AccessTokenExpired");
export const verifyAccessToken = (token: string) => verify(token, "ACCESS");
export const verifyRefreshToken = (token: string) => verify(token, "REFRESH");

// Preserve phone-bound sessions; email-only sessions must match the DB email.
export function matchesRefreshIdentity(user: TokenUser, claims: ReturnType<typeof verifyRefreshToken>): boolean {
  return claims.phone !== undefined
    ? user.phone === claims.phone
    : !user.phone && typeof user.email === "string" && user.email === claims.email;
}
