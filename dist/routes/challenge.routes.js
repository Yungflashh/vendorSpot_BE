"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const challenge_controller_1 = require("../controllers/challenge.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All challenge routes require authentication
router.use(auth_1.authenticate);
const createChallengeValidation = [
    (0, express_validator_1.body)('title').notEmpty().withMessage('Title is required'),
    (0, express_validator_1.body)('type').isIn(['buyer', 'seller', 'affiliate']).withMessage('Invalid challenge type'),
    (0, express_validator_1.body)('targetType')
        .isIn(['orders', 'sales', 'clicks', 'conversions'])
        .withMessage('Invalid target type'),
    (0, express_validator_1.body)('targetValue').isInt({ min: 1 }).withMessage('Target value must be positive'),
    (0, express_validator_1.body)('rewardType').isIn(['cash', 'points']).withMessage('Invalid reward type'),
    (0, express_validator_1.body)('rewardValue').isInt({ min: 1 }).withMessage('Reward value must be positive'),
    (0, express_validator_1.body)('startDate').isISO8601().withMessage('Valid start date is required'),
    (0, express_validator_1.body)('endDate').isISO8601().withMessage('Valid end date is required'),
];
// Get active challenges
router.get('/active', (0, error_1.asyncHandler)(challenge_controller_1.challengeController.getActiveChallenges.bind(challenge_controller_1.challengeController)));
// Get user's challenges
router.get('/my-challenges', (0, error_1.asyncHandler)(challenge_controller_1.challengeController.getUserChallenges.bind(challenge_controller_1.challengeController)));
// Join challenge
router.post('/:challengeId/join', (0, error_1.asyncHandler)(challenge_controller_1.challengeController.joinChallenge.bind(challenge_controller_1.challengeController)));
// Claim reward
router.post('/:challengeId/claim', (0, error_1.asyncHandler)(challenge_controller_1.challengeController.claimReward.bind(challenge_controller_1.challengeController)));
// Get challenge leaderboard
router.get('/:challengeId/leaderboard', (0, error_1.asyncHandler)(challenge_controller_1.challengeController.getChallengeLeaderboard.bind(challenge_controller_1.challengeController)));
// Admin routes
router.get('/admin/all', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(challenge_controller_1.challengeController.getAllChallenges.bind(challenge_controller_1.challengeController)));
router.post('/admin/create', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(createChallengeValidation), (0, error_1.asyncHandler)(challenge_controller_1.challengeController.createChallenge.bind(challenge_controller_1.challengeController)));
router.put('/admin/:challengeId', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(challenge_controller_1.challengeController.updateChallenge.bind(challenge_controller_1.challengeController)));
router.delete('/admin/:challengeId', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(challenge_controller_1.challengeController.deleteChallenge.bind(challenge_controller_1.challengeController)));
exports.default = router;
//# sourceMappingURL=challenge.routes.js.map