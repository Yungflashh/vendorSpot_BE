import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { asyncHandler } from '../middleware/error';

const router = Router();

// All search routes are public
router.get('/', asyncHandler(searchController.searchProducts.bind(searchController)));

router.get('/suggestions', asyncHandler(searchController.getSuggestions.bind(searchController)));

router.get('/trending', asyncHandler(searchController.getTrendingSearches.bind(searchController)));

router.get('/filters/:categoryId', asyncHandler(searchController.getCategoryFilters.bind(searchController)));

export default router;
