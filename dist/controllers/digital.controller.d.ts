import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class DigitalProductController {
    /**
     * Upload digital product file
     */
    uploadDigitalFile(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Generate license key for digital product
     */
    generateLicense(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Activate license key
     */
    activateLicense(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get download link for purchased digital product
     */
    getDownloadLink(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Process download (with token validation)
     */
    processDownload(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get user's digital products
     */
    getUserDigitalProducts(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get user's licenses
     */
    getUserLicenses(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Verify license (for software validation)
     */
    verifyLicense(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Deactivate license (Admin or Owner)
     */
    deactivateLicense(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * Get digital product analytics (Vendor)
     */
    getDigitalProductAnalytics(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const digitalProductController: DigitalProductController;
//# sourceMappingURL=digital.controller.d.ts.map