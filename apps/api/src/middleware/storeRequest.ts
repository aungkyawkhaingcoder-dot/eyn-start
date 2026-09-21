import { Request, Response, NextFunction } from "express";
import { readServerConfig } from "../config/server";
import { createError } from "../utils";

// Run after authMiddleware. Preserve the browser Origin and JSON safeguards.
export function storeRequestMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("Cache-Control", "no-store");
  if (["GET", "HEAD"].includes(req.method)) {
    next();
    return;
  }

  const isMobile = req.headers["x-platform"] === "mobile";
  const allowedOrigin = readServerConfig().origins.includes(
    req.headers.origin || "",
  );
  if (!isMobile && !allowedOrigin) {
    throw createError("Origin is not allowed.", 403, "Error_Origin");
  }
  if (req.method !== "DELETE" && !req.is("application/json")) {
    throw createError("Use application/json.", 415, "Error_ContentType");
  }
  next();
}
