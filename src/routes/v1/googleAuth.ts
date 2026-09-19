import { Router } from "express";
import { googleChallenge, googleLogin } from "../../controller/googleAuthController";
const router = Router();
router.post("/challenge", googleChallenge);
router.post("/login", googleLogin);
export default router;
