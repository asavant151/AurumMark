import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Design } from '../models/Design.js';
import { Project } from '../models/Project.js';
import { WatermarkTemplate } from '../models/WatermarkTemplate.js';
import { ProcessingBatch } from '../models/ProcessingBatch.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Export } from '../models/Export.js';
import { Company } from '../models/Company.js';

export class DashboardController {
  /**
   * Get real dashboard metrics for the current company
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const companyId = new Types.ObjectId(req.user!.companyId);

      const [
        totalDesigns,
        processedDesigns,
        totalProjects,
        totalTemplates,
        activeBatches,
        failedBatches,
        totalExports,
        totalImageDownloads,
        company,
      ] = await Promise.all([
        Design.countDocuments({ companyId }),
        Design.countDocuments({ companyId, processingStatus: 'processed' }),
        Project.countDocuments({ companyId, status: 'active' }),
        WatermarkTemplate.countDocuments({ companyId }),
        ProcessingBatch.countDocuments({
          companyId,
          status: { $in: ['pending', 'queued', 'processing'] },
        }),
        ProcessingBatch.countDocuments({
          companyId,
          status: 'failed',
        }),
        Export.countDocuments({ companyId }),
        ActivityLog.countDocuments({ companyId, action: 'IMAGE_DOWNLOADED' }),
        Company.findById(companyId).select('storageQuota storageUsage name'),
      ]);

      const totalDownloads = totalExports + totalImageDownloads;
      const storageUsageBytes = company?.storageUsage || 0;
      const storageQuotaBytes = company?.storageQuota || 5 * 1024 * 1024 * 1024;
      const storagePercentage = Number(((storageUsageBytes / storageQuotaBytes) * 100).toFixed(1));

      res.status(200).json({
        success: true,
        data: {
          metrics: {
            totalUploadedImages: totalDesigns,
            totalProcessedImages: processedDesigns,
            totalProjects,
            savedTemplates: totalTemplates,
            activeProcessingJobs: activeBatches,
            failedJobs: failedBatches,
            recentDownloads: totalDownloads,
            storageUsageBytes,
            storageQuotaBytes,
            storagePercentage,
          },
        },
      });
    } catch (err) {
      console.error('Dashboard summary error:', err);
      res.status(500).json({ success: false, message: 'Failed to load dashboard metrics.' });
    }
  }

  /**
   * Get recent activity logs for company
   */
  static async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const logs = await ActivityLog.find({
        companyId: req.user!.companyId,
      })
        .populate('actorId', 'name email')
        .sort({ createdAt: -1 })
        .limit(25);

      res.status(200).json({ success: true, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to load activity logs.' });
    }
  }
}
