import { Request, Response } from "express";
import { isMobile, sendAuthResponse } from "../auth/transport";
import { googleClientIds, verifyGoogleIdentity, invalidGoogleToken } from "../auth/google/verify";
import { readServerConfig } from "../config/server";
import { createError } from "../utils";
import { completeGoogleLogin, createGoogleChallenge, GOOGLE_CHALLENGE_SECONDS } from "../services/googleAuthServices";

const challengeCookie = "googleLoginChallenge";
function cookieOptions() {
  const { secure, sameSite } = readServerConfig();
  return { httpOnly: true, secure, sameSite, path: "/api/v1/google" };
}
function checkClient(req: Request) {
  // Google GIS callback must POST JSON via fetch; do not accept cross-site form posts.
  if (!req.is("application/json")) throw createError("Use application/json.", 415, "Error_ContentType");
  const config = readServerConfig();
  const origin = req.headers.origin;
  if (origin && !config.origins.includes(origin)) throw createError("Origin is not allowed.", 403, "Error_Origin");
  if (!isMobile(req) && !origin) throw createError("Browser Google login requires an allowed Origin.", 403, "Error_Origin");
}
export async function googleChallengeHandler(req: Request, res: Response): Promise<void> {
  checkClient(req);
  const mobile = isMobile(req);
  const clientIds = googleClientIds(mobile);
  const challenge = await createGoogleChallenge(mobile);
  res.setHeader("Cache-Control", "no-store");
  if (!mobile) res.cookie(challengeCookie, challenge.challengeId, { ...cookieOptions(), maxAge: GOOGLE_CHALLENGE_SECONDS * 1000 });
  res.status(200).json({ ...challenge, ...(!mobile ? { clientId: clientIds[0] } : {}) });
}
export async function googleLoginHandler(req: Request, res: Response): Promise<void> {
  checkClient(req);
  const mobile = isMobile(req);
  const { idToken, challengeId } = req.body;
  if (!mobile && req.cookies?.[challengeCookie] !== challengeId) throw invalidGoogleToken();
  const identity = await verifyGoogleIdentity(idToken, mobile);
  const result = await completeGoogleLogin(identity, challengeId, mobile);
  if (!mobile) res.clearCookie(challengeCookie, cookieOptions());
  sendAuthResponse(req, res, result.tokens, { message: "Successfully logged in.", id: result.id });
}
