import { CookieOptions, Request, Response } from "express";
import { ACCESS_TOKEN_SECONDS, REFRESH_TOKEN_SECONDS, TokenPair } from "./tokens";
import { readServerConfig } from "../config/server";

export const isMobile = (req: Pick<Request, "headers" | "cookies">) => req.headers["x-platform"] === "mobile";
const tokenString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export function readTokens(req: Pick<Request, "headers" | "cookies">) {
  if (isMobile(req)) {
    return {
      accessToken: /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "")?.[1] ?? null,
      refreshToken: readMobileRefreshToken(req),
    };
  }
  return {
    accessToken: tokenString(req.cookies?.accessToken),
    refreshToken: tokenString(req.cookies?.refreshToken),
  };
}

export const readMobileRefreshToken = (req: Pick<Request, "headers" | "cookies">) => tokenString(req.headers["x-refresh-token"]);

function cookieOptions(): CookieOptions {
  const { secure, sameSite } = readServerConfig();
  return { httpOnly: true, secure, sameSite, path: "/" };
}

export function setAuthCookies(res: Response, tokens: TokenPair): void {
  res.cookie("accessToken", tokens.accessToken, {
    ...cookieOptions(), maxAge: ACCESS_TOKEN_SECONDS * 1000,
  });
  res.cookie("refreshToken", tokens.refreshToken, {
    ...cookieOptions(), maxAge: REFRESH_TOKEN_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("accessToken", cookieOptions());
  res.clearCookie("refreshToken", cookieOptions());
}

export function sendAuthResponse(
  req: Pick<Request, "headers" | "cookies">, res: Response, tokens: TokenPair,
  body: { message: string; id?: number; userId?: number }, status = 200,
): void {
  res.setHeader("Cache-Control", "no-store");
  if (isMobile(req)) {
    res.status(status).json({ ...body, ...tokens, expiresIn: ACCESS_TOKEN_SECONDS });
  } else {
    setAuthCookies(res, tokens);
    res.status(status).json(body);
  }
}
