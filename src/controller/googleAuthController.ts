import { body } from "express-validator";
import { withValidation } from "../utils";
import { googleChallengeHandler, googleLoginHandler } from "../ControllerHandler/googleAuthHandlers";

export const googleChallenge = googleChallengeHandler;
export const googleLogin = withValidation([
  body("idToken").isString().bail().isLength({ min: 20, max: 16384 }),
  body("challengeId").isString().bail().matches(/^[a-f0-9]{64}$/),
], googleLoginHandler);
