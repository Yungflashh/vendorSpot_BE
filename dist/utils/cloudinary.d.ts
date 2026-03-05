import { v2 as cloudinary } from 'cloudinary';
/**
 * Upload a single image to Cloudinary
 * @param base64Data - Base64 encoded image data
 * @param folder - Cloudinary folder to upload to
 * @returns Promise with Cloudinary upload result
 */
export declare const uploadToCloudinary: (base64Data: string, folder?: string) => Promise<{
    url: string;
    publicId: string;
}>;
/**
 * Upload multiple images to Cloudinary
 * @param base64Images - Array of base64 encoded images
 * @param folder - Cloudinary folder to upload to
 * @returns Promise with array of Cloudinary URLs
 */
export declare const uploadMultipleToCloudinary: (base64Images: string[], folder?: string) => Promise<string[]>;
/**
 * Upload digital file (for digital products)
 * @param base64Data - Base64 encoded file data
 * @param folder - Cloudinary folder to upload to
 * @returns Promise with Cloudinary upload result including file details
 */
export declare const uploadDigitalFileToCloudinary: (base64Data: string, folder?: string) => Promise<{
    url: string;
    publicId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
}>;
/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID of the image
 */
export declare const deleteFromCloudinary: (publicId: string) => Promise<void>;
/**
 * Delete multiple images from Cloudinary
 * @param publicIds - Array of Cloudinary public IDs
 */
export declare const deleteMultipleFromCloudinary: (publicIds: string[]) => Promise<void>;
export default cloudinary;
//# sourceMappingURL=cloudinary.d.ts.map