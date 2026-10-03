import { query} from "express-validator";

export const languageField = [query("lng").isIn(["en", "mm", "fr"]).withMessage("Invalid language code").trim().notEmpty().withMessage("Language code is required").matches(/^[a-z]{2}$/).withMessage("Language code must be 2 characters")];