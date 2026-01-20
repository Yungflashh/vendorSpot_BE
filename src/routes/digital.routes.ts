import { Router } from 'express';
import { digitalProductController } from '../controllers/digital.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// All digital product routes require authentication
router.use(authenticate);

const uploadFileValidation = [
  body('fileUrl').notEmpty().withMessage('File URL is required'),
  body('fileName').notEmpty().withMessage('File name is required'),
  body('fileSize').isInt({ min: 1 }).withMessage('File size is required'),
  body('fileType').notEmpty().withMessage('File type is required'),
];

const generateLicenseValidation = [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('itemId').notEmpty().withMessage('Item ID is required'),
];

const activateLicenseValidation = [
  body('licenseKey').notEmpty().withMessage('License key is required'),
];

const verifyLicenseValidation = [
  body('licenseKey').notEmpty().withMessage('License key is required'),
  body('productId').notEmpty().withMessage('Product ID is required'),
];

// Upload digital file (Vendor only)
router.post(
  '/upload/:productId',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(uploadFileValidation),
  asyncHandler(digitalProductController.uploadDigitalFile.bind(digitalProductController))
);

// Get user's digital products
router.get(
  '/my-products',
  asyncHandler(digitalProductController.getUserDigitalProducts.bind(digitalProductController))
);

// Get download link
router.get(
  '/download-link/:orderId/:itemId',
  asyncHandler(digitalProductController.getDownloadLink.bind(digitalProductController))
);

// Process download
router.get(
  '/download/:token',
  asyncHandler(digitalProductController.processDownload.bind(digitalProductController))
);

// License management
router.post(
  '/license/generate',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(generateLicenseValidation),
  asyncHandler(digitalProductController.generateLicense.bind(digitalProductController))
);

router.post(
  '/license/activate',
  validate(activateLicenseValidation),
  asyncHandler(digitalProductController.activateLicense.bind(digitalProductController))
);

router.get(
  '/licenses',
  asyncHandler(digitalProductController.getUserLicenses.bind(digitalProductController))
);

router.post(
  '/license/verify',
  validate(verifyLicenseValidation),
  asyncHandler(digitalProductController.verifyLicense.bind(digitalProductController))
);

router.post(
  '/license/deactivate',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(digitalProductController.deactivateLicense.bind(digitalProductController))
);

// Analytics (Vendor only)
router.get(
  '/analytics/:productId',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(digitalProductController.getDigitalProductAnalytics.bind(digitalProductController))
);

export default router;
