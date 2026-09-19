import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { createError, generateToken } from "../utils";
import { issueTokens } from "../auth/tokens";
import { GoogleIdentity, invalidGoogleToken } from "../auth/google/verify";

export const GOOGLE_CHALLENGE_SECONDS = 300;
export const hashGoogleValue = (value: string) => createHash("sha256").update(value).digest("hex");
export async function createGoogleChallenge(mobile: boolean) {
  const challengeId = generateToken();
  const nonce = generateToken();
  const expiresAt = new Date(Date.now() + GOOGLE_CHALLENGE_SECONDS * 1000);
  // Expired challenges have no authentication value; bound retention on active deployments.
  await prisma.oAuthChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.oAuthChallenge.create({ data: {
    id: hashGoogleValue(challengeId), nonceHash: hashGoogleValue(nonce), platform: mobile ? "mobile" : "browser", expiresAt,
  } });
  return { challengeId, nonce, expiresIn: GOOGLE_CHALLENGE_SECONDS };
}
export async function completeGoogleLogin(identity: GoogleIdentity, challengeId: string, mobile: boolean) {
  try {
    return await prisma.$transaction(async tx => {
      const consumed = await tx.oAuthChallenge.updateMany({ where: {
        id: hashGoogleValue(challengeId), nonceHash: hashGoogleValue(identity.nonce),
        platform: mobile ? "mobile" : "browser", consumedAt: null, expiresAt: { gt: new Date() },
      }, data: { consumedAt: new Date() } });
      if (consumed.count !== 1) throw invalidGoogleToken();
      const account = await tx.oAuthAccount.findUnique({
        where: { provider_subject: { provider: "google", subject: identity.subject } }, include: { user: true },
      });
      let user = account?.user;
      if (!user) {
        // Never attach a provider to an existing user based solely on email.
        const existing = await tx.user.findFirst({ where: { email: { equals: identity.email, mode: "insensitive" } } });
        if (existing) throw createError("Sign in with your existing method. Account linking is required.", 409, "Error_AccountLinkRequired");
        if (!identity.authoritativeEmail) {
          throw createError("Verify this email using email registration first.", 403, "Error_GoogleEmailVerificationRequired");
        }
        user = await tx.user.create({ data: {
          email: identity.email, emailVerifiedAt: new Date(), name: identity.name,
          password: null, randomToken: generateToken(),
          oauthAccounts: { create: { provider: "google", subject: identity.subject } },
        } });
      }
      // Use the stored identity for app JWTs; Google email changes never silently rewrite it.
      const tokens = issueTokens(user);
      const updated = await tx.user.updateMany({ where: { id: user.id, status: "ACTIVE" },
        data: { randomToken: tokens.refreshToken, lastLogin: new Date(), errorLoginCount: 0 } });
      if (updated.count !== 1) throw createError("Your account is unavailable.", 401, "ERROR_FREEZE");
      // Challenge consumption, account creation and session commit are atomic.
      return { id: user.id, tokens };
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      throw createError("Account creation conflicted. Please start Google login again.", 409, "Error_GoogleLoginConflict");
    }
    throw error;
  }
}
