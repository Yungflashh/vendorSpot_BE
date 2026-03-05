"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/order.routes.ts
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// All order routes require authentication
router.use(auth_1.authenticate);
// ✅ UPDATED: Conditional shipping address validation (optional for digital products)
const createOrderValidation = [
    (0, express_validator_1.body)('shippingAddress.street')
        .optional()
        .notEmpty()
        .withMessage('Street address is required for physical products'),
    (0, express_validator_1.body)('shippingAddress.city')
        .optional()
        .notEmpty()
        .withMessage('City is required for physical products'),
    (0, express_validator_1.body)('shippingAddress.state')
        .optional()
        .notEmpty()
        .withMessage('State is required for physical products'),
    (0, express_validator_1.body)('shippingAddress.country')
        .optional()
        .notEmpty()
        .withMessage('Country is required for physical products'),
    (0, express_validator_1.body)('paymentMethod')
        .isIn(['paystack', 'wallet', 'cash_on_delivery'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.body)('deliveryType')
        .optional()
        .isIn(['standard', 'express', 'same_day', 'pickup', 'digital']) // ✅ Added 'digital'
        .withMessage('Invalid delivery type'),
];
const cancelOrderValidation = [
    (0, express_validator_1.body)('cancelReason').notEmpty().withMessage('Cancel reason is required'),
];
const updateStatusValidation = [
    (0, express_validator_1.body)('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled'])
        .withMessage('Invalid status'),
];
const getDeliveryRatesValidation = [
    (0, express_validator_1.query)('city').notEmpty().withMessage('City is required'),
    (0, express_validator_1.query)('state').notEmpty().withMessage('State is required'),
    (0, express_validator_1.query)('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
];
// Get delivery rates - MOVED BEFORE other routes to prevent conflicts
router.get('/delivery-rates', (0, validation_1.validate)(getDeliveryRatesValidation), (0, error_1.asyncHandler)(order_controller_1.orderController.getDeliveryRates.bind(order_controller_1.orderController)));
// Payment verification - MOVED BEFORE :id routes to prevent conflicts
router.get('/payment/verify/:reference', (0, error_1.asyncHandler)(order_controller_1.orderController.verifyPayment.bind(order_controller_1.orderController)));
// ✅ NEW: Get user's digital products
router.get('/my-digital-products', (0, error_1.asyncHandler)(order_controller_1.orderController.getUserDigitalProducts.bind(order_controller_1.orderController)));
// Customer routes
router.get('/my-orders', (0, error_1.asyncHandler)(order_controller_1.orderController.getUserOrders.bind(order_controller_1.orderController)));
// Vendor get single order - BEFORE generic :id
router.get('/vendor/orders/:id', (0, auth_1.authorize)(types_1.UserRole.VENDOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(order_controller_1.orderController.getVendorOrder.bind(order_controller_1.orderController)));
// Vendor routes - MOVED BEFORE :id routes
router.get('/vendor/orders', (0, auth_1.authorize)(types_1.UserRole.VENDOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(order_controller_1.orderController.getVendorOrders.bind(order_controller_1.orderController)));
// Track order - specific route before generic :id
router.get('/:id/track', (0, error_1.asyncHandler)(order_controller_1.orderController.trackOrder.bind(order_controller_1.orderController)));
// ✅ NEW: Download digital product
router.get('/:id/download/:itemId', (0, error_1.asyncHandler)(order_controller_1.orderController.downloadDigitalProduct.bind(order_controller_1.orderController)));
// Generic get order - AFTER all specific routes
router.get('/:id', (0, error_1.asyncHandler)(order_controller_1.orderController.getOrder.bind(order_controller_1.orderController)));
// POST routes
router.post('/', (0, validation_1.validate)(createOrderValidation), (0, error_1.asyncHandler)(order_controller_1.orderController.createOrder.bind(order_controller_1.orderController)));
router.post('/:id/cancel', (0, validation_1.validate)(cancelOrderValidation), (0, error_1.asyncHandler)(order_controller_1.orderController.cancelOrder.bind(order_controller_1.orderController)));
// PUT routes
router.put('/:id/status', (0, auth_1.authorize)(types_1.UserRole.VENDOR, types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(updateStatusValidation), (0, error_1.asyncHandler)(order_controller_1.orderController.updateOrderStatus.bind(order_controller_1.orderController)));
exports.default = router;
//# sourceMappingURL=order.routes.js.map