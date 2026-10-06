import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./auth";

// No credentials means guest checkout. Supplied credentials must be verified;
// never silently downgrade an invalid/expired session to an anonymous purchase.
export function checkoutSession(req: Request, res: Response, next: NextFunction) {
  if (req.cookies?.accessToken || req.cookies?.refreshToken ||
      req.headers.authorization || req.headers["x-refresh-token"]) {
    return authMiddleware(req, res, next);
  }
  return next();
}
