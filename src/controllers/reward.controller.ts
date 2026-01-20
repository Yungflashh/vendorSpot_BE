import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import User from '../models/User';
import Order from '../models/Order';
import { Wallet } from '../models/Additional';
import { AppError } from '../middleware/error';
import { logger } from '../utils/logger';

export class RewardController {
  /**
   * Get user points and rewards
   */
  async getUserPoints(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Calculate tier based on points
    let tier = 'Bronze';
    if (user.points >= 10000) {
      tier = 'Diamond';
    } else if (user.points >= 5000) {
      tier = 'Platinum';
    } else if (user.points >= 2000) {
      tier = 'Gold';
    } else if (user.points >= 500) {
      tier = 'Silver';
    }

    // Calculate next tier requirements
    const tierThresholds = {
      Bronze: { min: 0, next: 500 },
      Silver: { min: 500, next: 2000 },
      Gold: { min: 2000, next: 5000 },
      Platinum: { min: 5000, next: 10000 },
      Diamond: { min: 10000, next: null },
    };

    const currentTier = tierThresholds[tier as keyof typeof tierThresholds];
    const pointsToNext = currentTier.next ? currentTier.next - user.points : 0;

    res.json({
      success: true,
      data: {
        points: user.points || 0,
        tier,
        pointsToNextTier: pointsToNext,
        badges: user.badges || [],
        achievements: user.achievements || [],
      },
    });
  }

  /**
   * Award points to user
   */
  async awardPoints(userId: string, points: number, reason: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    user.points = (user.points || 0) + points;
    await user.save();

    logger.info(`Points awarded: ${points} to user ${userId} - ${reason}`);
  }

  /**
   * Redeem points for cash
   */
  async redeemPoints(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { points } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if ((user.points || 0) < points) {
      throw new AppError('Insufficient points', 400);
    }

    if (points < 100) {
      throw new AppError('Minimum redemption is 100 points', 400);
    }

    // Conversion rate: 100 points = ₦100
    const cashValue = points;

    // Deduct points
    user.points = (user.points || 0) - points;
    await user.save();

    // Add to wallet
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id });
    }

    wallet.balance += cashValue;
    wallet.totalEarned += cashValue;
    wallet.transactions.push({
      type: 'credit',
      amount: cashValue,
      purpose: 'reward',
      reference: `POINTS-REDEEM-${Date.now()}`,
      description: `Redeemed ${points} points`,
      status: 'completed',
      timestamp: new Date(),
    } as any);

    await wallet.save();

    logger.info(`Points redeemed: ${points} by user ${req.user?.id}`);

    res.json({
      success: true,
      message: 'Points redeemed successfully',
      data: {
        pointsRedeemed: points,
        cashValue,
        remainingPoints: user.points,
        newBalance: wallet.balance,
      },
    });
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId: string, badge: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    if (!user.badges) {
      user.badges = [];
    }

    if (!user.badges.includes(badge)) {
      user.badges.push(badge);
      await user.save();

      logger.info(`Badge awarded: ${badge} to user ${userId}`);
    }
  }

  /**
   * Get points history
   */
  async getPointsHistory(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    // This would ideally come from a PointsTransaction model
    // For now, we'll return recent activities that award points

    const recentOrders = await Order.find({
      user: req.user?.id,
      paymentStatus: 'completed',
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('orderNumber total createdAt');

    const history = recentOrders.map((order) => {
      const pointsEarned = Math.floor(order.total / 100); // 1 point per ₦100 spent
      return {
        date: (order as any).createdAt,
        type: 'purchase',
        description: `Order ${order.orderNumber}`,
        points: pointsEarned,
      };
    });

    res.json({
      success: true,
      data: { history },
    });
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { period = 'all-time', type = 'points' } = req.query;

    let users;

    if (type === 'points') {
      users = await User.find({ points: { $gt: 0 } })
        .select('firstName lastName points badges')
        .sort({ points: -1 })
        .limit(50);

      const leaderboard = users.map((user, index) => ({
        rank: index + 1,
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          badges: user.badges || [],
        },
        score: user.points || 0,
      }));

      res.json({
        success: true,
        data: {
          type: 'points',
          period,
          leaderboard,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          type,
          period,
          leaderboard: [],
        },
      });
    }
  }

  /**
   * Get available rewards
   */
  async getAvailableRewards(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Define available rewards
    const rewards = [
      {
        id: 'cash-100',
        name: '₦100 Cash',
        description: 'Redeem 100 points for ₦100',
        pointsCost: 100,
        available: (user.points || 0) >= 100,
      },
      {
        id: 'cash-500',
        name: '₦500 Cash',
        description: 'Redeem 500 points for ₦500',
        pointsCost: 500,
        available: (user.points || 0) >= 500,
      },
      {
        id: 'cash-1000',
        name: '₦1,000 Cash',
        description: 'Redeem 1,000 points for ₦1,000',
        pointsCost: 1000,
        available: (user.points || 0) >= 1000,
      },
      {
        id: 'cash-5000',
        name: '₦5,000 Cash',
        description: 'Redeem 5,000 points for ₦5,000',
        pointsCost: 5000,
        available: (user.points || 0) >= 5000,
      },
    ];

    res.json({
      success: true,
      data: {
        userPoints: user.points || 0,
        rewards,
      },
    });
  }

  /**
   * Check and award automatic badges
   */
  async checkBadges(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    const badges = user.badges || [];

    // First Purchase Badge
    const firstOrder = await Order.countDocuments({
      user: userId,
      paymentStatus: 'completed',
    });
    if (firstOrder >= 1 && !badges.includes('first-purchase')) {
      await this.awardBadge(userId, 'first-purchase');
    }

    // Loyal Customer (10 orders)
    if (firstOrder >= 10 && !badges.includes('loyal-customer')) {
      await this.awardBadge(userId, 'loyal-customer');
    }

    // VIP Customer (50 orders)
    if (firstOrder >= 50 && !badges.includes('vip-customer')) {
      await this.awardBadge(userId, 'vip-customer');
    }

    // High Spender (total spending > ₦100,000)
    const orders = await Order.find({
      user: userId,
      paymentStatus: 'completed',
    });
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

    if (totalSpent >= 100000 && !badges.includes('high-spender')) {
      await this.awardBadge(userId, 'high-spender');
    }

    // Review Master (10+ reviews)
    // This would check Review model - simplified for now
  }

  /**
   * Award points after order completion
   */
  async awardOrderPoints(orderId: string): Promise<void> {
    const order = await Order.findById(orderId);
    if (!order || order.paymentStatus !== 'completed') {
      return;
    }

    // Award 1 point per ₦100 spent
    const points = Math.floor(order.total / 100);

    if (points > 0) {
      await this.awardPoints(order.user.toString(), points, `Order ${order.orderNumber}`);
    }

    // Check for badge awards
    await this.checkBadges(order.user.toString());
  }
}

export const rewardController = new RewardController();
