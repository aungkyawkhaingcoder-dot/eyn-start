import { Router } from "express";
import { logout } from "../../controller/authController";
import { registerEmail, verifyEmailOtp, confirmEmailPassword, loginEmail } from "../../controller/emailAuthController";

const router = Router();
router.post("/register", registerEmail);
// Reuse the same cooldown, daily quota and single-use proof invalidation.
router.post("/resend-otp", registerEmail);
router.post("/verify-otp", verifyEmailOtp);
router.post("/confirm-password", confirmEmailPassword);
router.post("/login", loginEmail);
// Both login methods share the same DB session revocation and cookie cleanup.
router.post("/logout", logout);
export default router;
