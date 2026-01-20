import { Router } from 'express';
import { wishlistController } from '../controllers/wishlist.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// All wishlist routes require authentication
router.use(authenticate);

const addToWishlistValidation = [
  body('productId').notEmpty().withMessage('Product ID is required'),
];

router.get('/', asyncHandler(wishlistController.getWishlist.bind(wishlistController)));

router.post(
  '/add',
  validate(addToWishlistValidation),
  asyncHandler(wishlistController.addToWishlist.bind(wishlistController))
);

router.delete('/remove/:productId', asyncHandler(wishlistController.removeFromWishlist.bind(wishlistController)));

router.delete('/clear', asyncHandler(wishlistController.clearWishlist.bind(wishlistController)));

router.get('/check/:productId', asyncHandler(wishlistController.isInWishlist.bind(wishlistController)));

router.post('/move-to-cart', asyncHandler(wishlistController.moveToCart.bind(wishlistController)));

export default router;
