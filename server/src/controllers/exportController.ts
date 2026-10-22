import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Export } from '../models/Export.js';
import { Design } from '../models/Design.js';
import { Asset } from '../models/Asset.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { ExportService } from '../services/exportService.js';
import { StorageService } from '../services/storage.js';
import { ActivityLogger } from '../services/activityLogger.js';

const createExportSchema = z.object({
  assetIds: z.array(z.string()).optional(),
  projectId: z.string().optional(),
});

export class ExportController {
  /**
   * Request ZIP export of processed images
   */
  static async createExport(req: Request, res: Response): Promise<void> {
    try {
      // Permission checks
      if (req.user!.role === 'Viewer') {
        if (!req.company?.settings.allowViewerZipDownload) {
          res.status(403).json({
            success: false,
            message: 'Company policy does not allow Viewers to download ZIP archives.',
          });
          return;
        }
      }

      if (req.user!.role === 'Designer' && !req.membership!.permissions.canExportZip) {
        res.status(403).json({
          success: false,
          message: 'Designer is not authorized to export ZIP archives.',
        });
        return;
      }

      const parsed = createExportSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      let targetAssetIds: string[] = parsed.data.assetIds || [];

      // If projectId is provided, export all processed assets from that project
      if (parsed.data.projectId) {
        const designs = await Design.find({
          projectId: parsed.data.projectId,
          companyId: req.user!.companyId,
          activeProcessedAssetId: { $ne: null },
        });

        const projectAssetIds = designs
          .map((d) => d.activeProcessedAssetId?.toString())
          .filter(Boolean) as string[];

        targetAssetIds = Array.from(new Set([...targetAssetIds, ...projectAssetIds]));
      }

      if (targetAssetIds.length === 0) {
        res.status(400).json({ success: false, message: 'No eligible watermarked assets found to export.' });
        return;
      }

      const exportRecord = await ExportService.createZipExport({
        companyId: req.user!.companyId,
        requestedBy: req.user!.userId,
        assetIds: targetAssetIds,
      });

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'ZIP_EXPORT_REQUESTED',
        resourceType: 'export',
        resourceId: exportRecord._id,
        metadata: { fileCount: targetAssetIds.length },
        req,
      });

      res.status(202).json({
        success: true,
        message: 'ZIP export initiated.',
        data: exportRecord,
      });
    } catch (err: any) {
      console.error('Export creation error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to initiate export.' });
    }
  }

  /**
   * List exports for company
   */
  static async listExports(req: Request, res: Response): Promise<void> {
    try {
      const exports = await Export.find({
        companyId: req.user!.companyId,
      })
        .populate('requestedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(30);

      res.status(200).json({ success: true, data: exports });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch exports.' });
    }
  }

  /**
   * List single image downloads history
   */
  static async listSingleDownloads(req: Request, res: Response): Promise<void> {
    try {
      const logs = await ActivityLog.find({
        companyId: req.user!.companyId,
        action: 'IMAGE_DOWNLOADED',
      })
        .populate('actorId', 'name email')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Gather asset IDs from logs
      const assetIds = logs
        .map((l) => l.resourceId)
        .filter((id) => id && Types.ObjectId.isValid(id.toString()));

      const assets = await Asset.find({ _id: { $in: assetIds } }).lean();
      const assetMap = new Map(assets.map((a) => [a._id.toString(), a]));

      // Gather designs for these assets to fetch SKU
      const designs = await Design.find({
        companyId: req.user!.companyId,
        $or: [
          { activeProcessedAssetId: { $in: assetIds } },
          { originalAssetId: { $in: assetIds } },
        ],
      })
        .select('sku filename activeProcessedAssetId originalAssetId')
        .lean();

      const designSkuMap = new Map<string, string>();
      for (const d of designs) {
        if (d.activeProcessedAssetId) designSkuMap.set(d.activeProcessedAssetId.toString(), d.sku || '');
        if (d.originalAssetId) designSkuMap.set(d.originalAssetId.toString(), d.sku || '');
      }

      const formatted = logs.map((log) => {
        const assetIdStr = log.resourceId ? log.resourceId.toString() : '';
        const asset = assetMap.get(assetIdStr);
        const sku = designSkuMap.get(assetIdStr) || '';

        return {
          _id: log._id,
          assetId: assetIdStr,
          filename: asset?.originalFilename || log.metadata?.filename || 'jewellery_watermarked.jpg',
          fileSize: asset?.fileSize || 0,
          mimeType: asset?.mimeType || 'image/jpeg',
          assetType: asset?.assetType || 'processed',
          url: asset?.url || '',
          storageKey: asset?.storageKey || '',
          sku,
          downloadedBy: log.actorId,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt,
        };
      });

      res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      console.error('List single downloads error:', err);
      res.status(500).json({ success: false, message: 'Failed to fetch image download history.' });
    }
  }

  /**
   * Get single export status
   */
  static async getExportById(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;
      const exportRecord = await Export.findOne({
        _id: exportId,
        companyId: req.user!.companyId,
      });

      if (!exportRecord) {
        res.status(404).json({ success: false, message: 'Export record not found.' });
        return;
      }

      res.status(200).json({ success: true, data: exportRecord });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch export.' });
    }
  }

  /**
   * Download the generated ZIP file using valid token
   */
  static async downloadArchive(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const exportRecord = await Export.findOne({
        downloadToken: token,
        status: 'completed',
        expiresAt: { $gt: new Date() },
      });

      if (!exportRecord || !exportRecord.archiveStorageKey) {
        res.status(404).json({ success: false, message: 'Download link is invalid, expired, or archive not ready.' });
        return;
      }

      const exportDir = StorageService.getExportDir();
      const filePath = path.join(exportDir, exportRecord.archiveStorageKey);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'Archive file has been purged from server.' });
        return;
      }

      const clientFilename = `jewellery_watermarked_export_${Date.now()}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${clientFilename}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Download archive error.' });
    }
  }
}
