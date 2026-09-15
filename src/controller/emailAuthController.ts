import { withValidation } from "../utils";
import { registerEmailHandler, verifyEmailOtpHandler, confirmEmailPasswordHandler, loginEmailHandler } from "../ControllerHandler/emailAuthHandlers";
import { registerEmailValidation, verifyEmailOtpValidation, confirmEmailPasswordValidation, loginEmailValidation } from "../validation/emailAuthValidation";

export const registerEmail = withValidation(registerEmailValidation, registerEmailHandler);
export const verifyEmailOtp = withValidation(verifyEmailOtpValidation, verifyEmailOtpHandler);
export const confirmEmailPassword = withValidation(confirmEmailPasswordValidation, confirmEmailPasswordHandler);
export const loginEmail = withValidation(loginEmailValidation, loginEmailHandler);
