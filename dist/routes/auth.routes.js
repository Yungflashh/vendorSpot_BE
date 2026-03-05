"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
const registerValidation = [
    (0, express_validator_1.body)('firstName').trim().notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('lastName').trim().notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
];
router.post('/register', (0, validation_1.validate)(registerValidation), (0, error_1.asyncHandler)(auth_controller_1.authController.register.bind(auth_controller_1.authController)));
router.post('/verify-email', (0, error_1.asyncHandler)(auth_controller_1.authController.verifyEmail.bind(auth_controller_1.authController)));
router.post('/resend-otp', (0, error_1.asyncHandler)(auth_controller_1.authController.resendOTP.bind(auth_controller_1.authController)));
router.post('/login', (0, validation_1.validate)(loginValidation), (0, error_1.asyncHandler)(auth_controller_1.authController.login.bind(auth_controller_1.authController)));
router.post('/forgot-password', (0, error_1.asyncHandler)(auth_controller_1.authController.forgotPassword.bind(auth_controller_1.authController)));
router.post('/reset-password', (0, error_1.asyncHandler)(auth_controller_1.authController.resetPassword.bind(auth_controller_1.authController)));
router.post('/refresh-token', (0, error_1.asyncHandler)(auth_controller_1.authController.refreshToken.bind(auth_controller_1.authController)));
router.get('/me', auth_1.authenticate, (0, error_1.asyncHandler)(auth_controller_1.authController.getMe.bind(auth_controller_1.authController)));
router.put('/profile', auth_1.authenticate, (0, error_1.asyncHandler)(auth_controller_1.authController.updateProfile.bind(auth_controller_1.authController)));
router.put('/change-password', auth_1.authenticate, (0, error_1.asyncHandler)(auth_controller_1.authController.changePassword.bind(auth_controller_1.authController)));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map