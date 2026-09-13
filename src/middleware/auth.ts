import { NextFunction, Request, Response } from "express";
import { authenticateRefreshToken, rotateSession } from "../auth/session";
import { isMobile, readTokens, setAuthCookies } from "../auth/transport";
import { accessTokenExpired, unauthenticated, verifyAccessToken } from "../auth/tokens";
import { CustomError } from "../utils/commonType";

interface AuthenticatedRequest extends Request { userId?: number | string }

export const authMiddleware = async (
  req: AuthenticatedRequest, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const { accessToken, refreshToken } = readTokens(req);
    // Preserve the existing DB session and phone checks on every request.
    const user = await authenticateRefreshToken(refreshToken);
    let needsRefresh = !accessToken;

    if (accessToken) {
      try {
        const claims = verifyAccessToken(accessToken);
        if (claims.id !== user.id) throw unauthenticated();
      } catch (error) {
        if ((error as CustomError).code !== "Error_AccessTokenExpired") throw error;
        needsRefresh = true;
      }
    }

    if (needsRefresh) {
      if (isMobile(req)) throw accessTokenExpired();
      const tokens = await rotateSession(user);
      setAuthCookies(res, tokens);
      res.setHeader("Cache-Control", "no-store");
    }

    req.userId = user.id;
    return next();
  } catch (error) {
    return next(error);
  }
};
