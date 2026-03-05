"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const types_1 = require("../types");
const router = (0, express_1.Router)();
const createCategoryValidation = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Category name is required'),
];
// Public routes
router.get('/', (0, error_1.asyncHandler)(category_controller_1.categoryController.getCategories.bind(category_controller_1.categoryController)));
router.get('/tree', (0, error_1.asyncHandler)(category_controller_1.categoryController.getCategoryTree.bind(category_controller_1.categoryController)));
router.get('/:slug', (0, error_1.asyncHandler)(category_controller_1.categoryController.getCategory.bind(category_controller_1.categoryController)));
// Admin routes
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, validation_1.validate)(createCategoryValidation), (0, error_1.asyncHandler)(category_controller_1.categoryController.createCategory.bind(category_controller_1.categoryController)));
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(category_controller_1.categoryController.updateCategory.bind(category_controller_1.categoryController)));
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)(types_1.UserRole.ADMIN, types_1.UserRole.SUPER_ADMIN), (0, error_1.asyncHandler)(category_controller_1.categoryController.deleteCategory.bind(category_controller_1.categoryController)));
exports.default = router;
//# sourceMappingURL=category.routes.js.map