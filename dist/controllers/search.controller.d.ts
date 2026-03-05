import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class SearchController {
    /**
     * Advanced product search
     */
    searchProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get search suggestions
     */
    getSuggestions(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get trending searches
     */
    getTrendingSearches(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get filters for category
     */
    getCategoryFilters(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const searchController: SearchController;
//# sourceMappingURL=search.controller.d.ts.map