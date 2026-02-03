import { Response } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/error';
import cloudinary from '../utils/cloudinary';
import { logger } from '../utils/logger';

export class UploadController {
  /**
   * Upload vendor image to Cloudinary
   */
  async uploadVendorImage(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    if (!req.file) {
      throw new AppError('No image file provided', 400);
    }

    const type = req.body.type || 'logo'; // 'logo' or 'banner'

    try {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `vendor/${type}s`,
            transformation: type === 'logo' 
              ? [{ width: 400, height: 400, crop: 'fill' }]
              : [{ width: 1200, height: 400, crop: 'fill' }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(req.file!.buffer);
      });

      const cloudinaryResult = result as any;

      logger.info(`Vendor ${type} uploaded: ${cloudinaryResult.secure_url}`);

      res.json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`,
        data: {
          url: cloudinaryResult.secure_url,
          publicId: cloudinaryResult.public_id,
        },
      });
    } catch (error) {
      logger.error('Upload error:', error);
      throw new AppError('Failed to upload image', 500);
    }
  }
}

export const uploadController = new UploadController();