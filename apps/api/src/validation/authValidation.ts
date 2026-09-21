import { body } from "express-validator";
import { OTP_LENGTH } from "../utils";


export const loginValidation = [
    body("password", "Invalid password")
        .trim().notEmpty().matches('^[0-9]+$')
        .withMessage("Password is required")
        .isLength({ min: 8 , max: 8 }),
    body('phone', 'Invalid phone number').trim().notEmpty().withMessage('Phone number is required').matches("^[0-9]+$").isLength({ min: 5, max: 12 }).withMessage('Phone number must be between 5 and 12 digits'),
]

export const confirmPasswordValidation = [
    body("password", "Invalid password")
        .trim().notEmpty().matches('^[0-9]+$')
        .withMessage("Password is required")
        .isLength({ min: 8 , max: 8 }).withMessage("Password must be 8 digits"),
    body('phone', 'Invalid phone number').trim().notEmpty().withMessage('Phone number is required').matches("^[0-9]+$").isLength({ min: 5, max: 12 }).withMessage('Phone number must be between 5 and 12 digits'),
    body("token", "Invalid token").trim().notEmpty().escape()
]

export const validatePhone = [
    body("phone", "Invalid phone number")
        .trim()
        .notEmpty()
        .withMessage("Phone number is required")
        .matches("^[0-9]+$")
        .isLength({ min: 5, max: 12 })
        .withMessage("Phone number must be between 5 and 12 digits"),
];

export const validateOtp = [
    body("otp", "Invalid otp")
        .trim()
        .notEmpty()
        .withMessage("Otp is required")
        .matches("^[0-9]+$")
        .isLength({ min: OTP_LENGTH, max: OTP_LENGTH })
        .withMessage(`Otp must be ${OTP_LENGTH} digits`),
    body("token", "Invalid token").trim().notEmpty().escape(),
];
