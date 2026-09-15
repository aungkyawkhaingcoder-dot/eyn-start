import emailAuthRouter from "./emailAuth";
import express from 'express';
import { registerUser, verifyOtp, confirmPassword, login, logout, refreshToken } from '../../controller/authController';

const router = express.Router();

router.use("/email", emailAuthRouter);

router.post('/register', registerUser)
router.post('/verify-otp', verifyOtp)
router.post('/confirm-password', confirmPassword)
router.post('/login', login)
router.post('/logout', logout);

// Refresh Token Route for mobile
router.post('/refresh-token', refreshToken);
// Compatibility for existing mobile clients; migrate callers to POST.
router.get('/refresh-token', refreshToken);
export default router
