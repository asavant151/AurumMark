import fs from 'fs';
import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { WatermarkTemplate } from '../models/WatermarkTemplate.js';
import { Asset } from '../models/Asset.js';
import { StorageService } from '../services/storage.js';
import { ImageProcessorService } from '../services/imageProcessor.js';
import { ActivityLogger } from '../services/activityLogger.js';

const watermarkConfigSchema = z.object({
  watermarkType: z.enum(['text', 'logo', 'combined', 'tiled']),
  positionPreset: z.enum([
    'top-left',
    'top-center',
    'top-right',
    'center-left',
    'center',
    'center-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
    'custom',
  ]),
  scalingPolicy: z.enum(['relative', 'fixed', 'contain', 'cover']).default('relative'),
  marginPercent: z.number().min(0).max(0.5).default(0.04),
  textConfig: z.object({
    enabled: z.boolean(),
    text: z.string().default(''),
    fontFamily: z.enum(['Outfit', 'Poppins']).default('Outfit'),
    fontSizeRatio: z.number().default(0.045),
    fontWeight: z.enum(['300', '400', '500', '600', '700', '800']).default('600'),
    color: z.string().default('#FFFFFF'),
    opacity: z.number().min(0).max(1).default(0.85),
    rotation: z.number().default(0),
    letterSpacing: z.number().default(2),
    alignment: z.enum(['left', 'center', 'right']).default('center'),
    normalizedX: z.number().min(0).max(1).default(0.85),
    normalizedY: z.number().min(0).max(1).default(0.9),
    stroke: z.object({ color: z.string(), width: z.number() }).optional(),
    shadow: z.object({ color: z.string(), blur: z.number(), offsetX: z.number(), offsetY: z.number() }).optional(),
  }),
  logoConfig: z.object({
    enabled: z.boolean(),
    logoAssetId: z.string().optional().nullable(),
    logoUrl: z.string().optional(),
    scaleRatio: z.number().default(0.15),
    opacity: z.number().min(0).max(1).default(0.85),
    rotation: z.number().default(0),
    normalizedX: z.number().min(0).max(1).default(0.85),
    normalizedY: z.number().min(0).max(1).default(0.85),
  }),
  tiledConfig: z.object({
    enabled: z.boolean(),
    text: z.string().optional(),
    fontFamily: z.enum(['Outfit', 'Poppins']).optional(),
    fontSizeRatio: z.number().optional(),
    opacity: z.number().optional(),
    angle: z.number().optional(),
    spacingX: z.number().optional(),
    spacingY: z.number().optional(),
    color: z.string().optional(),
  }),
});

const createTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  watermarkType: z.enum(['text', 'logo', 'combined', 'tiled']),
  configuration: watermarkConfigSchema,
  isDefault: z.boolean().optional(),
});

export class TemplateController {
  /**
   * List all watermark templates for current company
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const templates = await WatermarkTemplate.find({
        companyId: req.user!.companyId,
      })
        .populate('createdBy', 'name email')
        .sort({ isDefault: -1, updatedAt: -1 });

      res.status(200).json({ success: true, data: templates });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch watermark templates.' });
    }
  }

  /**
   * Create a new watermark template
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot create watermark templates.' });
        return;
      }

      if (req.user!.role === 'Designer' && !req.membership!.permissions.canCreateTemplate) {
        res.status(403).json({ success: false, message: 'Designer is not authorized to create templates.' });
        return;
      }

      const parsed = createTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const { name, description, watermarkType, configuration, isDefault } = parsed.data;

      // If isDefault is true, unset other defaults
      if (isDefault) {
        await WatermarkTemplate.updateMany(
          { companyId: req.user!.companyId },
          { $set: { isDefault: false } }
        );
      }

      const template = await WatermarkTemplate.create({
        companyId: new Types.ObjectId(req.user!.companyId),
        name: name.trim(),
        description: description || '',
        watermarkType,
        configuration,
        version: 1,
        isDefault: Boolean(isDefault),
        createdBy: new Types.ObjectId(req.user!.userId),
        updatedBy: new Types.ObjectId(req.user!.userId),
      });

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'TEMPLATE_CREATED',
        resourceType: 'template',
        resourceId: template._id,
        metadata: { name: template.name },
        req,
      });

      res.status(201).json({ success: true, data: template, message: 'Watermark template saved.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to create template.' });
    }
  }

  /**
   * Get template by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const template = await WatermarkTemplate.findOne({
        _id: templateId,
        companyId: req.user!.companyId,
      }).populate('createdBy updatedBy', 'name email');

      if (!template) {
        res.status(404).json({ success: false, message: 'Watermark template not found.' });
        return;
      }

      res.status(200).json({ success: true, data: template });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch template.' });
    }
  }

  /**
   * Update template
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot modify templates.' });
        return;
      }

      if (req.user!.role === 'Designer' && !req.membership!.permissions.canEditTemplate) {
        res.status(403).json({ success: false, message: 'Designer is not authorized to edit templates.' });
        return;
      }

      const { templateId } = req.params;
      const parsed = createTemplateSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const template = await WatermarkTemplate.findOne({
        _id: templateId,
        companyId: req.user!.companyId,
      });

      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found.' });
        return;
      }

      if (parsed.data.isDefault) {
        await WatermarkTemplate.updateMany(
          { companyId: req.user!.companyId, _id: { $ne: template._id } },
          { $set: { isDefault: false } }
        );
      }

      if (parsed.data.name) template.name = parsed.data.name;
      if (parsed.data.description !== undefined) template.description = parsed.data.description;
      if (parsed.data.watermarkType) template.watermarkType = parsed.data.watermarkType;
      if (parsed.data.configuration) {
        template.configuration = parsed.data.configuration as any;
        template.version += 1; // Increment version on config change
      }
      if (parsed.data.isDefault !== undefined) template.isDefault = parsed.data.isDefault;
      template.updatedBy = new Types.ObjectId(req.user!.userId);

      await template.save();

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'TEMPLATE_UPDATED',
        resourceType: 'template',
        resourceId: template._id,
        metadata: { version: template.version },
        req,
      });

      res.status(200).json({ success: true, data: template, message: 'Template updated.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to update template.' });
    }
  }

  /**
   * Duplicate template
   */
  static async duplicate(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot duplicate templates.' });
        return;
      }

      const { templateId } = req.params;
      const original = await WatermarkTemplate.findOne({
        _id: templateId,
        companyId: req.user!.companyId,
      });

      if (!original) {
        res.status(404).json({ success: false, message: 'Original template not found.' });
        return;
      }

      const duplicated = await WatermarkTemplate.create({
        companyId: original.companyId,
        name: `${original.name} (Copy)`,
        description: original.description,
        watermarkType: original.watermarkType,
        configuration: original.configuration,
        version: 1,
        isDefault: false,
        createdBy: new Types.ObjectId(req.user!.userId),
        updatedBy: new Types.ObjectId(req.user!.userId),
      });

      res.status(201).json({ success: true, data: duplicated, message: 'Template duplicated successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to duplicate template.' });
    }
  }

  /**
   * Delete template
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role === 'Viewer') {
        res.status(403).json({ success: false, message: 'Viewers cannot delete templates.' });
        return;
      }

      const { templateId } = req.params;
      const template = await WatermarkTemplate.findOneAndDelete({
        _id: templateId,
        companyId: req.user!.companyId,
      });

      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Template deleted.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to delete template.' });
    }
  }

  /**
   * Live preview on server with Sharp for parity verification
   */
  static async preview(req: Request, res: Response): Promise<void> {
    try {
      const { assetId, configuration } = req.body;
      if (!assetId || !configuration) {
        res.status(400).json({ success: false, message: 'Asset ID and configuration are required for preview.' });
        return;
      }

      const asset = await Asset.findOne({
        _id: assetId,
        companyId: req.user!.companyId,
      });

      if (!asset) {
        res.status(404).json({ success: false, message: 'Asset not found.' });
        return;
      }

      const assetPath = StorageService.getAbsolutePath(asset.storageKey);
      if (!fs.existsSync(assetPath)) {
        res.status(404).json({ success: false, message: 'File missing on storage.' });
        return;
      }

      const inputBuffer = await fs.promises.readFile(assetPath);

      // Load logo if configured
      let logoBuffer: Buffer | undefined;
      if (configuration.logoConfig?.enabled && configuration.logoConfig.logoAssetId) {
        const logoAsset = await Asset.findOne({
          _id: configuration.logoConfig.logoAssetId,
          companyId: req.user!.companyId,
        });
        if (logoAsset) {
          const logoPath = StorageService.getAbsolutePath(logoAsset.storageKey);
          if (fs.existsSync(logoPath)) {
            logoBuffer = await fs.promises.readFile(logoPath);
          }
        }
      }

      const processed = await ImageProcessorService.processImage({
        inputBuffer,
        config: configuration,
        outputSettings: {
          format: 'jpeg',
          quality: 85,
          maxWidth: 1200, // Quick preview bounds
          stripMetadata: true,
        },
        logoBuffer,
      });

      const base64Uri = `data:image/jpeg;base64,${processed.outputBuffer.toString('base64')}`;

      res.status(200).json({
        success: true,
        data: {
          previewUrl: base64Uri,
          width: processed.width,
          height: processed.height,
        },
      });
    } catch (err: any) {
      console.error('Preview error:', err);
      res.status(500).json({ success: false, message: err.message || 'Preview generation failed.' });
    }
  }
}
