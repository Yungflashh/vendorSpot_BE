import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

const createCategoryValidation = [
  body('name').notEmpty().withMessage('Category name is required'),
];

// Public routes
router.get('/', asyncHandler(categoryController.getCategories.bind(categoryController)));
router.get('/tree', asyncHandler(categoryController.getCategoryTree.bind(categoryController)));
router.get('/:slug', asyncHandler(categoryController.getCategory.bind(categoryController)));

// Admin routes
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(createCategoryValidation),
  asyncHandler(categoryController.createCategory.bind(categoryController))
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(categoryController.updateCategory.bind(categoryController))
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(categoryController.deleteCategory.bind(categoryController))
);

export default router;
