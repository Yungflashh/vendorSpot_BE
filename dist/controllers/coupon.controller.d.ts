import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class CouponController {
    /**
     * Create coupon
     */
    createCoupon(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get all coupons
     */
    getCoupons(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get single coupon
     */
    getCoupon(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Validate coupon (public)
     */
    validateCoupon(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update coupon
     */
    updateCoupon(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Delete coupon
     */
    deleteCoupon(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get coupon usage statistics
     */
    getCouponStats(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const couponController: CouponController;
//# sourceMappingURL=coupon.controller.d.ts.map