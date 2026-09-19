import { OAuth2Client } from "google-auth-library";
import { createError } from "../../utils";

const client = new OAuth2Client({ transporterOptions: { timeout: 5000, retry: false } });
export const invalidGoogleToken = () => createError("Invalid or expired Google login.", 401, "Error_InvalidGoogleToken");
export function googleClientIds(mobile: boolean): string[] {
  const key = mobile ? "GOOGLE_MOBILE_CLIENT_IDS" : "GOOGLE_WEB_CLIENT_ID";
  const ids = (process.env[key] ?? "").split(",").map(value => value.trim()).filter(Boolean);
  if (!ids.length || (!mobile && ids.length !== 1) || ids.some(id => !id.endsWith(".apps.googleusercontent.com"))) {
    throw createError("Google login is not configured for this platform.", 503, "Error_GoogleConfiguration");
  }
  return ids;
}
export interface GoogleIdentity { subject: string; email: string; name: string | null; nonce: string; authoritativeEmail: boolean }
export async function verifyGoogleIdentity(idToken: string, mobile: boolean): Promise<GoogleIdentity> {
  const audience = googleClientIds(mobile);
  let payload;
  try {
    // Official verifier checks Google's signature, issuer, audience and expiry.
    const ticket = await client.verifyIdToken({ idToken, audience });
    payload = ticket.getPayload();
  } catch (error) {
    const failure = error as { code?: string; response?: { status?: number } };
    if (["ENOTFOUND", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN"].includes(failure.code ?? "") ||
        (failure.response?.status ?? 0) >= 500) {
      throw createError("Google verification is temporarily unavailable.", 503, "Error_GoogleUnavailable");
    }
    throw invalidGoogleToken();
  }
  const nonce = (payload as unknown as { nonce?: unknown })?.nonce;
  if (!payload || !payload.sub || payload.sub.length > 255 || payload.email_verified !== true ||
      typeof payload.email !== "string" || payload.email.length > 70 ||
      !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(payload.email) ||
      typeof nonce !== "string" || !/^[a-f0-9]{64}$/.test(nonce)) throw invalidGoogleToken();
  if (payload.azp && !audience.includes(payload.azp)) throw invalidGoogleToken();
  const email = payload.email.toLowerCase();
  return { subject: payload.sub, email, name: typeof payload.name === "string" ? payload.name.slice(0, 255) : null,
    nonce, authoritativeEmail: email.endsWith("@gmail.com") || !!payload.hd };
}
