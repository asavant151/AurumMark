import { Request, Response } from 'express';
import { StorageService } from '../services/storage.js';
import { ActivityLogger } from '../services/activityLogger.js';
import { Company } from '../models/Company.js';
import { CloudinaryService } from '../services/cloudinaryService.js';

export class UploadController {
  /**
   * Upload Document (PDF certificates, invoices, hallmarking files, appraisal sheets)
   */
  static async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot upload documents.' });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      if (files.length === 0) {
        res.status(400).json({ success: false, message: 'No document file provided.' });
        return;
      }

      const companyId = req.user!.companyId;
      const uploadedAssets = [];

      for (const file of files) {
        const asset = await StorageService.saveUploadedBuffer({
          companyId,
          buffer: file.buffer,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          assetType: 'document',
        });

        uploadedAssets.push({
          id: asset._id,
          filename: asset.originalFilename,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          url: asset.url || `/api/v1/assets/${asset._id}/view`,
          cloudinaryPublicId: asset.cloudinaryPublicId,
          createdAt: asset.createdAt,
        });
      }

      await ActivityLogger.log({
        companyId,
        actorId: req.user!.userId,
        action: 'DOCUMENTS_UPLOADED',
        resourceType: 'company',
        resourceId: companyId,
        metadata: { count: files.length, filenames: files.map(f => f.originalname) },
        req,
      });

      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${uploadedAssets.length} document(s).`,
        data: uploadedAssets,
      });
    } catch (err: any) {
      console.error('Document upload error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to upload document.' });
    }
  }

  /**
   * Upload Company Branding Logo
   */
  static async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot upload logo watermark.' });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'Logo image file required.' });
        return;
      }

      const companyId = req.user!.companyId;
      const asset = await StorageService.saveUploadedBuffer({
        companyId,
        buffer: file.buffer,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        assetType: 'logo',
      });

      if (req.user!.role === 'Company') {
        await Company.findByIdAndUpdate(companyId, {
          logoAssetId: asset._id,
        });
      }

      await ActivityLogger.log({
        companyId,
        actorId: req.user!.userId,
        action: 'LOGO_UPDATED',
        resourceType: 'company',
        resourceId: companyId,
        metadata: { assetId: asset._id, filename: file.originalname },
        req,
      });

      res.status(200).json({
        success: true,
        message: 'Company logo uploaded and updated successfully.',
        data: {
          assetId: asset._id,
          url: asset.url || `/api/v1/assets/${asset._id}/view`,
          width: asset.width,
          height: asset.height,
        },
      });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to upload logo.' });
    }
  }

  /**
   * Check Cloudinary status
   */
  static async getCloudinaryStatus(req: Request, res: Response): Promise<void> {
    const isConfigured = CloudinaryService.isConfigured();
    res.status(200).json({
      success: true,
      data: {
        configured: isConfigured,
        provider: isConfigured ? 'cloudinary' : 'local',
        cloudName: isConfigured ? (process.env.CLOUDINARY_CLOUD_NAME || 'configured') : null,
      },
    });
  }

  /**
   * Trigger sync of local assets to Cloudinary
   */
  static async syncCloudinary(req: Request, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const result = await StorageService.syncLocalAssetsToCloudinary(companyId);
      res.status(200).json({
        success: true,
        message: `Synced ${result.synced} images to Cloudinary.`,
        data: result,
      });
    } catch (err: any) {
      console.error('Cloudinary sync error:', err);
      res.status(500).json({ success: false, message: err.message || 'Sync failed.' });
    }
  }
}
