"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const upload_controller_1 = require("../controllers/upload.controller");
const router = (0, express_1.Router)();
// ============================================================
// MULTER CONFIGURATION FOR IMAGES (existing)
// ============================================================
const imageStorage = multer_1.default.memoryStorage();
const imageUpload = (0, multer_1.default)({
    storage: imageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
// ============================================================
// ✅ NEW MULTER CONFIGURATION FOR KYC DOCUMENTS (images + PDFs)
// ============================================================
const kycStorage = multer_1.default.memoryStorage();
const kycUpload = (0, multer_1.default)({
    storage: kycStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
        if (extname && mimetype) {
            cb(null, true);
        }
        else {
            cb(new Error('Only .jpeg, .jpg, .png, and .pdf files are allowed'));
        }
    },
});
// ============================================================
// ROUTES
// ============================================================
router.use(auth_1.authenticate);
/**
 * POST /api/v1/upload/vendor-image
 * Upload vendor logo or banner
 */
router.post('/vendor-image', imageUpload.single('image'), (0, error_1.asyncHandler)(upload_controller_1.uploadController.uploadVendorImage.bind(upload_controller_1.uploadController)));
/**
 * ✅ NEW ROUTE
 * POST /api/v1/upload/kyc-document
 * Upload KYC document (images or PDFs)
 */
router.post('/kyc-document', kycUpload.single('document'), (0, error_1.asyncHandler)(upload_controller_1.uploadController.uploadKYCDocument.bind(upload_controller_1.uploadController)));
exports.default = router;
//# sourceMappingURL=upload.routes.js.map