import { Request, Response, NextFunction } from "express";
import { authenticateRefreshToken, rotateSession, startSession } from "../auth/session";
import { clearAuthCookies, readMobileRefreshToken, readTokens, sendAuthResponse } from "../auth/transport";
import { unauthenticated } from "../auth/tokens";
import { createError } from "../utils";
import {
  createOtpData,
  updateOtpData,
  getOtpByPhone,
  getUserByPhone,
  createUser,
  updateUser,
  replaceRefreshToken,
} from "../services/authservices";
import {
  ConfirmPasswordRequestBody,
  LoginRequestBody,
  RegisterUserRequestBody,
  RegisterUserResponseBody,
  VerifyOtpRequestBody,
  VerifyOtpResponseBody,
} from "../utils/commonType";
import {
  checkOtpErrorIfSameDate,
  checkOtpLimit,
  checkOtpRow,
  checkUserExist,
  generateToken,
  isSameDay,
  MAX_OTP_REQUESTS_PER_DAY,
  MAX_OTP_ERRORS_PER_DAY,
  OTP_EXPIRY_MINUTES,
  normalizePhone,
  BCRYPT_SALT_ROUNDS,
} from "../utils";
import bcrypt from "bcrypt";
import moment from "moment";
import "dotenv/config";


export const registerUserHandler = async (
  req: Request<unknown, unknown, RegisterUserRequestBody>,
  res: Response<RegisterUserResponseBody>,
  next: NextFunction
): Promise<void> => {
  const phone = normalizePhone(req.body.phone);

  const user = await getUserByPhone(phone);
  checkUserExist(user);

  const token = generateToken();
  // Existing development stub: connect an SMS sender before using generateOtp().
  const otp = 123456;
  const hashSalt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const hashedOtp = await bcrypt.hash(otp.toString(), hashSalt);

  const baseOtpData = {
    otp: hashedOtp,
    rememberToken: token,
  };

  const otpRow = await getOtpByPhone(phone);
  if (!otpRow) {
    await createOtpData({
      ...baseOtpData,
      phone,
      count: 1,
    });
  } else {
    const today = new Date();
    const isSameDate = isSameDay(otpRow.updatedAt, today);
    checkOtpErrorIfSameDate(isSameDate, otpRow.error);

    if (!isSameDate) {
      await updateOtpData(otpRow.id, {
        ...baseOtpData,
        count: 1,
        error: 0,
      });
    } else if (otpRow.count >= MAX_OTP_REQUESTS_PER_DAY) {
      checkOtpLimit(next);
      return;
    } else {
      await updateOtpData(otpRow.id, {
        ...baseOtpData,
        count: { increment: 1 },
      });
    }
  }

  res.status(200).json({
    message: `We are sending otp to 09${phone}`,
    phone,
    token,
  });
};

export const verifyOtpHandler = async (
  req: Request<unknown, unknown, VerifyOtpRequestBody>,
  res: Response<VerifyOtpResponseBody>,
  next: NextFunction
): Promise<void> => {
  const { phone, otp, token } = req.body;
  const normalizedPhone = normalizePhone(phone);

  const otpRow = await getOtpByPhone(normalizedPhone);
  checkOtpRow(otpRow);

  const today = new Date();
  const isSameDate = isSameDay(otpRow!.updatedAt, today);
  checkOtpErrorIfSameDate(isSameDate, otpRow!.error);

  if (otpRow!.rememberToken !== token) {
    await updateOtpData(otpRow!.id, {
      error: MAX_OTP_ERRORS_PER_DAY,
    });
    return next(createError("Invalid token", 400, "Error_Invalid_Token"));
  }

  const isExpired =
    Date.now() - new Date(otpRow!.updatedAt).getTime() >
    OTP_EXPIRY_MINUTES * 60 * 1000;
  if (isExpired) {
    return next(createError(
      "OTP has expired. Please request a new one.", 403, "Error_OTP_Expired"));
  }

  const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp);
  if (!isMatchOtp) {
    await updateOtpData(otpRow!.id, {
      error: isSameDate ? { increment: 1 } : 1,
      ...(isSameDate ? {} : { count: 1 }),
    });
    return next(createError("OTP is incorrect", 400, "Error_Incorrect_OTP"));
  }

  const verifyToken = generateToken();
  const result = await updateOtpData(otpRow!.id, {
    verifyToken,
    error: 0,
    count: 1,
  });

  res.status(200).json({
    message: "OTP is successfully verified",
    phone: result.phone,
    verifyToken: result.verifyToken ?? "",
  });
};

export const confirmPasswordHandler = async (
  req: Request<unknown, unknown, ConfirmPasswordRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { token, password } = req.body;
  const phone = normalizePhone(req.body.phone);
  const user = await getUserByPhone(phone);
  checkUserExist(user);
  const otpRow = await getOtpByPhone(phone);
  checkOtpRow(otpRow);

  // Reject blocked OTP verification attempts.
  if (otpRow?.error === MAX_OTP_ERRORS_PER_DAY) {
    return next(createError('This request may be and attack.', 400, "Error_OverLimit"));
  }
  // Require the token issued after successful OTP verification.
  const isMatchToken = otpRow?.verifyToken === token;
  if (!isMatchToken) {
    return next(createError('Invalid token', 400, "Error_Invalid_Token"));
  }

  // Password confirmation must follow recent OTP verification.
  const isExpired = moment().diff(otpRow.updatedAt, 'minutes') > 10;
  if (isExpired) {
    return next(createError('Your request is expired', 403, 'Error_Expired'));
  }

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const hashPassword = await bcrypt.hash(password, salt);
  const tempRandomToken = generateToken();

  const userdata = {
    phone,
    password: hashPassword.toString(),
    randomToken: tempRandomToken,
  };

  const newuser = await createUser(userdata);
  const tokens = await startSession(newuser);
  sendAuthResponse(req, res, tokens, {
    message: "SuccessFully created an account", userId: newuser.id,
  }, 201);
};

export const loginHandler = async (
  req: Request<unknown, unknown, LoginRequestBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { password } = req.body;
  const user = await getUserByPhone(normalizePhone(req.body.phone));
  if (!user) throw createError("This phone has not registered", 401, "Error_Unauthenicated");

  if (user.status === "FREEZE") {
    return next(createError("Your account is temporarily locked. Please contact us.", 401, "ERROR_FREEZE"));
  }

  if (!await bcrypt.compare(password, user.password)) {
    const sameDay = isSameDay(user.updatedAt, new Date());
    const attempts = sameDay ? user.errorLoginCount + 1 : 1;
    await updateUser(user.id, {
      errorLoginCount: attempts,
      ...(attempts >= 6 ? { status: "FREEZE" as const } : {}),
    });
    return next(createError("Password is wrong", 401, "ERROR_INVALID"));
  }

  const tokens = await startSession(user);
  sendAuthResponse(req, res, tokens, {
    message: "SuccessFully Logged In", id: user.id,
  });
};

export const logoutHandler = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = readTokens(req);
  const user = await authenticateRefreshToken(refreshToken);
  if (!await replaceRefreshToken(user.id, user.randomToken, generateToken())) {
    throw unauthenticated();
  }
  clearAuthCookies(res);
  res.status(200).json({ message: "SuccessFully Logged Out. See you soon!" });
};

// This endpoint remains mobile-only and accepts the existing x-refresh-token header.
export const refreshTokenHandler = async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateRefreshToken(readMobileRefreshToken(req));
  const tokens = await rotateSession(user);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ message: "SuccessFully Refreshed Token", ...tokens });
};


