import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { ProcessingBatch } from '../models/ProcessingBatch.js';
import { ProcessingItem } from '../models/ProcessingItem.js';
import { Design } from '../models/Design.js';
import { WatermarkTemplate } from '../models/WatermarkTemplate.js';
import { QueueService } from '../services/queueService.js';
import { ActivityLogger } from '../services/activityLogger.js';

const startBatchSchema = z.object({
  designIds: z.array(z.string()).min(1),
  templateId: z.string().optional(),
  templateSnapshot: z.any().optional(),
  outputSettings: z.object({
    format: z.enum(['jpeg', 'png', 'webp']).default('jpeg'),
    quality: z.number().min(10).max(100).default(90),
    maxWidth: z.number().optional(),
    maxHeight: z.number().optional(),
    stripMetadata: z.boolean().default(true),
  }).optional(),
});

export class ProcessingController {
  /**
   * Create and trigger a new bulk watermark processing batch
   */
  static async createBatch(req: Request, res: Response): Promise<void> {
    try {
      // STRICT ROLE RULE: Viewers cannot initiate processing jobs
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot start image processing jobs.' });
        return;
      }

      if (req.user!.role === 'Designer' && !req.membership!.permissions.canProcess) {
        res.status(403).json({ success: false, message: 'Designer is not authorized to process images.' });
        return;
      }

      const parsed = startBatchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const { designIds, templateId, templateSnapshot: inlineSnapshot, outputSettings } = parsed.data;

      // Validate and load template snapshot
      let finalSnapshot = inlineSnapshot;
      if (!finalSnapshot && templateId) {
        const tmpl = await WatermarkTemplate.findOne({
          _id: templateId,
          companyId: req.user!.companyId,
        });
        if (!tmpl) {
          res.status(404).json({ success: false, message: 'Watermark template not found.' });
          return;
        }
        finalSnapshot = tmpl.configuration;
      }

      if (!finalSnapshot) {
        res.status(400).json({ success: false, message: 'Template ID or configuration snapshot is required.' });
        return;
      }

      // Fetch designs strictly belonging to this company
      const designs = await Design.find({
        _id: { $in: designIds.map((id) => new Types.ObjectId(id)) },
        companyId: req.user!.companyId,
      });

      if (designs.length === 0) {
        res.status(400).json({ success: false, message: 'No valid company designs selected for processing.' });
        return;
      }

      // Merge output settings with company defaults
      const finalOutputSettings = {
        format: outputSettings?.format || req.company?.settings.defaultOutputFormat || 'jpeg',
        quality: outputSettings?.quality || req.company?.settings.defaultQuality || 90,
        maxWidth: outputSettings?.maxWidth,
        maxHeight: outputSettings?.maxHeight,
        stripMetadata: outputSettings?.stripMetadata ?? req.company?.settings.sanitizeMetadata ?? true,
      };

      // Create ProcessingBatch
      const batch = await ProcessingBatch.create({
        companyId: new Types.ObjectId(req.user!.companyId),
        requestedBy: new Types.ObjectId(req.user!.userId),
        templateId: templateId ? new Types.ObjectId(templateId) : null,
        templateSnapshot: finalSnapshot,
        outputSettings: finalOutputSettings,
        counters: {
          total: designs.length,
          completed: 0,
          failed: 0,
          cancelled: 0,
        },
        status: 'queued',
      });

      // Create ProcessingItem records
      const itemDocs = designs.map((d) => ({
        companyId: new Types.ObjectId(req.user!.companyId),
        batchId: batch._id,
        designId: d._id,
        sourceAssetId: d.originalAssetId,
        status: 'pending',
        attempts: 0,
      }));

      await ProcessingItem.insertMany(itemDocs);

      // Enqueue job for background processing
      await QueueService.enqueueBatch(batch._id.toString());

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'BATCH_STARTED',
        resourceType: 'batch',
        resourceId: batch._id,
        metadata: { imageCount: designs.length },
        req,
      });

      res.status(201).json({
        success: true,
        message: `Batch queued with ${designs.length} images for watermarking.`,
        data: batch,
      });
    } catch (err: any) {
      console.error('Create batch error:', err);
      res.status(500).json({ success: false, message: 'Failed to start watermark batch.' });
    }
  }

  /**
   * List all processing batches for company
   */
  static async listBatches(req: Request, res: Response): Promise<void> {
    try {
      const batches = await ProcessingBatch.find({
        companyId: req.user!.companyId,
      })
        .populate('requestedBy', 'name email')
        .populate('templateId', 'name')
        .sort({ createdAt: -1 })
        .limit(50);

      res.status(200).json({ success: true, data: batches });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch processing batches.' });
    }
  }

  /**
   * Get single batch status and items
   */
  static async getBatchById(req: Request, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      const batch = await ProcessingBatch.findOne({
        _id: batchId,
        companyId: req.user!.companyId,
      })
        .populate('requestedBy', 'name email')
        .populate('templateId', 'name');

      if (!batch) {
        res.status(404).json({ success: false, message: 'Batch not found.' });
        return;
      }

      const items = await ProcessingItem.find({ batchId: batch._id })
        .populate('designId', 'filename sku metadata')
        .populate('sourceAssetId')
        .populate('outputAssetId')
        .sort({ createdAt: 1 });

      res.status(200).json({
        success: true,
        data: {
          batch,
          items,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch batch details.' });
    }
  }

  /**
   * Retry failed items in batch
   */
  static async retryBatch(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot trigger retries.' });
        return;
      }

      const { batchId } = req.params;
      const updatedBatch = await QueueService.retryBatch(batchId, req.user!.companyId);

      res.status(200).json({
        success: true,
        message: 'Batch retry initiated.',
        data: updatedBatch,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Retry failed.' });
    }
  }

  /**
   * Cancel batch
   */
  static async cancelBatch(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot cancel batches.' });
        return;
      }

      const { batchId } = req.params;
      const cancelledBatch = await QueueService.cancelBatch(batchId, req.user!.companyId);

      res.status(200).json({
        success: true,
        message: 'Batch cancelled.',
        data: cancelledBatch,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Cancel failed.' });
    }
  }
}
