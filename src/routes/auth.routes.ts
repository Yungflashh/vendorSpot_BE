import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { oauthController } from '../controllers/oauthController';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// Validation rules
const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const googleLoginValidation = [
  body('idToken').notEmpty().withMessage('Google ID token is required'),
  body('role').optional().isIn(['customer', 'vendor', 'affiliate']).withMessage('Invalid role'),
];

const appleLoginValidation = [
  body('identityToken').notEmpty().withMessage('Apple identity token is required'),
  body('role').optional().isIn(['customer', 'vendor', 'affiliate']).withMessage('Invalid role'),
];

// Standard auth routes
router.post('/register', validate(registerValidation), asyncHandler(authController.register.bind(authController)));
router.post('/verify-email', asyncHandler(authController.verifyEmail.bind(authController)));
router.post('/resend-otp', asyncHandler(authController.resendOTP.bind(authController)));
router.post('/login', validate(loginValidation), asyncHandler(authController.login.bind(authController)));
router.post('/forgot-password', asyncHandler(authController.forgotPassword.bind(authController)));
router.post('/reset-password', asyncHandler(authController.resetPassword.bind(authController)));
router.post('/refresh-token', asyncHandler(authController.refreshToken.bind(authController)));

// OAuth routes
router.post('/oauth/google', validate(googleLoginValidation), asyncHandler(oauthController.googleLogin.bind(oauthController)));
router.post('/oauth/apple', validate(appleLoginValidation), asyncHandler(oauthController.appleLogin.bind(oauthController)));

// Protected routes
router.get('/me', authenticate, asyncHandler(authController.getMe.bind(authController)));
router.put('/profile', authenticate, asyncHandler(authController.updateProfile.bind(authController)));
router.put('/change-password', authenticate, asyncHandler(authController.changePassword.bind(authController)));

export default router;