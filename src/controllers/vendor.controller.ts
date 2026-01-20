import { Response } from 'express';
import { AuthRequest, ApiResponse, VendorVerificationStatus, UserRole } from '../types';
import VendorProfile from '../models/VendorProfile';
import Product from '../models/Product';
import Order from '../models/Order';
import User from '../models/User';
import { AppError } from '../middleware/error';
import { logger } from '../utils/logger';

export class VendorController {
  /**
   * Get top vendors (Public - for home screen)
   */
  async getTopVendors(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'rating'; // rating, sales, products

    let sortCriteria: any = {};
    
    switch (sortBy) {
      case 'sales':
        sortCriteria = { totalSales: -1 };
        break;
      case 'products':
        sortCriteria = { productCount: -1 };
        break;
      case 'rating':
      default:
        sortCriteria = { averageRating: -1, totalReviews: -1 };
    }

    // Get top vendors - only verified and active
    const vendors = await VendorProfile.find({
      isActive: true,
      verificationStatus: VendorVerificationStatus.VERIFIED,
    })
      .populate('user', 'firstName lastName')
      .sort(sortCriteria)
      .limit(limit)
      .select(
        'user businessName businessDescription businessLogo averageRating totalReviews totalSales'
      );

    // For each vendor, get their product count
    const vendorsWithDetails = await Promise.all(
      vendors.map(async (vendor) => {
        const productCount = await Product.countDocuments({
          vendor: vendor.user._id,
          status: 'active',
        });

        return {
          id: vendor.user._id,
          name: vendor.businessName,
          description: vendor.businessDescription,
          image: vendor.businessLogo || '',
          rating: vendor.averageRating || 0,
          reviews: vendor.totalReviews || 0,
          totalSales: vendor.totalSales || 0,
          productCount,
          verified: vendor.verificationStatus === VendorVerificationStatus.VERIFIED,
        };
      })
    );

    res.json({
      success: true,
      message: 'Top vendors fetched successfully',
      data: {
        vendors: vendorsWithDetails,
        total: vendorsWithDetails.length,
      },
    });
  }

  /**
   * Create vendor profile
   */
  async createVendorProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const {
      businessName,
      businessDescription,
      businessAddress,
      businessPhone,
      businessEmail,
      businessWebsite,
    } = req.body;

    // Check if profile already exists
    const existingProfile = await VendorProfile.findOne({ user: req.user?.id });
    if (existingProfile) {
      throw new AppError('Vendor profile already exists', 400);
    }

    // Create vendor profile
    const vendorProfile = await VendorProfile.create({
      user: req.user?.id,
      businessName,
      businessDescription,
      businessAddress,
      businessPhone,
      businessEmail,
      businessWebsite,
    });

    // Update user role to vendor
    await User.findByIdAndUpdate(req.user?.id, {
      role: UserRole.VENDOR,
    });

    logger.info(`Vendor profile created: ${req.user?.id}`);

    res.status(201).json({
      success: true,
      message: 'Vendor profile created successfully',
      data: { vendorProfile },
    });
  }

  /**
   * Get vendor profile
   */
  async getVendorProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const vendorProfile = await VendorProfile.findOne({ user: req.user?.id }).populate(
      'user',
      'firstName lastName email'
    );

    if (!vendorProfile) {
      throw new AppError('Vendor profile not found', 404);
    }

    res.json({
      success: true,
      data: { vendorProfile },
    });
  }

  /**
   * Update vendor profile
   */
  async updateVendorProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const vendorProfile = await VendorProfile.findOne({ user: req.user?.id });

    if (!vendorProfile) {
      throw new AppError('Vendor profile not found', 404);
    }

    const allowedUpdates = [
      'businessName',
      'businessDescription',
      'businessLogo',
      'businessBanner',
      'businessAddress',
      'businessPhone',
      'businessEmail',
      'businessWebsite',
      'storefront',
      'socialMedia',
    ];

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        (vendorProfile as any)[key] = req.body[key];
      }
    });

    await vendorProfile.save();

    res.json({
      success: true,
      message: 'Vendor profile updated successfully',
      data: { vendorProfile },
    });
  }

  /**
   * Upload KYC documents
   */
  async uploadKYCDocuments(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { documents } = req.body; // Array of { type, documentUrl }

    const vendorProfile = await VendorProfile.findOne({ user: req.user?.id });
    if (!vendorProfile) {
      throw new AppError('Vendor profile not found', 404);
    }

    // Add documents to KYC
    documents.forEach((doc: any) => {
      vendorProfile.kycDocuments.push({
        type: doc.type,
        documentUrl: doc.documentUrl,
        verificationStatus: 'pending',
      });
    });

    // Update verification status
    if (vendorProfile.verificationStatus === VendorVerificationStatus.PENDING) {
      vendorProfile.verificationStatus = VendorVerificationStatus.PENDING;
    }

    await vendorProfile.save();

    logger.info(`KYC documents uploaded: ${req.user?.id}`);

    res.json({
      success: true,
      message: 'KYC documents uploaded successfully',
      data: { vendorProfile },
    });
  }

  /**
   * Update payout details
   */
  async updatePayoutDetails(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { bankName, accountNumber, accountName, bankCode } = req.body;

    const vendorProfile = await VendorProfile.findOne({ user: req.user?.id });
    if (!vendorProfile) {
      throw new AppError('Vendor profile not found', 404);
    }

    vendorProfile.payoutDetails = {
      bankName,
      accountNumber,
      accountName,
      bankCode,
    };

    await vendorProfile.save();

    res.json({
      success: true,
      message: 'Payout details updated successfully',
      data: { vendorProfile },
    });
  }

  /**
   * Get vendor dashboard analytics
   */
  async getVendorDashboard(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const vendorProfile = await VendorProfile.findOne({ user: req.user?.id });
    if (!vendorProfile) {
      throw new AppError('Vendor profile not found', 404);
    }

    // Get date ranges
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total products
    const totalProducts = await Product.countDocuments({ vendor: req.user?.id });
    const activeProducts = await Product.countDocuments({
      vendor: req.user?.id,
      status: 'active',
    });

    // Orders statistics
    const totalOrders = await Order.countDocuments({
      'items.vendor': req.user?.id,
    });

    const ordersThisMonth = await Order.countDocuments({
      'items.vendor': req.user?.id,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const ordersThisWeek = await Order.countDocuments({
      'items.vendor': req.user?.id,
      createdAt: { $gte: sevenDaysAgo },
    });

    // Sales statistics
    const allOrders = await Order.find({
      'items.vendor': req.user?.id,
      paymentStatus: 'completed',
    });

    let totalRevenue = 0;
    let revenueThisMonth = 0;
    let revenueThisWeek = 0;

    allOrders.forEach((order) => {
      const vendorItems = order.items.filter(
        (item) => item.vendor.toString() === req.user?.id
      );
      const orderRevenue = vendorItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      totalRevenue += orderRevenue;

      const orderDate = (order as any).createdAt;
      if (orderDate && orderDate >= thirtyDaysAgo) {
        revenueThisMonth += orderRevenue;
      }

      if (orderDate && orderDate >= sevenDaysAgo) {
        revenueThisWeek += orderRevenue;
      }
    });

    // Calculate commission deduction (platform fee)
    const platformFee = (vendorProfile.commissionRate / 100) * totalRevenue;
    const netRevenue = totalRevenue - platformFee;

    // Top selling products
    const topProducts = await Product.find({ vendor: req.user?.id })
      .sort({ totalSales: -1 })
      .limit(5)
      .select('name slug totalSales price images averageRating');

    // Recent orders
    const recentOrders = await Order.find({
      'items.vendor': req.user?.id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName email')
      .select('orderNumber status total createdAt items');

    // Filter orders to show only vendor's items
    const filteredRecentOrders = recentOrders.map((order) => ({
      ...order.toObject(),
      items: order.items.filter((item) => item.vendor.toString() === req.user?.id),
    }));

    // Low stock products
    const lowStockProducts = await Product.find({
      vendor: req.user?.id,
      quantity: { $lte: 10, $gt: 0 },
      status: 'active',
    }).select('name slug quantity lowStockThreshold');

    // Out of stock products
    const outOfStockProducts = await Product.find({
      vendor: req.user?.id,
      quantity: 0,
    }).select('name slug');

    res.json({
      success: true,
      data: {
        overview: {
          totalProducts,
          activeProducts,
          totalOrders,
          ordersThisMonth,
          ordersThisWeek,
          totalRevenue,
          revenueThisMonth,
          revenueThisWeek,
          netRevenue,
          platformFee,
          commissionRate: vendorProfile.commissionRate,
          averageRating: vendorProfile.averageRating,
          totalReviews: vendorProfile.totalReviews,
        },
        topProducts,
        recentOrders: filteredRecentOrders,
        inventory: {
          lowStockProducts,
          outOfStockProducts,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
        },
        profile: {
          verificationStatus: vendorProfile.verificationStatus,
          isActive: vendorProfile.isActive,
          hasPayoutDetails: !!vendorProfile.payoutDetails,
        },
      },
    });
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { period = '30days' } = req.query;

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case '7days':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get orders in period
    const orders = await Order.find({
      'items.vendor': req.user?.id,
      paymentStatus: 'completed',
      createdAt: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: 1 });

    // Group by date
    const salesByDate: { [key: string]: { orders: number; revenue: number } } = {};

    orders.forEach((order) => {
      const orderDate = (order as any).createdAt;
      const date = orderDate.toISOString().split('T')[0];
      const vendorItems = order.items.filter(
        (item) => item.vendor.toString() === req.user?.id
      );
      const revenue = vendorItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      if (!salesByDate[date]) {
        salesByDate[date] = { orders: 0, revenue: 0 };
      }

      salesByDate[date].orders += 1;
      salesByDate[date].revenue += revenue;
    });

    // Convert to array
    const salesData = Object.keys(salesByDate).map((date) => ({
      date,
      orders: salesByDate[date].orders,
      revenue: salesByDate[date].revenue,
    }));

    // Calculate totals
    const totalOrders = salesData.reduce((sum, day) => sum + day.orders, 0);
    const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get top products in period
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } =
      {};

    orders.forEach((order) => {
      order.items
        .filter((item) => item.vendor.toString() === req.user?.id)
        .forEach((item) => {
          const productId = item.product.toString();
          if (!productSales[productId]) {
            productSales[productId] = {
              name: item.productName,
              quantity: 0,
              revenue: 0,
            };
          }
          productSales[productId].quantity += item.quantity;
          productSales[productId].revenue += item.price * item.quantity;
        });
    });

    const topSellingProducts = Object.keys(productSales)
      .map((productId) => ({
        productId,
        ...productSales[productId],
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalOrders,
          totalRevenue,
          averageOrderValue,
        },
        salesByDate: salesData,
        topSellingProducts,
      },
    });
  }

  /**
   * Get all vendors (Admin only)
   */
  async getAllVendors(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.verificationStatus) {
      filter.verificationStatus = req.query.verificationStatus;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const vendors = await VendorProfile.find(filter)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await VendorProfile.countDocuments(filter);

    res.json({
      success: true,
      data: { vendors },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Verify vendor KYC (Admin only)
   */
  async verifyVendorKYC(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { vendorId } = req.params;
    const { status, rejectionReason } = req.body;

    const vendorProfile = await VendorProfile.findById(vendorId);
    if (!vendorProfile) {
      throw new AppError('Vendor not found', 404);
    }

    if (status === 'verified') {
      vendorProfile.verificationStatus = VendorVerificationStatus.VERIFIED;
      vendorProfile.verifiedAt = new Date();
      vendorProfile.kycDocuments.forEach((doc) => {
        if (doc.verificationStatus === 'pending') {
          doc.verificationStatus = 'verified';
          doc.verifiedAt = new Date();
        }
      });
    } else if (status === 'rejected') {
      vendorProfile.verificationStatus = VendorVerificationStatus.REJECTED;
      vendorProfile.kycDocuments.forEach((doc) => {
        if (doc.verificationStatus === 'pending') {
          doc.verificationStatus = 'rejected';
          doc.rejectionReason = rejectionReason;
        }
      });
    }

    await vendorProfile.save();

    logger.info(`Vendor KYC ${status}: ${vendorId}`);

    res.json({
      success: true,
      message: `Vendor ${status} successfully`,
      data: { vendorProfile },
    });
  }

  /**
   * Toggle vendor active status (Admin only)
   */
  async toggleVendorStatus(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { vendorId } = req.params;

    const vendorProfile = await VendorProfile.findById(vendorId);
    if (!vendorProfile) {
      throw new AppError('Vendor not found', 404);
    }

    vendorProfile.isActive = !vendorProfile.isActive;
    await vendorProfile.save();

    res.json({
      success: true,
      message: `Vendor ${vendorProfile.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { vendorProfile },
    });
  }

  /**
   * Get public vendor profile
   */
  async getPublicVendorProfile(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    const { vendorId } = req.params;

    const vendorProfile = await VendorProfile.findOne({
      user: vendorId,
      isActive: true,
    }).populate('user', 'firstName lastName');

    if (!vendorProfile) {
      throw new AppError('Vendor not found', 404);
    }

    // Get vendor's products
    const products = await Product.find({
      vendor: vendorId,
      status: 'active',
    })
      .limit(12)
      .select('name slug price images averageRating totalReviews');

    res.json({
      success: true,
      data: {
        vendor: {
          id: vendorProfile.user._id,
          businessName: vendorProfile.businessName,
          businessDescription: vendorProfile.businessDescription,
          businessLogo: vendorProfile.businessLogo,
          businessBanner: vendorProfile.businessBanner,
          averageRating: vendorProfile.averageRating,
          totalReviews: vendorProfile.totalReviews,
          totalSales: vendorProfile.totalSales,
          storefront: vendorProfile.storefront,
          socialMedia: vendorProfile.socialMedia,
          verificationStatus: vendorProfile.verificationStatus,
        },
        products,
      },
    });
  }
}

export const vendorController = new VendorController();