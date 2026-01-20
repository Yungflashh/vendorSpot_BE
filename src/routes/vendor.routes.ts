import { Router } from 'express';
import { vendorController } from '../controllers/vendor.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

const createProfileValidation = [
  body('businessName').notEmpty().withMessage('Business name is required'),
  body('businessAddress.street').notEmpty().withMessage('Street address is required'),
  body('businessAddress.city').notEmpty().withMessage('City is required'),
  body('businessAddress.state').notEmpty().withMessage('State is required'),
  body('businessPhone').notEmpty().withMessage('Business phone is required'),
  body('businessEmail').isEmail().withMessage('Valid business email is required'),
];

const kycUploadValidation = [
  body('documents').isArray({ min: 1 }).withMessage('At least one document is required'),
];

const payoutDetailsValidation = [
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('accountName').notEmpty().withMessage('Account name is required'),
  body('bankCode').notEmpty().withMessage('Bank code is required'),
];

const verifyKYCValidation = [
  body('status').isIn(['verified', 'rejected']).withMessage('Invalid status'),
];

// PUBLIC ROUTES (No authentication required)

/**
 * GET /api/v1/vendor/top
 * Get top vendors for home screen
 * Query params: ?limit=10&sortBy=rating (rating, sales, products)
 */
router.get(
  '/top',
  asyncHandler(vendorController.getTopVendors.bind(vendorController))
);

/**
 * GET /api/v1/vendor/public/:vendorId
 * Get public vendor profile with products
 */
router.get(
  '/public/:vendorId',
  asyncHandler(vendorController.getPublicVendorProfile.bind(vendorController))
);

// AUTHENTICATED ROUTES
router.use(authenticate);

// Vendor profile management
/**
 * POST /api/v1/vendor/profile
 * Create vendor profile
 */
router.post(
  '/profile',
  validate(createProfileValidation),
  asyncHandler(vendorController.createVendorProfile.bind(vendorController))
);

/**
 * GET /api/v1/vendor/profile
 * Get own vendor profile
 */
router.get(
  '/profile',
  asyncHandler(vendorController.getVendorProfile.bind(vendorController))
);

/**
 * PUT /api/v1/vendor/profile
 * Update vendor profile
 */
router.put(
  '/profile',
  asyncHandler(vendorController.updateVendorProfile.bind(vendorController))
);

// KYC and payout
/**
 * POST /api/v1/vendor/kyc/upload
 * Upload KYC documents
 */
router.post(
  '/kyc/upload',
  validate(kycUploadValidation),
  asyncHandler(vendorController.uploadKYCDocuments.bind(vendorController))
);

/**
 * PUT /api/v1/vendor/payout-details
 * Update payout/bank details
 */
router.put(
  '/payout-details',
  validate(payoutDetailsValidation),
  asyncHandler(vendorController.updatePayoutDetails.bind(vendorController))
);

// Dashboard and analytics (Vendor only)
/**
 * GET /api/v1/vendor/dashboard
 * Get vendor dashboard analytics
 */
router.get(
  '/dashboard',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(vendorController.getVendorDashboard.bind(vendorController))
);

/**
 * GET /api/v1/vendor/analytics
 * Get sales analytics
 * Query params: ?period=30days (7days, 30days, 90days, 1year)
 */
router.get(
  '/analytics',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(vendorController.getSalesAnalytics.bind(vendorController))
);

// Admin routes
/**
 * GET /api/v1/vendor/admin/all
 * Get all vendors (Admin only)
 * Query params: ?page=1&limit=20&verificationStatus=verified&isActive=true
 */
router.get(
  '/admin/all',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(vendorController.getAllVendors.bind(vendorController))
);

/**
 * PUT /api/v1/vendor/admin/verify/:vendorId
 * Verify vendor KYC (Admin only)
 */
router.put(
  '/admin/verify/:vendorId',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(verifyKYCValidation),
  asyncHandler(vendorController.verifyVendorKYC.bind(vendorController))
);

/**
 * PUT /api/v1/vendor/admin/toggle-status/:vendorId
 * Toggle vendor active status (Admin only)
 */
router.put(
  '/admin/toggle-status/:vendorId',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(vendorController.toggleVendorStatus.bind(vendorController))
);

export default router;