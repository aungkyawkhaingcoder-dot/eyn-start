import { createHash, randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { googleClientIds } from "./verify";
import { readServerConfig } from "../../config/server";
import { createError } from "../../utils";

export function googleRedirectConfig() {
  const server = readServerConfig();
  const local = server.environment === "local";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || (local ? "http://localhost:8080/api/v1/google/redirect/callback" : "");
  const frontendOrigin = process.env.GOOGLE_FRONTEND_ORIGIN || (local ? "http://localhost:3000" : "");
  const clientSecret = process.env.GOOGLE_WEB_CLIENT_SECRET;
  let valid = false;
  try {
    const callback = new URL(redirectUri);
    valid = server.origins.includes(frontendOrigin) && new URL(frontendOrigin).origin === frontendOrigin &&
      !callback.username && !callback.password && !callback.search && !callback.hash &&
      (callback.protocol === "https:" || (local && callback.protocol === "http:" && callback.hostname === "localhost"));
  } catch { /* Report a configuration error without exposing credentials. */ }
  if (!valid || !clientSecret) throw createError("Google redirect login is not configured. Contact the administrator.", 503, "Error_GoogleConfiguration");
  return { redirectUri, frontendOrigin, clientSecret, clientId: googleClientIds(false)[0]! };
}

export function redirectClient(config: ReturnType<typeof googleRedirectConfig>) {
  return new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri,
    transporterOptions: { timeout: 10000, retry: false } });
}
export function createGoogleRedirect(challenge: { challengeId: string; nonce: string }) {
  const config = googleRedirectConfig();
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri,
    response_type: "code", scope: "openid email profile", prompt: "select_account",
    state: challenge.challengeId, nonce: challenge.nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return { authorizationUrl: url.toString(), verifier };
}
