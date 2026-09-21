import { issueTokens, TokenUser } from "../auth/tokens";
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { createError, MAX_OTP_ERRORS_PER_DAY, MAX_OTP_REQUESTS_PER_DAY, OTP_EXPIRY_MINUTES } from "../utils";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const hashEmailToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const EMAIL_RESEND_SECONDS = 60;
export const EMAIL_VERIFY_MINUTES = 10;

export const getUserByEmail = (email: string) => prisma.user.findFirst({
  where: { email: { equals: normalizeEmail(email), mode: "insensitive" } },
});
export const getEmailOtp = (email: string) => prisma.emailOtp.findUnique({ where: { email } });

// Reserve the send BEFORE contacting Resend. Row locking serializes concurrent
// requests across PM2 processes. Never keep the DB transaction open during email delivery.
export async function saveEmailOtp(email: string, otpHash: string, token: string) {
  return prisma.$transaction(async tx => {
    await tx.emailOtp.upsert({ where: { email }, create: { email }, update: {} });
    await tx.$queryRaw`SELECT "id" FROM "EmailOtp" WHERE "email" = ${email} FOR UPDATE`;
    const row = await tx.emailOtp.findUniqueOrThrow({ where: { email } });
    const now = new Date();
    const quotaDay = now.toISOString().slice(0, 10);
    const sameDay = row.quotaDay === quotaDay;
    if (row.lastSentAt && now.getTime() - row.lastSentAt.getTime() < EMAIL_RESEND_SECONDS * 1000) {
      throw createError("Please wait 60 seconds before requesting another OTP.", 429, "Error_ResendCooldown");
    }
    if (sameDay && (row.count >= MAX_OTP_REQUESTS_PER_DAY || row.error >= MAX_OTP_ERRORS_PER_DAY)) {
      throw createError("Email OTP daily limit reached. Please try again tomorrow.", 429, "Error_OverLimit");
    }
    return tx.emailOtp.update({ where: { email }, data: {
      otp: otpHash, rememberToken: hashEmailToken(token), verifyToken: null,
      verifiedAt: null, verifyExpiresAt: null,
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60_000),
      lastSentAt: now, quotaDay, count: sameDay ? row.count + 1 : 1,
      error: sameDay ? row.error : 0,
    } });
  });
}

// Failed delivery invalidates only this attempt, never a newer resend.
export const invalidateEmailOtp = (email: string, token: string) => prisma.emailOtp.updateMany({
  where: { email, rememberToken: hashEmailToken(token) },
  data: { rememberToken: null, verifyToken: null, verifiedAt: null, expiresAt: null, verifyExpiresAt: null },
});

// Reserve one verification attempt atomically before bcrypt (including wrong request tokens).
export async function reserveEmailOtpAttempt(email: string) {
  const row = await getEmailOtp(email);
  if (!row || !row.rememberToken) throw createError("Invalid verification request.", 400, "Error_Invalid_Token");
  if (row.verifiedAt) throw createError("OTP has already been used.", 400, "Error_OTP_Used");
  if (!row.expiresAt || row.expiresAt <= new Date()) {
    throw createError("OTP has expired. Please request a new one.", 403, "Error_OTP_Expired");
  }
  const result = await prisma.emailOtp.updateMany({ where: {
    id: row.id, rememberToken: row.rememberToken, verifiedAt: null,
    expiresAt: { gt: new Date() }, error: { lt: MAX_OTP_ERRORS_PER_DAY },
  }, data: { error: { increment: 1 } } });
  if (result.count !== 1) throw createError("OTP attempt limit reached or request changed.", 429, "Error_OverLimit");
  return row;
}

export async function markEmailOtpVerified(email: string, requestTokenHash: string, verifyToken: string) {
  const now = new Date();
  const result = await prisma.emailOtp.updateMany({ where: {
    email, rememberToken: requestTokenHash, verifiedAt: null, expiresAt: { gt: now },
  }, data: {
    verifyToken: hashEmailToken(verifyToken), verifiedAt: now,
    verifyExpiresAt: new Date(now.getTime() + EMAIL_VERIFY_MINUTES * 60_000),
  } });
  if (result.count !== 1) throw createError("OTP expired, changed or already used.", 400, "Error_Invalid_Token");
}

// Consume the proof and create the account in ONE transaction; retry/replay cannot
// create another user. A resend clears the proof and makes old confirmation fail.
export async function createVerifiedEmailUser(email: string, token: string, password: string, randomToken: string) {
  try {
    return await prisma.$transaction(async tx => {
      const row = await tx.emailOtp.findUnique({ where: { email } });
      if (!row?.verifiedAt) throw createError("Verify your email first.", 400, "Error_Invalid_Token");
      const consumed = await tx.emailOtp.updateMany({ where: {
        email, verifiedAt: row.verifiedAt, verifyToken: hashEmailToken(token), verifyExpiresAt: { gt: new Date() },
      }, data: { verifyToken: null, rememberToken: null, verifyExpiresAt: null } });
      if (consumed.count !== 1) throw createError("Verification token is invalid or expired.", 400, "Error_Invalid_Token");
      return tx.user.create({ data: {
        email, emailVerifiedAt: row.verifiedAt, password, randomToken,
      } });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      throw createError("This email is already registered.", 409, "Error_Already_Exist");
    }
    throw error;
  }
}

export async function recordEmailLoginFailure(id: number): Promise<void> {
  await prisma.$transaction(async tx => {
    const user = await tx.user.update({ where: { id }, data: { errorLoginCount: { increment: 1 } } });
    if (user.errorLoginCount >= 6) await tx.user.update({ where: { id }, data: { status: "FREEZE" } });
  });
}

export async function startVerifiedEmailSession(user: TokenUser & { password: string | null }) {
  if (!user.password) throw createError("Use your sign-in provider.", 401, "ERROR_INVALID");
  const tokens = issueTokens(user);
  // Recheck status and the password snapshot when committing the session.
  const result = await prisma.user.updateMany({ where: {
    id: user.id, password: user.password, status: "ACTIVE", emailVerifiedAt: { not: null },
  }, data: { randomToken: tokens.refreshToken, errorLoginCount: 0 } });
  if (result.count !== 1) throw createError("Account changed or is unavailable. Please log in again.", 401, "ERROR_FREEZE");
  return tokens;
}
