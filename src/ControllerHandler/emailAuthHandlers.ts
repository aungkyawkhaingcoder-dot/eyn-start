import { Request, Response } from "express";
import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import { sendAuthResponse } from "../auth/transport";
import { sendVerificationEmail } from "../services/email";
import {
  normalizeEmail, hashEmailToken, getUserByEmail, saveEmailOtp, invalidateEmailOtp,
  reserveEmailOtpAttempt, markEmailOtpVerified, createVerifiedEmailUser,
  recordEmailLoginFailure, startVerifiedEmailSession,
} from "../services/emailAuthServices";
import { BCRYPT_SALT_ROUNDS, OTP_LENGTH, createError, generateToken } from "../utils";

// Same reading order as the phone handlers: register → verify OTP → password → login.
export async function registerEmailHandler(req: Request, res: Response): Promise<void> {
  const email = normalizeEmail(req.body.email);
  const user = await getUserByEmail(email);
  if (user) throw createError("This email is already registered.", 409, "Error_Already_Exist");

  const token = generateToken();
  const otp = randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
  const hashedOtp = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);
  await saveEmailOtp(email, hashedOtp, token);

  try {
    await sendVerificationEmail(email, otp);
  } catch (error) {
    await invalidateEmailOtp(email, token);
    throw error;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ message: "Verification email accepted for sending.", email, token });
}

export async function verifyEmailOtpHandler(req: Request, res: Response): Promise<void> {
  const { otp, token } = req.body;
  const email = normalizeEmail(req.body.email);
  const row = await reserveEmailOtpAttempt(email);
  if (row.rememberToken !== hashEmailToken(token)) {
    throw createError("Invalid token.", 400, "Error_Invalid_Token");
  }
  if (!await bcrypt.compare(otp, row.otp)) {
    throw createError("OTP is incorrect.", 400, "Error_Incorrect_OTP");
  }

  const verifyToken = generateToken();
  await markEmailOtpVerified(email, row.rememberToken, verifyToken);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ message: "OTP is successfully verified.", email, verifyToken });
}

export async function confirmEmailPasswordHandler(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;
  const email = normalizeEmail(req.body.email);
  const user = await getUserByEmail(email);
  if (user) throw createError("This email is already registered.", 409, "Error_Already_Exist");

  const hashPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const newUser = await createVerifiedEmailUser(email, token, hashPassword, generateToken());
  const tokens = await startVerifiedEmailSession(newUser);
  sendAuthResponse(req, res, tokens, { message: "Successfully created an account.", userId: newUser.id }, 201);
}

export async function loginEmailHandler(req: Request, res: Response): Promise<void> {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);
  const user = await getUserByEmail(email);
  if (!user) throw createError("Email or password is incorrect.", 401, "ERROR_INVALID");
  if (user.status !== "ACTIVE") {
    throw createError("Your account is unavailable. Please contact us.", 401, "ERROR_FREEZE");
  }
  if (!user.emailVerifiedAt) throw createError("Verify your email first.", 403, "Error_EmailNotVerified");

  if (!await bcrypt.compare(password, user.password)) {
    // Atomic increment avoids lost failures when requests arrive together.
    // Email login counts consecutive failures until success (not unrelated updatedAt writes).
    await recordEmailLoginFailure(user.id);
    throw createError("Email or password is incorrect.", 401, "ERROR_INVALID");
  }

  const tokens = await startVerifiedEmailSession(user);
  sendAuthResponse(req, res, tokens, { message: "Successfully logged in.", id: user.id });
}
