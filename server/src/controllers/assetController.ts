import fs from 'fs';
import { Request, Response } from 'express';
import { Asset } from '../models/Asset.js';
import { StorageService } from '../services/storage.js';
import { ActivityLogger } from '../services/activityLogger.js';

export class AssetController {
  /**
   * Securely stream asset for in-app viewing (preview / editor / thumbnails)
   */
  static async viewAsset(req: Request, res: Response): Promise<void> {
    try {
      const { assetId } = req.params;
      const query: any = { _id: assetId };
      if (req.user?.companyId) {
        query.companyId = req.user.companyId;
      }

      const asset = await Asset.findOne(query);

      if (!asset) {
        res.status(404).json({ success: false, message: 'Asset not found or unauthorized.' });
        return;
      }

      // If Cloudinary URL is available and local stream not requested, redirect directly to CDN
      if (asset.url && !req.query.local) {
        res.redirect(asset.url);
        return;
      }

      const filePath = StorageService.getAbsolutePath(asset.storageKey);
      if (!fs.existsSync(filePath)) {
        if (asset.url) {
          res.redirect(asset.url);
          return;
        }
        res.status(404).json({ success: false, message: 'File not found on storage.' });
        return;
      }

      res.setHeader('Content-Type', asset.mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400'); // 1 day client cache
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to stream asset.' });
    }
  }

  /**
   * Download individual image
   */
  static async downloadAsset(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        if (!req.company?.settings.allowViewerDownload) {
          res.status(403).json({
            success: false,
            message: 'Company policy does not permit Viewers to download individual images.',
          });
          return;
        }
      }

      const { assetId } = req.params;
      const asset = await Asset.findOne({
        _id: assetId,
        companyId: req.user!.companyId,
      });

      if (!asset) {
        res.status(404).json({ success: false, message: 'Asset not found or unauthorized.' });
        return;
      }

      const filePath = StorageService.getAbsolutePath(asset.storageKey);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'File missing on storage.' });
        return;
      }

      const safeFilename = asset.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'IMAGE_DOWNLOADED',
        resourceType: 'design',
        resourceId: asset._id,
        metadata: { filename: asset.originalFilename },
        req,
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Download failed.' });
    }
  }
}
