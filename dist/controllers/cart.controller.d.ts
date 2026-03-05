import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class CartController {
    /**
     * Get user's cart
     */
    getCart(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Add item to cart
     */
    addToCart(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update cart item quantity
     */
    updateCartItem(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Remove item from cart
     */
    removeFromCart(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Clear cart
     */
    clearCart(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Apply coupon to cart
     */
    applyCoupon(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Remove coupon from cart
     */
    removeCoupon(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get cart summary (for checkout)
     */
    getCartSummary(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const cartController: CartController;
//# sourceMappingURL=cart.controller.d.ts.map