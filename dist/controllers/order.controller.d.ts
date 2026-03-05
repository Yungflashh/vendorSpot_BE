import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class OrderController {
    /**
     * Check if cart contains digital products
     */
    private hasDigitalProducts;
    /**
     * Check if cart contains ONLY digital products
     */
    private isDigitalOnly;
    /**
     * Validate payment method for cart contents
     */
    private validatePaymentMethod;
    /**
     * Get delivery rates
     */
    getDeliveryRates(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    private getVendorDeliveryRates;
    private groupItemsByVendor;
    private checkPickupAvailability;
    private aggregateVendorRates;
    private compareEstimatedDays;
    /**
     * Create order from cart - WITH DIGITAL PRODUCTS SUPPORT
     */
    createOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    private createVendorShipments;
    /**
     * Verify payment - WITH DIGITAL PRODUCT ACCESS
     */
    verifyPayment(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get user orders
     */
    getUserOrders(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get single order
     */
    getOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get single order for vendor (vendor can view orders containing their products)
     */
    getVendorOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get user's digital products
     */
    getUserDigitalProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Download digital product
     */
    downloadDigitalProduct(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Track order shipment
     */
    trackOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Cancel order
     */
    cancelOrder(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get vendor orders
     */
    getVendorOrders(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update order status (vendor)
     */
    updateOrderStatus(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Helper methods
     */
    private getDefaultRate;
    private getDefaultEstimate;
    private getDefaultDescription;
    private getVendorFallbackRates;
    private getFallbackRates;
}
export declare const orderController: OrderController;
//# sourceMappingURL=order.controller.d.ts.map