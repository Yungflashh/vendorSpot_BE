import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// All order routes require authentication
router.use(authenticate);

const createOrderValidation = [
  body('shippingAddress.street').notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
  body('paymentMethod').isIn(['paystack', 'wallet', 'cash_on_delivery']).withMessage('Invalid payment method'),
];

const cancelOrderValidation = [
  body('cancelReason').notEmpty().withMessage('Cancel reason is required'),
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
];

// Customer routes
router.get('/my-orders', asyncHandler(orderController.getUserOrders.bind(orderController)));
router.get('/:id', asyncHandler(orderController.getOrder.bind(orderController)));

router.post(
  '/',
  validate(createOrderValidation),
  asyncHandler(orderController.createOrder.bind(orderController))
);

router.post(
  '/:id/cancel',
  validate(cancelOrderValidation),
  asyncHandler(orderController.cancelOrder.bind(orderController))
);

// Payment verification (can be accessed by webhook too)
router.get(
  '/payment/verify/:reference',
  asyncHandler(orderController.verifyPayment.bind(orderController))
);

// Vendor routes
router.get(
  '/vendor/orders',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(orderController.getVendorOrders.bind(orderController))
);

router.put(
  '/:id/status',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(updateStatusValidation),
  asyncHandler(orderController.updateOrderStatus.bind(orderController))
);

export default router;
