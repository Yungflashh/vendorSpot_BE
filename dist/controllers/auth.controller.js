"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const types_1 = require("../types");
const User_1 = __importDefault(require("../models/User"));
const Additional_1 = require("../models/Additional");
const jwt_1 = require("../utils/jwt");
const helpers_1 = require("../utils/helpers");
const email_1 = require("../utils/email");
const error_1 = require("../middleware/error");
const crypto_1 = __importDefault(require("crypto"));
const email_queue_1 = require("../utils/email-queue");
class AuthController {
    /**
     * Register new user
     */
    async register(req, res) {
        const { firstName, lastName, email, phone, password, role } = req.body;
        // Check if user exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            throw new error_1.AppError('Email already registered', 400);
        }
        // Generate OTP
        const otpCode = (0, helpers_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Create user
        const user = await User_1.default.create({
            firstName,
            lastName,
            email,
            phone,
            password,
            role: role || types_1.UserRole.CUSTOMER,
            otp: {
                code: otpCode,
                expiresAt: otpExpiry,
            },
        });
        // Create wallet for user
        await Additional_1.Wallet.create({ user: user._id });
        // Generate affiliate code if applicable
        if (role === types_1.UserRole.AFFILIATE || user.isAffiliate) {
            user.affiliateCode = (0, helpers_1.generateAffiliateCode)(email);
            await user.save();
        }
        // Send OTP email
        console.log(otpCode);
        await (0, email_1.sendOTPEmail)(email, otpCode);
        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your email.',
            data: {
                userId: user._id,
                email: user.email,
            },
        });
    }
    /**
     * Verify email with OTP
     */
    async verifyEmail(req, res) {
        const { email, otp } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        if (user.emailVerified) {
            throw new error_1.AppError('Email already verified', 400);
        }
        if (!user.otp || user.otp.code !== otp) {
            throw new error_1.AppError('Invalid OTP', 400);
        }
        if (user.otp.expiresAt && user.otp.expiresAt < new Date()) {
            throw new error_1.AppError('OTP expired', 400);
        }
        // Update user
        user.emailVerified = true;
        user.status = types_1.UserStatus.ACTIVE;
        user.otp = undefined;
        await user.save();
        // Queue welcome emails in background with 10 second delays
        (0, email_queue_1.queueEmailsInBackground)([
            () => (0, email_1.sendWelcomeEmail)(user.email, user.firstName),
            () => (0, email_1.sendFounderWelcomeEmail)(user.email),
            () => (0, email_1.sendProductPostingGuideEmail)(user.email),
        ], 10000); // 10 seconds between each email
        // Generate tokens
        const tokens = (0, jwt_1.generateTokens)(user._id, user.email, user.role);
        res.json({
            success: true,
            message: 'Email verified successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                },
                ...tokens,
            },
        });
    }
    /**
     * Resend OTP
     */
    async resendOTP(req, res) {
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        if (user.emailVerified) {
            throw new error_1.AppError('Email already verified', 400);
        }
        // Generate new OTP
        const otpCode = (0, helpers_1.generateOTP)();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        user.otp = {
            code: otpCode,
            expiresAt: otpExpiry,
        };
        await user.save();
        // Send OTP email
        await (0, email_1.sendOTPEmail)(email, otpCode);
        res.json({
            success: true,
            message: 'OTP sent successfully',
        });
    }
    // controllers/auth.controller.ts - ADD THIS METHOD TO YOUR AuthController CLASS
    /**
     * Login with daily login bonus
     */
    async login(req, res) {
        const { email, password } = req.body;
        // Find user with password
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user) {
            throw new error_1.AppError('Invalid credentials', 401);
        }
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new error_1.AppError('Invalid credentials', 401);
        }
        // Check if email is verified
        if (!user.emailVerified) {
            throw new error_1.AppError('Please verify your email first', 403);
        }
        // Check if account is active
        if (user.status !== types_1.UserStatus.ACTIVE) {
            throw new error_1.AppError('Account is not active', 403);
        }
        // ✅ AWARD DAILY LOGIN POINTS
        await this.awardDailyLoginPoints(user);
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        // Generate tokens
        const tokens = (0, jwt_1.generateTokens)(user._id, user.email, user.role);
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    avatar: user.avatar,
                },
                ...tokens,
            },
        });
    }
    // controllers/auth.controller.ts - UPDATE THE LOGIN POINTS METHOD
    /**
     * Award daily login points with streak tracking and transaction logging
     */
    async awardDailyLoginPoints(user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
        if (lastLogin) {
            lastLogin.setHours(0, 0, 0, 0);
        }
        // Check if user already logged in today
        if (lastLogin && lastLogin.getTime() === today.getTime()) {
            // Already logged in today, no points
            return;
        }
        // Initialize login streak tracking if it doesn't exist
        if (!user.loginStreak) {
            user.loginStreak = {
                currentStreak: 0,
                lastLoginDate: null,
            };
        }
        // Check if login is consecutive (yesterday)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        let pointsAwarded = 1; // Base daily login point
        let streakBonus = 0;
        let newStreak = 1;
        if (lastLogin && lastLogin.getTime() === yesterday.getTime()) {
            // Consecutive day - increase streak
            newStreak = (user.loginStreak.currentStreak || 0) + 1;
        }
        else if (!lastLogin || lastLogin.getTime() < yesterday.getTime()) {
            // Streak broken - reset to 1
            newStreak = 1;
        }
        // Award streak bonuses
        if (newStreak === 7) {
            streakBonus = 20;
            pointsAwarded += streakBonus;
        }
        else if (newStreak === 14) {
            streakBonus = 50;
            pointsAwarded += streakBonus;
        }
        else if (newStreak === 30) {
            streakBonus = 120;
            pointsAwarded += streakBonus;
        }
        // Update user points and streak
        user.points = (user.points || 0) + pointsAwarded;
        user.loginStreak = {
            currentStreak: newStreak,
            lastLoginDate: today,
        };
        await user.save();
        // ✅ CREATE TRANSACTION RECORD
        const PointsTransaction = (await Promise.resolve().then(() => __importStar(require('../models/PointsTransaction')))).default;
        let description = `Daily login`;
        if (streakBonus > 0) {
            description = `Daily login + ${newStreak}-day streak bonus`;
        }
        await PointsTransaction.create({
            user: user._id,
            type: 'earn',
            activity: 'login',
            points: pointsAwarded,
            description,
            metadata: {
                streakDay: newStreak,
                basePoints: 1,
                bonusPoints: streakBonus,
            },
        });
        // Log the points award
        console.log(`✅ Daily login points awarded: ${pointsAwarded} to user ${user.email} (Streak: ${newStreak})`);
        if (streakBonus > 0) {
            console.log(`🎉 Streak bonus: ${streakBonus} points for ${newStreak}-day streak!`);
        }
    }
    /**
     * Forgot password
     */
    async forgotPassword(req, res) {
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            // Don't reveal if email exists
            res.json({
                success: true,
                message: 'If email exists, password reset link has been sent',
            });
            return;
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const hashedToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();
        // Send reset email
        await (0, email_1.sendPasswordResetEmail)(email, resetToken);
        res.json({
            success: true,
            message: 'Password reset link sent to email',
        });
    }
    /**
     * Reset password
     */
    async resetPassword(req, res) {
        const { token, password } = req.body;
        const hashedToken = crypto_1.default.createHash('sha256').update(token).digest('hex');
        const user = await User_1.default.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            throw new error_1.AppError('Invalid or expired reset token', 400);
        }
        // Update password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({
            success: true,
            message: 'Password reset successful',
        });
    }
    /**
     * Refresh token
     */
    async refreshToken(req, res) {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new error_1.AppError('Refresh token required', 400);
        }
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        const user = await User_1.default.findById(decoded.id);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        // Generate new tokens
        const tokens = (0, jwt_1.generateTokens)(user._id, user.email, user.role);
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: tokens,
        });
    }
    /**
     * Get current user
     */
    async getMe(req, res) {
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    status: user.status,
                    avatar: user.avatar,
                    addresses: user.addresses,
                    emailVerified: user.emailVerified,
                    phoneVerified: user.phoneVerified,
                    isAffiliate: user.isAffiliate,
                    affiliateCode: user.affiliateCode,
                },
            },
        });
    }
    /**
     * Update profile
     */
    async updateProfile(req, res) {
        const { firstName, lastName, phone, avatar } = req.body;
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (phone)
            user.phone = phone;
        if (avatar)
            user.avatar = avatar;
        await user.save();
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user },
        });
    }
    /**
     * Change password
     */
    async changePassword(req, res) {
        const { currentPassword, newPassword } = req.body;
        const user = await User_1.default.findById(req.user?.id).select('+password');
        if (!user) {
            throw new error_1.AppError('User not found', 404);
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new error_1.AppError('Current password is incorrect', 400);
        }
        user.password = newPassword;
        await user.save();
        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map