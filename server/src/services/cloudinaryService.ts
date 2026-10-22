import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import { Readable } from 'stream';
import { ENV } from '../config/env.js';

// Configure Cloudinary SDK
if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
  resourceType: string;
}

export class CloudinaryService {
  /**
   * Check if Cloudinary is fully configured with credentials
   */
  static isConfigured(): boolean {
    return Boolean(
      ENV.CLOUDINARY_CLOUD_NAME &&
      ENV.CLOUDINARY_API_KEY &&
      ENV.CLOUDINARY_API_SECRET
    );
  }

  /**
   * Upload an in-memory buffer (Image or Document) to Cloudinary
   */
  static async uploadBuffer(params: {
    buffer: Buffer;
    folder: string;
    filename?: string;
    resourceType?: 'image' | 'raw' | 'auto';
    tags?: string[];
  }): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary credentials are not configured in environment variables.');
    }

    const { buffer, folder, filename, resourceType = 'auto', tags = [] } = params;

    return new Promise((resolve, reject) => {
      const uploadOptions: UploadApiOptions = {
        folder,
        resource_type: resourceType,
        tags,
        use_filename: Boolean(filename),
        unique_filename: true,
        overwrite: false,
      };

      if (filename) {
        uploadOptions.public_id = filename.replace(/\.[^/.]+$/, '');
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload returned empty response.'));
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            bytes: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
            resourceType: result.resource_type,
          });
        }
      );

      // Pipe buffer directly into Cloudinary upload stream
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(uploadStream);
    });
  }

  /**
   * Delete an asset from Cloudinary
   */
  static async deleteAsset(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
    if (!this.isConfigured() || !publicId) return;

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      console.error(`Failed to delete Cloudinary asset with public ID: ${publicId}`, err);
    }
  }

  /**
   * Helper to format an optimized delivery URL
   */
  static getOptimizedUrl(publicId: string, options?: { width?: number; height?: number; crop?: string; quality?: string }): string {
    return cloudinary.url(publicId, {
      secure: true,
      quality: options?.quality || 'auto',
      fetch_format: 'auto',
      ...options,
    });
  }
}
