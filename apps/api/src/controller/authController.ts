
import { confirmPasswordValidation, loginValidation, validateOtp, validatePhone } from "../validation/authValidation";
import {
  confirmPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  registerUserHandler,
  verifyOtpHandler,
} from "../ControllerHandler/authHandlers";
import { withValidation } from "../utils";


export const registerUser = withValidation(validatePhone, registerUserHandler);

export const verifyOtp = withValidation(
  [...validatePhone, ...validateOtp],
  verifyOtpHandler
);

export const confirmPassword = withValidation(confirmPasswordValidation, confirmPasswordHandler);

export const login = withValidation(loginValidation, loginHandler);

export const logout = logoutHandler;

export const refreshToken = refreshTokenHandler;
