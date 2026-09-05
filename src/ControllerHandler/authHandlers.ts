import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";
import {
  createOtpData,
  updateOtpData,
  getOtpByPhone,
  getUserByPhone,
  createUser,
  updateUser,
} from "../services/authservices";
import {
  ConfirmPasswordRequestBody,
  CustomError,
  LoginRequestBody,
  LoginResponseBody,
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
  generateOtp,
  generateToken,
  isSameDay,
  MAX_OTP_REQUESTS_PER_DAY,
  MAX_OTP_ERRORS_PER_DAY,
  OTP_EXPIRY_MINUTES,
  normalizePhone,
  BCRYPT_SALT_ROUNDS,
  checkUserExistNot,
} from "../utils";
import bcrypt from "bcrypt";
import moment from "moment";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { error } from "node:console";



export const registerUserHandler = async (
  req: Request<unknown, unknown, RegisterUserRequestBody>,
  res: Response<RegisterUserResponseBody>,
  next: NextFunction
): Promise<void> => {
  const phone = normalizePhone(req.body.phone);

  const user = await getUserByPhone(phone);
  checkUserExist(user);

  const token = generateToken();
  // const otp = generateOtp();
  const otp = 123456
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
    const error = new Error("Invalid token") as CustomError;
    error.status = 400;
    error.code = "Error_Invalid_Token";
    return next(error);
  }

  const isExpired =
    Date.now() - new Date(otpRow!.updatedAt).getTime() >
    OTP_EXPIRY_MINUTES * 60 * 1000;
  if (isExpired) {
    const error = new Error(
      "OTP has expired. Please request a new one."
    ) as CustomError;
    error.status = 403;
    error.code = "Error_OTP_Expired";
    return next(error);
  }

  const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp);
  if (!isMatchOtp) {
    await updateOtpData(otpRow!.id, {
      error: isSameDate ? { increment: 1 } : 1,
      ...(isSameDate ? {} : { count: 1 }),
    });
    const error = new Error("OTP is incorrect") as CustomError;
    error.status = 400;
    error.code = "Error_Incorrect_OTP";
    return next(error);
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
  const { token, phone, password } = req.body
  const user = await getUserByPhone(normalizePhone(phone))
  checkUserExist(user)
  const otpRow = await getOtpByPhone(normalizePhone(phone))
  checkOtpRow(otpRow);

  // otp error count is Over limit
  if (otpRow?.error === MAX_OTP_ERRORS_PER_DAY) {
    const error = new Error('This request may be and attack.') as CustomError;
    error.status = 400;
    error.code = "Error_OverLimit";
    return next(error);
  }
  //check verify token is Match
  const isMatchToken = otpRow?.verifyToken === token
  if (!isMatchToken) {
    const error = new Error('Invalid token') as CustomError;
    error.status = 400;
    error.code = "Error_Invalid_Token";
    return next(error);
  }

  //request is expired
  const isExpired = moment().diff(otpRow.updatedAt, 'minutes') > 10;
  if (isExpired) {
    const error = new Error('Your request is expired') as CustomError
    error.status = 403;
    error.code = 'Error_Expired';
    return next(error)
  }

  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);
  const tempRandomToken = "temp_token_will_be_replaced";

  const userdata = {
    phone: phone,
    password: hashPassword,
    randomToken: tempRandomToken,
  }

  const newuser = await createUser(userdata);
  const accessTokenPayload = { id: newuser.id };
  const refreshTokenPayload = { id: newuser.id, phone: newuser.phone };
  const accessToken = jwt.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: 60 * 15,
  });

  const refreshToken = jwt.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: '30d'
  })

  await updateUser(newuser.id, { randomToken: refreshToken })

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'development' ? false : true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000, // 15 minute
  }).cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'development' ? false : true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }).status(201).json({ message: "SuccessFully created an account", userId: newuser.id, });
};

export const loginHandler = async (
  req: Request<unknown, unknown, LoginRequestBody>,
  res: Response<LoginResponseBody>,
  next: NextFunction
): Promise<void> => {
  const { phone, password } = req.body
  const user = await getUserByPhone(phone)
  //check user is not register
  checkUserExistNot(user);
  //check freeze wrong password is overlimit
  if (user?.status === "FREEZE") {
    const error = new Error('Your account is temponary lock , please contact us ') as CustomError
    error.status = 401;
    error.code = "ERROR_FREEZE"
  }

  const isMatchPassword = await bcrypt.compare(password, user?.password!);

  if (!isMatchPassword) {
    //start recording worng time
    const lastRequest = new Date(user!.updatedAt).toLocaleDateString();
    const isSameDate = lastRequest === new Date().toLocaleDateString();
    // Today password is wrong first time
    if (!isSameDate) {
      const userData = {
        errorLoginCount: 1,
      }

      await updateUser(user?.id!, userData)
    } else {
      //today password was wrong 6 times will be freeze
      if (user!.errorLoginCount >= 6) {
        await (user?.id, {
          status: "FREEZE"
        })

      } else {
        // increase wrong count
        await updateUser(user!.id, {
          errorLoginCount: {
            increment: 1
          }
        })
      }
    }
    // end --------------------


   const error = new Error('Password is wrong') as CustomError
         error.status= 401
         error.code = 'ERROR_INVALID'
  }

  const accessTokenPayload = { id: user!.id };
  const refreshTokenPayload = { id: user!.id, phone: user!.phone };
  const accessToken = jwt.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: 60 * 15 // 15 minute,
  });

  const refreshToken = jwt.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: '30d' // 30
  })
  const userData = {
      errorLoginCount:0, //reset error count
      randomToken: refreshToken
  }
  await updateUser(user!.id,userData);


  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'development' ? false : true,
    sameSite: 'none',
    maxAge: 15 * 60 * 1000, // 15 minute
  }).cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'development' ? false : true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }).status(200).json({ message: "SuccessFully Logged In", id: user!.id, });
};
