import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
export declare class UploadController {
    /**
     * Upload vendor image to Cloudinary
     */
    uploadVendorImage(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
    /**
     * ✅ NEW METHOD - Upload KYC document to Cloudinary
     * Supports images (jpg, png) and PDFs
     */
    uploadKYCDocument(req: AuthRequest, res: Response<ApiResponse>): Promise<void>;
}
export declare const uploadController: UploadController;
//# sourceMappingURL=upload.controller.d.ts.map