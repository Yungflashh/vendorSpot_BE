"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cart_controller_1 = require("../controllers/cart.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All cart routes require authentication
router.use(auth_1.authenticate);
const addToCartValidation = [
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
];
const updateCartValidation = [
    (0, express_validator_1.body)('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or more'),
];
const applyCouponValidation = [
    (0, express_validator_1.body)('code').notEmpty().withMessage('Coupon code is required'),
];
router.get('/', (0, error_1.asyncHandler)(cart_controller_1.cartController.getCart.bind(cart_controller_1.cartController)));
router.get('/summary', (0, error_1.asyncHandler)(cart_controller_1.cartController.getCartSummary.bind(cart_controller_1.cartController)));
router.post('/add', (0, validation_1.validate)(addToCartValidation), (0, error_1.asyncHandler)(cart_controller_1.cartController.addToCart.bind(cart_controller_1.cartController)));
router.put('/items/:itemId', (0, validation_1.validate)(updateCartValidation), (0, error_1.asyncHandler)(cart_controller_1.cartController.updateCartItem.bind(cart_controller_1.cartController)));
router.delete('/items/:itemId', (0, error_1.asyncHandler)(cart_controller_1.cartController.removeFromCart.bind(cart_controller_1.cartController)));
router.delete('/', (0, error_1.asyncHandler)(cart_controller_1.cartController.clearCart.bind(cart_controller_1.cartController)));
router.post('/coupon/apply', (0, validation_1.validate)(applyCouponValidation), (0, error_1.asyncHandler)(cart_controller_1.cartController.applyCoupon.bind(cart_controller_1.cartController)));
router.delete('/coupon', (0, error_1.asyncHandler)(cart_controller_1.cartController.removeCoupon.bind(cart_controller_1.cartController)));
exports.default = router;
//# sourceMappingURL=cart.routes.js.map