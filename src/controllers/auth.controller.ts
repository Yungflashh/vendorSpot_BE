import { Response } from 'express';
import { AuthRequest, ApiResponse, UserRole, UserStatus } from '../types';
import User from '../models/User';
import { Wallet } from '../models/Additional';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { generateOTP, generateAffiliateCode } from '../utils/helpers';
import { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail, sendFounderWelcomeEmail, sendProductPostingGuideEmail } from '../utils/email';
import { AppError } from '../middleware/error';
import crypto from 'crypto';
import { queueEmailsInBackground } from '../utils/email-queue';

export class AuthController {
  /**
   * Register new user
   */
  async register(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { firstName, lastName, email, phone, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Generate OTP
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || UserRole.CUSTOMER,
      otp: {
        code: otpCode,
        expiresAt: otpExpiry,
      },
    });

    // Create wallet for user
    await Wallet.create({ user: user._id });

    // Generate affiliate code if applicable
    if (role === UserRole.AFFILIATE || user.isAffiliate) {
      user.affiliateCode = generateAffiliateCode(email);
      await user.save();
    }

    // Send OTP email

    console.log(otpCode)
    await sendOTPEmail(email, otpCode);

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
 
async verifyEmail(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.emailVerified) {
    throw new AppError('Email already verified', 400);
  }

  if (!user.otp || user.otp.code !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  if (user.otp.expiresAt && user.otp.expiresAt < new Date()) {
    throw new AppError('OTP expired', 400);
  }

  // Update user
  user.emailVerified = true;
  user.status = UserStatus.ACTIVE;
  user.otp = undefined;
  await user.save();

  // Queue welcome emails in background with 10 second delays
  queueEmailsInBackground ([
    () => sendWelcomeEmail(user.email, user.firstName),
    () => sendFounderWelcomeEmail(user.email),
    () => sendProductPostingGuideEmail(user.email),
  ], 10000); // 10 seconds between each email

  // Generate tokens
  const tokens = generateTokens(user._id, user.email, user.role);

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
  async resendOTP(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    // Generate new OTP
    const otpCode = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = {
      code: otpCode,
      expiresAt: otpExpiry,
    };
    await user.save();

    // Send OTP email
    await sendOTPEmail(email, otpCode);

    res.json({
      success: true,
      message: 'OTP sent successfully',
    });
  }

 // controllers/auth.controller.ts - ADD THIS METHOD TO YOUR AuthController CLASS

/**
 * Login with daily login bonus
 */
async login(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
  const { email, password } = req.body;

  // Find user with password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new AppError('Please verify your email first', 403);
  }

  // Check if account is active
  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError('Account is not active', 403);
  }

  // ✅ AWARD DAILY LOGIN POINTS
  await this.awardDailyLoginPoints(user);

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const tokens = generateTokens(user._id, user.email, user.role);

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
private async awardDailyLoginPoints(user: any): Promise<void> {
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
  } else if (!lastLogin || lastLogin.getTime() < yesterday.getTime()) {
    // Streak broken - reset to 1
    newStreak = 1;
  }

  // Award streak bonuses
  if (newStreak === 7) {
    streakBonus = 20;
    pointsAwarded += streakBonus;
  } else if (newStreak === 14) {
    streakBonus = 50;
    pointsAwarded += streakBonus;
  } else if (newStreak === 30) {
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
  const PointsTransaction = (await import('../models/PointsTransaction')).default;
  
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
  async forgotPassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      res.json({
        success: true,
        message: 'If email exists, password reset link has been sent',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'Password reset link sent to email',
    });
  }

  /**
   * Reset password
   */
  async resetPassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
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
  async refreshToken(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate new tokens
    const tokens = generateTokens(user._id, user.email, user.role);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  }

  /**
   * Get current user
   */
  async getMe(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const user = await User.findById(req.user?.id);

    if (!user) {
      throw new AppError('User not found', 404);
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
  async updateProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { firstName, lastName, phone, avatar } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

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
  async changePassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?.id).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  }
}

export const authController = new AuthController();
