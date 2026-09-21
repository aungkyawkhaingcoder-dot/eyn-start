import { Request, Response } from "express";
import { readServerConfig } from "../config/server";
import { createError } from "../utils";
import { setAuthCookies } from "../auth/transport";
import { invalidGoogleToken, verifyGoogleIdentity } from "../auth/google/verify";
import { createGoogleRedirect, googleRedirectConfig, redirectClient } from "../auth/google/redirect";
import { completeGoogleLogin, createGoogleChallenge, GOOGLE_CHALLENGE_SECONDS } from "../services/googleAuthServices";

const stateCookie = "googleRedirectState";
const verifierCookie = "googleRedirectVerifier";
const cookieOptions = () => ({ httpOnly: true, secure: readServerConfig().secure,
  sameSite: "lax" as const, path: "/api/v1/google/redirect" });

export async function googleRedirectStartHandler(req: Request, res: Response): Promise<void> {
  if (!req.is("application/json")) throw createError("Use application/json.", 415, "Error_ContentType");
  const config = googleRedirectConfig();
  if (req.headers.origin !== config.frontendOrigin) throw createError("Origin is not allowed.", 403, "Error_Origin");
  const challenge = await createGoogleChallenge(false);
  const redirect = createGoogleRedirect(challenge);
  const options = { ...cookieOptions(), maxAge: GOOGLE_CHALLENGE_SECONDS * 1000 };
  res.cookie(stateCookie, challenge.challengeId, options);
  res.cookie(verifierCookie, redirect.verifier, options);
  res.setHeader("Cache-Control", "no-store");
  res.json({ authorizationUrl: redirect.authorizationUrl });
}

export async function googleRedirectCallbackHandler(req: Request, res: Response): Promise<void> {
  const config = googleRedirectConfig();
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  // Check browser binding before exchanging any code, including denied requests.
  const state = req.query.state;
  const verifier = req.cookies?.[verifierCookie];
  if (typeof state !== "string" || !/^[a-f0-9]{64}$/.test(state) ||
      state !== req.cookies?.[stateCookie] || typeof verifier !== "string" || !/^[\w-]{43}$/.test(verifier)) {
    res.redirect(303, `${config.frontendOrigin}/login?googleError=invalid`);
    return;
  }
  res.clearCookie(stateCookie, cookieOptions());
  res.clearCookie(verifierCookie, cookieOptions());
  try {
    if (req.query.error) {
      res.redirect(303, `${config.frontendOrigin}/login?googleError=cancelled`);
      return;
    }
    const code = req.query.code;
    if (typeof code !== "string" || !code || code.length > 8192) throw invalidGoogleToken();
    const { tokens } = await redirectClient(config).getToken({ code, codeVerifier: verifier, redirect_uri: config.redirectUri });
    if (!tokens.id_token) throw invalidGoogleToken();
    const identity = await verifyGoogleIdentity(tokens.id_token, false);
    const result = await completeGoogleLogin(identity, state, false);
    setAuthCookies(res, result.tokens);
    res.redirect(303, `${config.frontendOrigin}/stores`);
  } catch (error) {
    const code = (error as { code?: string }).code;
    const reason = code === "Error_AccountLinkRequired" ? "existing" : code === "ERROR_FREEZE" ? "unavailable" : "failed";
    res.redirect(303, `${config.frontendOrigin}/login?googleError=${reason}`);
  }
}
