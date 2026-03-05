import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class AuthController {
    /**
     * Register new user
     */
    register(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Verify email with OTP
     */
    verifyEmail(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Resend OTP
     */
    resendOTP(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Login with daily login bonus
     */
    login(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Award daily login points with streak tracking and transaction logging
     */
    private awardDailyLoginPoints;
    /**
     * Forgot password
     */
    forgotPassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Reset password
     */
    resetPassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Refresh token
     */
    refreshToken(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get current user
     */
    getMe(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update profile
     */
    updateProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Change password
     */
    changePassword(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const authController: AuthController;
//# sourceMappingURL=auth.controller.d.ts.map