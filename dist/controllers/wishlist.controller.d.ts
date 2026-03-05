import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class WishlistController {
    /**
     * Get user's wishlist
     */
    getWishlist(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Add to wishlist
     */
    addToWishlist(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Remove from wishlist
     */
    removeFromWishlist(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Clear wishlist
     */
    clearWishlist(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Check if product is in wishlist
     */
    isInWishlist(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Move wishlist item to cart
     */
    moveToCart(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const wishlistController: WishlistController;
//# sourceMappingURL=wishlist.controller.d.ts.map