import { NextFunction, Request, Response } from "express";
import { resolveBrowserSession, resolveMobileSession } from "../auth/refresh/browserSession";
import { isMobile, readTokens, setAuthCookies } from "../auth/transport";
import { accessTokenExpired, unauthenticated, verifyAccessToken, verifyRefreshToken } from "../auth/tokens";
import { CustomError } from "../utils/commonType";

interface AuthenticatedRequest extends Request { userId?: number | string }

export const authMiddleware = async (
  req: AuthenticatedRequest, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const { accessToken, refreshToken } = readTokens(req);
    if (!refreshToken) throw unauthenticated();
    const refreshClaims = verifyRefreshToken(refreshToken);
    let needsRefresh = !accessToken;

    if (accessToken) {
      try {
        const claims = verifyAccessToken(accessToken);
        if (claims.id !== refreshClaims.id) throw unauthenticated();
      } catch (error) {
        if ((error as CustomError).code !== "Error_AccessTokenExpired") throw error;
        needsRefresh = true;
      }
    }

    if (isMobile(req)) {
      // Another request may have just rotated this token. Tell the interceptor
      // to retrieve the shared successor instead of treating it as a logout.
      const session = await resolveMobileSession(refreshToken, false);
      if (needsRefresh || session.tokens) throw accessTokenExpired();
      req.userId = session.user.id;
    } else {
      // A stale browser cookie may belong to a rotation another process just finished.
      const session = await resolveBrowserSession(refreshToken, needsRefresh);
      if (session.tokens) {
        setAuthCookies(res, session.tokens);
        res.setHeader("Cache-Control", "no-store");
      }
      req.userId = session.user.id;
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
