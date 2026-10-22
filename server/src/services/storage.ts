import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { ENV } from '../config/env.js';
import { Asset, IAsset, AssetType } from '../models/Asset.js';
import { Company } from '../models/Company.js';
import { CloudinaryService } from './cloudinaryService.js';

export class StorageService {
  private static ensureDirExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static getCompanyDir(companyId: string, assetType: AssetType): string {
    const dir = path.join(ENV.STORAGE_DIR, companyId, assetType);
    this.ensureDirExists(dir);
    return dir;
  }

  static getExportDir(): string {
    this.ensureDirExists(ENV.EXPORT_DIR);
    return ENV.EXPORT_DIR;
  }

  static getAbsolutePath(storageKey: string): string {
    return path.join(ENV.STORAGE_DIR, storageKey);
  }

  static async saveUploadedBuffer(params: {
    companyId: string;
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
    assetType: AssetType;
  }): Promise<IAsset> {
    const { companyId, buffer, originalFilename, mimeType, assetType } = params;

    // Check storage quota
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    const fileSize = buffer.length;
    if (company.storageUsage + fileSize > company.storageQuota) {
      throw new Error(`Storage quota exceeded. Available: ${Math.max(0, company.storageQuota - company.storageUsage)} bytes, Required: ${fileSize} bytes`);
    }

    // SHA-256 checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // Extension & unique name
    const ext = path.extname(originalFilename).toLowerCase() || (mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg');
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    
    // Relative storage key
    const relativeKey = path.join(companyId, assetType, filename).replace(/\\/g, '/');
    const absolutePath = path.join(ENV.STORAGE_DIR, relativeKey);
    this.ensureDirExists(path.dirname(absolutePath));

    // Write file to local disk for safe Sharp processing, Archiver ZIP, and offline caching
    await fs.promises.writeFile(absolutePath, buffer);

    // Read image metadata with Sharp if image
    let width: number | undefined;
    let height: number | undefined;
    if (mimeType.startsWith('image/')) {
      try {
        const meta = await sharp(buffer).metadata();
        width = meta.width;
        height = meta.height;
      } catch (e) {
        // Not a standard sharp readable image
      }
    }

    // Upload to Cloudinary if configured
    let cloudinaryUrl: string | undefined;
    let cloudinaryPublicId: string | undefined;
    let resourceType: string = mimeType.startsWith('image/') ? 'image' : 'raw';

    if (CloudinaryService.isConfigured()) {
      try {
        const subfolder =
          assetType === 'original'
            ? 'originals'
            : assetType === 'processed'
            ? 'watermarked'
            : assetType === 'logo'
            ? 'logos'
            : 'documents';
        const folder = `jewellery_watermark/${companyId}/${subfolder}`;
        const uploadRes = await CloudinaryService.uploadBuffer({
          buffer,
          folder,
          filename,
          resourceType: mimeType.startsWith('image/') ? 'image' : 'raw',
          tags: ['jewellery', assetType, companyId],
        });
        cloudinaryUrl = uploadRes.secureUrl;
        cloudinaryPublicId = uploadRes.publicId;
        resourceType = uploadRes.resourceType;
      } catch (cloudErr) {
        console.warn(`[Cloudinary] Upload notice: Could not upload to Cloudinary (${(cloudErr as Error).message}). Local copy preserved safely.`);
      }
    }

    // Create Asset record
    const asset = await Asset.create({
      companyId,
      storageKey: relativeKey,
      originalFilename,
      assetType,
      mimeType,
      fileSize,
      checksum,
      width,
      height,
      url: cloudinaryUrl,
      cloudinaryPublicId,
      resourceType,
      lifecycleStatus: 'active',
    });

    // Update company storage usage
    await Company.findByIdAndUpdate(companyId, {
      $inc: { storageUsage: fileSize },
    });

    return asset;
  }

  static async deleteAsset(asset: IAsset): Promise<void> {
    const absolutePath = this.getAbsolutePath(asset.storageKey);
    try {
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
      }
    } catch (e) {
      console.error(`Failed to delete physical file: ${absolutePath}`, e);
    }

    // Delete from Cloudinary if public ID exists
    if (asset.cloudinaryPublicId && CloudinaryService.isConfigured()) {
      try {
        await CloudinaryService.deleteAsset(asset.cloudinaryPublicId, asset.assetType === 'document' ? 'raw' : 'image');
      } catch (cloudErr) {
        console.error(`Failed to delete Cloudinary asset: ${asset.cloudinaryPublicId}`, cloudErr);
      }
    }

    // Decrement company storage usage
    await Company.findByIdAndUpdate(asset.companyId, {
      $inc: { storageUsage: -asset.fileSize },
    });

    asset.lifecycleStatus = 'deleted';
    await asset.save();
  }

  /**
   * Syncs existing local disk assets (both original & processed) to Cloudinary
   */
  static async syncLocalAssetsToCloudinary(companyId?: string): Promise<{ synced: number; failed: number }> {
    if (!CloudinaryService.isConfigured()) {
      return { synced: 0, failed: 0 };
    }

    const query: any = {
      lifecycleStatus: 'active',
      $or: [{ url: { $exists: false } }, { url: null }, { url: '' }],
    };
    if (companyId) {
      query.companyId = companyId;
    }

    const unSyncedAssets = await Asset.find(query);
    let synced = 0;
    let failed = 0;

    for (const asset of unSyncedAssets) {
      try {
        const filePath = this.getAbsolutePath(asset.storageKey);
        if (fs.existsSync(filePath)) {
          const buffer = await fs.promises.readFile(filePath);
          const subfolder =
            asset.assetType === 'original'
              ? 'originals'
              : asset.assetType === 'processed'
              ? 'watermarked'
              : asset.assetType === 'logo'
              ? 'logos'
              : 'documents';
          const folder = `jewellery_watermark/${asset.companyId}/${subfolder}`;

          const uploadRes = await CloudinaryService.uploadBuffer({
            buffer,
            folder,
            filename: path.basename(asset.storageKey),
            resourceType: asset.mimeType?.startsWith('image/') ? 'image' : 'raw',
            tags: ['jewellery', asset.assetType, asset.companyId.toString()],
          });

          asset.url = uploadRes.secureUrl;
          asset.cloudinaryPublicId = uploadRes.publicId;
          asset.resourceType = uploadRes.resourceType;
          await asset.save();
          synced++;
        }
      } catch (err) {
        console.warn(`Sync asset ${asset._id} to Cloudinary failed:`, err);
        failed++;
      }
    }

    return { synced, failed };
  }
}

