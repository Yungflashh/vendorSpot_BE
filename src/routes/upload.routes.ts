import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { uploadController } from '../controllers/upload.controller';

const router = Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

router.use(authenticate);

/**
 * POST /api/v1/upload/vendor-image
 * Upload vendor logo or banner
 */
router.post(
  '/vendor-image',
  upload.single('image'),
  asyncHandler(uploadController.uploadVendorImage.bind(uploadController))
);

export default router;