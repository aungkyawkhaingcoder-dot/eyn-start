import { CustomError } from "./commonType";
import { randomBytes } from "crypto";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { ValidationError, validationResult } from "express-validator";
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 2;
export const MAX_OTP_REQUESTS_PER_DAY = 3;
export const MAX_OTP_ERRORS_PER_DAY = 5;
export const BCRYPT_SALT_ROUNDS = 10;

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors: ValidationError[] = validationResult(req).array({
    onlyFirstError: true,
  });
  if (errors.length > 0) {
    const error = Object.assign(new Error(errors[0]!.msg), {
      status: 400,
      code: "Error",
    });
   return next(error);
  }
  next();
};

export const withValidation = (
  validations: RequestHandler[],
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler[] => [
    ...validations,
      handleValidationErrors,
      handler,
    
  ];


export const normalizePhone = (phone: string): string => {
  if (phone.slice(0, 2) === "09") {
    return phone.substring(2);
  }
  return phone;
};

export const isSameDay = (dateA: Date, dateB: Date): boolean => {
  return dateA.toLocaleDateString() === dateB.toLocaleDateString();
};

export const createError = (
  message: string,
  status: number,
  code: string
): CustomError => {
  const error = new Error(message) as CustomError;
  error.status = status;
  error.code = code;
  return error;
};


export const checkUserExistNot = (user: any) => {
  if (!user) {
    throw createError('This phone has not registered', 401, 'Error_Unauthenicated');
  }
}

export const checkUserExist = (user: any) => {
  if (user) {
    throw createError(
      "This phone number is already registered",
      409,
      "Error_Already_Exist"
    );
  }
};

export const checkOtpLimit = (next: NextFunction) => {
  return next(
    createError(
      "OTP is allowed to request 3 times per day",
      429,
      "Error_OverLimit"
    )
  );
};

export const checkOtpErrorIfSameDate = (
  isSameDate: boolean,
  errorCount: number,
) => {
  if (isSameDate && errorCount === MAX_OTP_ERRORS_PER_DAY) {
    throw createError(
      "OTP is wrong for 5 times. Please try again tomorrow.",
      401,
      "Error_Exceeded_Maximum_OTP_Request"
    );
  }
};

export const checkOtpRow = (otpRow: any) => {
  if (!otpRow) {
    throw createError("Phone number is incorrect", 400, "Error");
  }
};

export const generateOtp = (): number => {
  const otp = randomBytes(3).toString("hex");
  return (parseInt(otp, 16) % 900000) + 100000; // Ensure it's a 6-digit number
};

export const generateToken = (): string => {
  return randomBytes(32).toString("hex");
};
