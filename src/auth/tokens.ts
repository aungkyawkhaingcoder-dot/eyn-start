import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { createError } from "../utils";

export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
export interface TokenPair { accessToken: string; refreshToken: string }
interface TokenUser { id: number; phone: string }

function secret(kind: "ACCESS" | "REFRESH"): string {
  const value = process.env[`${kind}_TOKEN_SECRET`];
  if (!value) throw new Error(`${kind}_TOKEN_SECRET is required`);
  return value;
}

export function issueTokens(user: TokenUser): TokenPair {
  return {
    accessToken: jwt.sign({ id: user.id }, secret("ACCESS"), {
      algorithm: "HS256", expiresIn: ACCESS_TOKEN_SECONDS,
    }),
    refreshToken: jwt.sign({ id: user.id, phone: user.phone }, secret("REFRESH"), {
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
    if (kind === "REFRESH" && (typeof payload.phone !== "string" || !payload.phone)) {
      throw new Error("Invalid phone claim");
    }
    return { ...payload, id: Number(payload.id), phone: payload.phone as string };
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
