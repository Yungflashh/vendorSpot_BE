import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class AddressController {
    /**
     * Get all addresses for current user
     */
    getAddresses(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get single address by index/id
     */
    getAddress(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Create new address with ShipBubble validation
     */
    createAddress(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Update address with optional ShipBubble revalidation
     */
    updateAddress(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Delete address (and from ShipBubble if needed)
     */
    deleteAddress(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Set default address
     */
    setDefaultAddress(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Validate address without saving (useful for address verification UI)
     */
    validateAddress(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const addressController: AddressController;
//# sourceMappingURL=address.controller.d.ts.map