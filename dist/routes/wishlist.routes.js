"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wishlist_controller_1 = require("../controllers/wishlist.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All wishlist routes require authentication
router.use(auth_1.authenticate);
const addToWishlistValidation = [
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
];
router.get('/', (0, error_1.asyncHandler)(wishlist_controller_1.wishlistController.getWishlist.bind(wishlist_controller_1.wishlistController)));
router.post('/add', (0, validation_1.validate)(addToWishlistValidation), (0, error_1.asyncHandler)(wishlist_controller_1.wishlistController.addToWishlist.bind(wishlist_controller_1.wishlistController)));
router.delete('/remove/:productId', (0, error_1.asyncHandler)(wishlist_controller_1.wishlistController.removeFromWishlist.bind(wishlist_controller_1.wishlistController)));
router.delete('/clear', (0, error_1.asyncHandler)(wishlist_controller_1.wishlistController.clearWishlist.bind(wishlist_controller_1.wishlistController)));
router.get('/check/:productId', (0, error_1.asyncHandler)(wishlist_controller_1.wishlistController.isInWishlist.bind(wishlist_controller_1.wishlistController)));
router.post('/move-to-cart', (0, error_1.asyncHandler)(wishlist_controller_1.wishlistController.moveToCart.bind(wishlist_controller_1.wishlistController)));
exports.default = router;
//# sourceMappingURL=wishlist.routes.js.map