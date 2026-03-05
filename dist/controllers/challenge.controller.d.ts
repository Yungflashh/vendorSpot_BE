import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class ChallengeController {
    /**
     * Create challenge (Admin only)
     */
    createChallenge(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get active challenges
     */
    getActiveChallenges(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get user's challenge progress
     */
    getUserChallenges(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Join challenge
     */
    joinChallenge(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update challenge progress (called internally or by cron)
     */
    updateChallengeProgress(userId: string, challengeType: string, progressValue: number): Promise<void>;
    /**
     * Claim reward
     */
    claimReward(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get challenge leaderboard
     */
    getChallengeLeaderboard(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get all challenges (Admin only)
     */
    getAllChallenges(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update challenge (Admin only)
     */
    updateChallenge(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Delete challenge (Admin only)
     */
    deleteChallenge(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const challengeController: ChallengeController;
//# sourceMappingURL=challenge.controller.d.ts.map