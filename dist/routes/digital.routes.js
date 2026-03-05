"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const digital_controller_1 = require("../controllers/digital.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All digital product routes require authentication
router.use(auth_1.authenticate);
const uploadFileValidation = [
    (0, express_validator_1.body)('fileUrl').notEmpty().withMessage('File URL is required'),
    (0, express_validator_1.body)('fileName').notEmpty().withMessage('File name is required'),
    (0, express_validator_1.body)('fileSize').isInt({ min: 1 }).withMessage('File size is required'),
    (0, express_validator_1.body)('fileType').notEmpty().withMessage('File type is required'),
];
const generateLicenseValidation = [
    (0, express_validator_1.body)('orderId').notEmpty().withMessage('Order ID is required'),
    (0, express_validator_1.body)('itemId').notEmpty().withMessage('Item ID is required'),
];
const activateLicenseValidation = [
    (0, express_validator_1.body)('licenseKey').notEmpty().withMessage('License key is required'),
];
const verifyLicenseValidation = [
    (0, express_validator_1.body)('licenseKey').notEmpty().withMessage('License key is required'),
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
];
// Upload digital file (Vendor only)
router.post('/upload/:productId', (0, auth_1.authorize)(types_1.UserRole.VENDOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(uploadFileValidation), (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.uploadDigitalFile.bind(digital_controller_1.digitalProductController)));
// Get user's digital products
router.get('/my-products', (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.getUserDigitalProducts.bind(digital_controller_1.digitalProductController)));
// Get download link
router.get('/download-link/:orderId/:itemId', (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.getDownloadLink.bind(digital_controller_1.digitalProductController)));
// Process download
router.get('/download/:token', (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.processDownload.bind(digital_controller_1.digitalProductController)));
// License management
router.post('/license/generate', (0, auth_1.authorize)(types_1.UserRole.VENDOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(generateLicenseValidation), (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.generateLicense.bind(digital_controller_1.digitalProductController)));
router.post('/license/activate', (0, validation_1.validate)(activateLicenseValidation), (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.activateLicense.bind(digital_controller_1.digitalProductController)));
router.get('/licenses', (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.getUserLicenses.bind(digital_controller_1.digitalProductController)));
router.post('/license/verify', (0, validation_1.validate)(verifyLicenseValidation), (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.verifyLicense.bind(digital_controller_1.digitalProductController)));
router.post('/license/deactivate', (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.deactivateLicense.bind(digital_controller_1.digitalProductController)));
// Analytics (Vendor only)
router.get('/analytics/:productId', (0, auth_1.authorize)(types_1.UserRole.VENDOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(digital_controller_1.digitalProductController.getDigitalProductAnalytics.bind(digital_controller_1.digitalProductController)));
exports.default = router;
//# sourceMappingURL=digital.routes.js.map