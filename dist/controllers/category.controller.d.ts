import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class CategoryController {
    /**
     * Create category
     */
    createCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get all categories
     */
    getCategories(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get category tree (hierarchical)
     */
    getCategoryTree(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get single category
     */
    getCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update category
     */
    updateCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Delete category
     */
    deleteCategory(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const categoryController: CategoryController;
//# sourceMappingURL=category.controller.d.ts.map