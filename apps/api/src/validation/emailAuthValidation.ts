import { body } from "express-validator";
import { OTP_LENGTH } from "../utils";

const emailField = () => body("email").isString().bail().trim()
  .isLength({ max: 70 }).isEmail().withMessage("Invalid email address")
  .bail().customSanitizer((value: string) => value.toLowerCase());
// Keep the same 8-digit password rule as phone login.
const passwordField = () => body("password").isString().bail().trim()
  .matches(/^[0-9]{8}$/).withMessage("Password must be 8 digits");
const tokenField = () => body("token").isString().bail()
  .matches(/^[a-f0-9]{64}$/).withMessage("Invalid token");

export const registerEmailValidation = [emailField()];
export const verifyEmailOtpValidation = [emailField(), tokenField(),
  body("otp").isString().bail().trim().matches(new RegExp(`^[0-9]{${OTP_LENGTH}}$`)).withMessage("Invalid OTP")];
export const confirmEmailPasswordValidation = [emailField(), tokenField(), passwordField()];
export const loginEmailValidation = [emailField(), passwordField()];
