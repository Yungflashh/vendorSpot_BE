import { Router } from 'express';
import { challengeController } from '../controllers/challenge.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// All challenge routes require authentication
router.use(authenticate);

const createChallengeValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('type').isIn(['buyer', 'seller', 'affiliate']).withMessage('Invalid challenge type'),
  body('targetType')
    .isIn(['orders', 'sales', 'clicks', 'conversions'])
    .withMessage('Invalid target type'),
  body('targetValue').isInt({ min: 1 }).withMessage('Target value must be positive'),
  body('rewardType').isIn(['cash', 'points']).withMessage('Invalid reward type'),
  body('rewardValue').isInt({ min: 1 }).withMessage('Reward value must be positive'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
];

// Get active challenges
router.get(
  '/active',
  asyncHandler(challengeController.getActiveChallenges.bind(challengeController))
);

// Get user's challenges
router.get(
  '/my-challenges',
  asyncHandler(challengeController.getUserChallenges.bind(challengeController))
);

// Join challenge
router.post(
  '/:challengeId/join',
  asyncHandler(challengeController.joinChallenge.bind(challengeController))
);

// Claim reward
router.post(
  '/:challengeId/claim',
  asyncHandler(challengeController.claimReward.bind(challengeController))
);

// Get challenge leaderboard
router.get(
  '/:challengeId/leaderboard',
  asyncHandler(challengeController.getChallengeLeaderboard.bind(challengeController))
);

// Admin routes
router.get(
  '/admin/all',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(challengeController.getAllChallenges.bind(challengeController))
);

router.post(
  '/admin/create',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(createChallengeValidation),
  asyncHandler(challengeController.createChallenge.bind(challengeController))
);

router.put(
  '/admin/:challengeId',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(challengeController.updateChallenge.bind(challengeController))
);

router.delete(
  '/admin/:challengeId',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(challengeController.deleteChallenge.bind(challengeController))
);

export default router;
