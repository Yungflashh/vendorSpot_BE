import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

const addToCartValidation = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];

const updateCartValidation = [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or more'),
];

const applyCouponValidation = [
  body('code').notEmpty().withMessage('Coupon code is required'),
];

router.get('/', asyncHandler(cartController.getCart.bind(cartController)));
router.get('/summary', asyncHandler(cartController.getCartSummary.bind(cartController)));

router.post(
  '/add',
  validate(addToCartValidation),
  asyncHandler(cartController.addToCart.bind(cartController))
);

router.put(
  '/items/:itemId',
  validate(updateCartValidation),
  asyncHandler(cartController.updateCartItem.bind(cartController))
);

router.delete(
  '/items/:itemId',
  asyncHandler(cartController.removeFromCart.bind(cartController))
);

router.delete(
  '/',
  asyncHandler(cartController.clearCart.bind(cartController))
);

router.post(
  '/coupon/apply',
  validate(applyCouponValidation),
  asyncHandler(cartController.applyCoupon.bind(cartController))
);

router.delete(
  '/coupon',
  asyncHandler(cartController.removeCoupon.bind(cartController))
);

export default router;
