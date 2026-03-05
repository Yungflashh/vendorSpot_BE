"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_controller_1 = require("../controllers/search.controller");
const error_1 = require("../middleware/error");
const router = (0, express_1.Router)();
// All search routes are public
router.get('/', (0, error_1.asyncHandler)(search_controller_1.searchController.searchProducts.bind(search_controller_1.searchController)));
router.get('/suggestions', (0, error_1.asyncHandler)(search_controller_1.searchController.getSuggestions.bind(search_controller_1.searchController)));
router.get('/trending', (0, error_1.asyncHandler)(search_controller_1.searchController.getTrendingSearches.bind(search_controller_1.searchController)));
router.get('/filters/:categoryId', (0, error_1.asyncHandler)(search_controller_1.searchController.getCategoryFilters.bind(search_controller_1.searchController)));
exports.default = router;
//# sourceMappingURL=search.routes.js.map