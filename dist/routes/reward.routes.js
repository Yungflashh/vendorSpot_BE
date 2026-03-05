"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reward_controller_1 = require("../controllers/reward.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All reward routes require authentication
router.use(auth_1.authenticate);
const redeemPointsValidation = [
    (0, express_validator_1.body)('points').isInt({ min: 100 }).withMessage('Minimum redemption is 100 points'),
];
// Get user points and tier
router.get('/points', (0, error_1.asyncHandler)(reward_controller_1.rewardController.getUserPoints.bind(reward_controller_1.rewardController)));
// Get points history
router.get('/points/history', (0, error_1.asyncHandler)(reward_controller_1.rewardController.getPointsHistory.bind(reward_controller_1.rewardController)));
// Redeem points for cash
router.post('/points/redeem', (0, validation_1.validate)(redeemPointsValidation), (0, error_1.asyncHandler)(reward_controller_1.rewardController.redeemPoints.bind(reward_controller_1.rewardController)));
// Get available rewards
router.get('/available', (0, error_1.asyncHandler)(reward_controller_1.rewardController.getAvailableRewards.bind(reward_controller_1.rewardController)));
// Get leaderboard
router.get('/leaderboard', (0, error_1.asyncHandler)(reward_controller_1.rewardController.getLeaderboard.bind(reward_controller_1.rewardController)));
exports.default = router;
//# sourceMappingURL=reward.routes.js.map