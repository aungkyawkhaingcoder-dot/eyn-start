import express from 'express';
import { registerUser, verifyOtp, confirmPassword, login } from '../../controller/authController';

const router = express.Router();

router.post('/register', registerUser)
router.post('/verify-otp', verifyOtp)
router.post('/confirm-password', confirmPassword)
router.post('/login', login)

export default router
