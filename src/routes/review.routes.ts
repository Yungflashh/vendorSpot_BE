import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

const createReviewValidation = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').notEmpty().withMessage('Comment is required'),
];

// Public routes
router.get('/product/:productId', asyncHandler(reviewController.getProductReviews.bind(reviewController)));

// Authenticated routes
router.use(authenticate);

router.post(
  '/',
  validate(createReviewValidation),
  asyncHandler(reviewController.createReview.bind(reviewController))
);

router.get('/my-reviews', asyncHandler(reviewController.getUserReviews.bind(reviewController)));

router.put('/:reviewId', asyncHandler(reviewController.updateReview.bind(reviewController)));

router.delete('/:reviewId', asyncHandler(reviewController.deleteReview.bind(reviewController)));

router.post('/:reviewId/helpful', asyncHandler(reviewController.markHelpful.bind(reviewController)));

router.post(
  '/:reviewId/report',
  body('reason').notEmpty().withMessage('Report reason is required'),
  asyncHandler(reviewController.reportReview.bind(reviewController))
);

export default router;
