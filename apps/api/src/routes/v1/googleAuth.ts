import { Router } from "express";
import { googleChallenge, googleLogin, googleRedirectStart, googleRedirectCallback } from "../../controller/googleAuthController";
const router = Router();
router.post("/challenge", googleChallenge);
router.post("/login", googleLogin);
router.post("/redirect/start", googleRedirectStart);
router.get("/redirect/callback", googleRedirectCallback);
export default router;
