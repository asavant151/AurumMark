import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import sharp from 'sharp';
import { Design } from '../models/Design.js';
import { Asset } from '../models/Asset.js';
import { StorageService } from '../services/storage.js';
import { ActivityLogger } from '../services/activityLogger.js';

const updateDesignSchema = z.object({
  sku: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional().nullable(),
});

export class DesignController {
  /**
   * List all designs for current company with filtering, search, and pagination
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const {
        projectId,
        processingStatus,
        search,
        tag,
        page = '1',
        limit = '50',
      } = req.query;

      const filter: any = { companyId: req.user!.companyId };

      if (projectId) {
        filter.projectId = projectId;
      }
      if (processingStatus && processingStatus !== 'all') {
        filter.processingStatus = processingStatus;
      }
      if (tag) {
        filter.tags = tag;
      }
      if (search) {
        filter.$or = [
          { filename: { $regex: search as string, $options: 'i' } },
          { sku: { $regex: search as string, $options: 'i' } },
        ];
      }

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
      const skip = (pageNum - 1) * limitNum;

      const [designs, total] = await Promise.all([
        Design.find(filter)
          .populate('originalAssetId')
          .populate('activeProcessedAssetId')
          .populate('projectId', 'name')
          .populate('uploadedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Design.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: designs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch jewellery designs.' });
    }
  }

  /**
   * Upload multiple jewellery images
   */
  static async upload(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers are not permitted to upload images.' });
        return;
      }

      if (req.user!.role === 'Designer' && !req.membership!.permissions.canUpload) {
        res.status(403).json({ success: false, message: 'Designer is not authorized to upload images.' });
        return;
      }

      const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
      if (files.length === 0) {
        res.status(400).json({ success: false, message: 'No image files provided.' });
        return;
      }

      const { projectId, skuPrefix, tags } = req.body;
      const parsedTags = tags ? (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : tags) : [];

      const createdDesigns = [];
      const companyId = req.user!.companyId;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Read metadata via sharp
        const meta = await sharp(file.buffer).metadata();

        // Save original asset buffer
        const originalAsset = await StorageService.saveUploadedBuffer({
          companyId,
          buffer: file.buffer,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          assetType: 'original',
        });

        // Generate SKU if provided or auto-generate
        const baseName = file.originalname.replace(/\.[^/.]+$/, '');
        const sku = skuPrefix ? `${skuPrefix}-${String(i + 1).padStart(3, '0')}` : `SKU-${Date.now().toString().slice(-6)}-${i + 1}`;

        const design = await Design.create({
          companyId: new Types.ObjectId(companyId),
          projectId: projectId ? new Types.ObjectId(projectId) : null,
          originalAssetId: originalAsset._id,
          processedAssetIds: [],
          activeProcessedAssetId: null,
          filename: file.originalname,
          sku,
          tags: parsedTags,
          metadata: {
            width: meta.width,
            height: meta.height,
            format: meta.format,
            size: file.size,
            aspectRatio: meta.width && meta.height ? Number((meta.width / meta.height).toFixed(2)) : 1,
          },
          uploadedBy: new Types.ObjectId(req.user!.userId),
          uploadStatus: 'completed',
          processingStatus: 'unprocessed',
        });

        createdDesigns.push(design);
      }

      await ActivityLogger.log({
        companyId,
        actorId: req.user!.userId,
        action: 'IMAGES_UPLOADED',
        resourceType: 'design',
        metadata: { count: files.length },
        req,
      });

      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${createdDesigns.length} jewellery images.`,
        data: createdDesigns,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ success: false, message: err.message || 'Image upload failed.' });
    }
  }

  /**
   * Get single design details
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { designId } = req.params;
      const design = await Design.findOne({
        _id: designId,
        companyId: req.user!.companyId,
      })
        .populate('originalAssetId')
        .populate('activeProcessedAssetId')
        .populate('processedAssetIds')
        .populate('projectId')
        .populate('uploadedBy', 'name email');

      if (!design) {
        res.status(404).json({ success: false, message: 'Design not found.' });
        return;
      }

      res.status(200).json({ success: true, data: design });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch design.' });
    }
  }

  /**
   * Update design metadata
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot modify designs.' });
        return;
      }

      const { designId } = req.params;
      const parsed = updateDesignSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const design = await Design.findOneAndUpdate(
        { _id: designId, companyId: req.user!.companyId },
        { $set: parsed.data },
        { new: true }
      );

      if (!design) {
        res.status(404).json({ success: false, message: 'Design not found.' });
        return;
      }

      res.status(200).json({ success: true, data: design, message: 'Design updated.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to update design.' });
    }
  }

  /**
   * Delete design and associated assets
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot delete designs.' });
        return;
      }

      if (req.user!.role === 'Designer' && !req.membership!.permissions.canDeleteDesign) {
        res.status(403).json({ success: false, message: 'Designer is not authorized to delete designs.' });
        return;
      }

      const { designId } = req.params;
      const design = await Design.findOne({
        _id: designId,
        companyId: req.user!.companyId,
      });

      if (!design) {
        res.status(404).json({ success: false, message: 'Design not found.' });
        return;
      }

      // Collect assets to delete
      const assetIdsToDelete = [design.originalAssetId, ...(design.processedAssetIds || [])];
      const assets = await Asset.find({ _id: { $in: assetIdsToDelete }, companyId: req.user!.companyId });

      for (const asset of assets) {
        await StorageService.deleteAsset(asset);
      }

      await Design.deleteOne({ _id: design._id });

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'DESIGN_DELETED',
        resourceType: 'design',
        resourceId: designId,
        req,
      });

      res.status(200).json({ success: true, message: 'Design and assets removed successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to delete design.' });
    }
  }
}
