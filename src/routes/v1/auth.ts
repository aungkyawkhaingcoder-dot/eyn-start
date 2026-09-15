import emailAuthRouter from "./emailAuth";
import express from 'express';
import { registerUser, verifyOtp, confirmPassword, login, logout, refreshToken } from '../../controller/authController';

const router = express.Router();

router.use("/email", emailAuthRouter);

router.post('/register', registerUser)
// Reuse registration validation, OTP replacement and daily limits.
router.post('/resend-otp', registerUser);
router.post('/verify-otp', verifyOtp)
router.post('/confirm-password', confirmPassword)
router.post('/login', login)
router.post('/logout', logout);

// Refresh Token Route for mobile
router.post('/refresh-token', refreshToken);
// Compatibility for existing mobile clients; migrate callers to POST.

export default router
