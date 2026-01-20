import { Router } from 'express';
import { rewardController } from '../controllers/reward.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// All reward routes require authentication
router.use(authenticate);

const redeemPointsValidation = [
  body('points').isInt({ min: 100 }).withMessage('Minimum redemption is 100 points'),
];

// Get user points and tier
router.get(
  '/points',
  asyncHandler(rewardController.getUserPoints.bind(rewardController))
);

// Get points history
router.get(
  '/points/history',
  asyncHandler(rewardController.getPointsHistory.bind(rewardController))
);

// Redeem points for cash
router.post(
  '/points/redeem',
  validate(redeemPointsValidation),
  asyncHandler(rewardController.redeemPoints.bind(rewardController))
);

// Get available rewards
router.get(
  '/available',
  asyncHandler(rewardController.getAvailableRewards.bind(rewardController))
);

// Get leaderboard
router.get(
  '/leaderboard',
  asyncHandler(rewardController.getLeaderboard.bind(rewardController))
);

export default router;
