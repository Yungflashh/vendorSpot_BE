import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { UserRole } from '../types';

const router = Router();

// Public routes (no authentication required)

// Get all products with filters
router.get('/', asyncHandler(productController.getProducts.bind(productController)));

// Get recommended products (for home page)
router.get('/recommended', asyncHandler(productController.getRecommendedProducts.bind(productController)));

// Get featured products (for home page)
router.get('/featured', asyncHandler(productController.getFeaturedProducts.bind(productController)));

// Search products
router.get('/search', asyncHandler(productController.searchProducts.bind(productController)));

// Get new arrivals
router.get('/new-arrivals', asyncHandler(productController.getNewArrivals.bind(productController)));

// Get products on sale
router.get('/on-sale', asyncHandler(productController.getProductsOnSale.bind(productController)));

// Get trending products
router.get('/trending', asyncHandler(productController.getTrendingProducts.bind(productController)));

// Get products by category
router.get('/category/:categoryId', asyncHandler(productController.getProductsByCategory.bind(productController)));

// Get products by vendor
router.get('/vendor/:vendorId', asyncHandler(productController.getVendorProducts.bind(productController)));

// Get single product (must be after specific routes)
router.get('/:id', asyncHandler(productController.getProduct.bind(productController)));

// Protected routes (authentication required)

// Create product (vendors, admins, super admins only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(productController.createProduct.bind(productController))
);

// Update product (vendors, admins, super admins only)
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(productController.updateProduct.bind(productController))
);

// Delete product (vendors, admins, super admins only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(productController.deleteProduct.bind(productController))
);

export default router;