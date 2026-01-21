import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body, query } from 'express-validator';
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
  body('deliveryType').optional().isIn(['standard', 'express', 'same_day', 'pickup']).withMessage('Invalid delivery type'), // Added 'pickup'
];

const cancelOrderValidation = [
  body('cancelReason').notEmpty().withMessage('Cancel reason is required'),
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
];

const getDeliveryRatesValidation = [
  query('city').notEmpty().withMessage('City is required'),
  query('state').notEmpty().withMessage('State is required'),
  query('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
];

// Get delivery rates - MOVED BEFORE other routes to prevent conflicts
router.get(
  '/delivery-rates',
  validate(getDeliveryRatesValidation),
  asyncHandler(orderController.getDeliveryRates.bind(orderController))
);

// Payment verification - MOVED BEFORE :id routes to prevent conflicts
router.get(
  '/payment/verify/:reference',
  asyncHandler(orderController.verifyPayment.bind(orderController))
);

// Customer routes
router.get('/my-orders', asyncHandler(orderController.getUserOrders.bind(orderController)));

// Vendor routes - MOVED BEFORE :id routes
router.get(
  '/vendor/orders',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(orderController.getVendorOrders.bind(orderController))
);

// Track order - specific route before generic :id
router.get('/:id/track', asyncHandler(orderController.trackOrder.bind(orderController)));

// Generic get order - AFTER all specific routes
router.get('/:id', asyncHandler(orderController.getOrder.bind(orderController)));

// POST routes
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

// PUT routes
router.put(
  '/:id/status',
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(updateStatusValidation),
  asyncHandler(orderController.updateOrderStatus.bind(orderController))
);

export default router;