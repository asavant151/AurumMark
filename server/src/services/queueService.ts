import fs from 'fs';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { Types } from 'mongoose';
import { ENV } from '../config/env.js';
import { ProcessingBatch, IProcessingBatch } from '../models/ProcessingBatch.js';
import { ProcessingItem } from '../models/ProcessingItem.js';
import { Design } from '../models/Design.js';
import { Asset } from '../models/Asset.js';
import { StorageService } from './storage.js';
import { ImageProcessorService } from './imageProcessor.js';
import { ActivityLogger } from './activityLogger.js';

let redisClient: Redis | null = null;
let processingQueue: Queue | null = null;
let processingWorker: Worker | null = null;
let isRedisAvailable = false;

// Attempt Redis connection
try {
  redisClient = new Redis(ENV.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      if (times > 2) return null;
      return Math.min(times * 100, 1000);
    },
    lazyConnect: true,
  });

  redisClient.on('error', () => {
    // Gracefully handled - fallback worker is engaged
  });

  redisClient.connect().then(() => {
    isRedisAvailable = true;
    console.log('[Queue] Redis connected successfully. Initializing BullMQ...');
    initBullQueue();
  }).catch(() => {
    console.log('[Queue] Redis is not reachable. Using robust in-process asynchronous batch worker.');
    isRedisAvailable = false;
  });
} catch (e) {
  console.log('[Queue] BullMQ init skipped. Using in-process batch worker.');
  isRedisAvailable = false;
}

function initBullQueue() {
  if (!redisClient) return;
  try {
    processingQueue = new Queue('watermark-queue', { connection: redisClient });
    processingWorker = new Worker(
      'watermark-queue',
      async (job: Job) => {
        await executeBatchProcessing(job.data.batchId);
      },
      { connection: redisClient, concurrency: 4 }
    );

    processingWorker.on('failed', (job, err) => {
      console.error(`[Queue] Job ${job?.id} failed with error:`, err);
    });
  } catch (err) {
    console.warn('[Queue] Failed to initialize BullMQ worker:', err);
    isRedisAvailable = false;
  }
}

/**
 * Worker logic to process a batch of jewellery designs item-by-item
 */
export async function executeBatchProcessing(batchId: string): Promise<void> {
  const batch = await ProcessingBatch.findById(batchId);
  if (!batch || batch.status === 'cancelled') {
    return;
  }

  batch.status = 'processing';
  batch.startedAt = new Date();
  await batch.save();

  const items = await ProcessingItem.find({ batchId: batch._id });
  const companyId = batch.companyId.toString();

  // Load logo buffer once if needed
  let logoBuffer: Buffer | undefined;
  if (batch.templateSnapshot.logoConfig?.enabled && batch.templateSnapshot.logoConfig.logoAssetId) {
    const logoAsset = await Asset.findOne({
      _id: batch.templateSnapshot.logoConfig.logoAssetId,
      companyId: batch.companyId,
    });
    if (logoAsset) {
      const logoPath = StorageService.getAbsolutePath(logoAsset.storageKey);
      if (fs.existsSync(logoPath)) {
        logoBuffer = await fs.promises.readFile(logoPath);
      }
    }
  }

  for (const item of items) {
    // Re-check batch cancellation status
    const currentBatch = await ProcessingBatch.findById(batchId).select('status');
    if (currentBatch?.status === 'cancelled') {
      await ProcessingItem.updateMany(
        { batchId: batch._id, status: 'pending' },
        { status: 'cancelled' }
      );
      break;
    }

    if (item.status === 'completed') {
      continue;
    }

    item.status = 'processing';
    item.startedAt = new Date();
    item.attempts += 1;
    await item.save();

    try {
      // 1. Fetch source asset and design with strict tenant check
      const sourceAsset = await Asset.findOne({
        _id: item.sourceAssetId,
        companyId: batch.companyId,
      });

      if (!sourceAsset) {
        throw new Error('Source asset not found or unauthorized');
      }

      const sourcePath = StorageService.getAbsolutePath(sourceAsset.storageKey);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file missing on disk: ${sourceAsset.storageKey}`);
      }

      const sourceBuffer = await fs.promises.readFile(sourcePath);

      // 2. Process image with Sharp
      const processedResult = await ImageProcessorService.processImage({
        inputBuffer: sourceBuffer,
        config: batch.templateSnapshot,
        outputSettings: batch.outputSettings,
        logoBuffer,
      });

      // 3. Save processed image as new asset
      const ext = batch.outputSettings.format === 'png' ? '.png' : batch.outputSettings.format === 'webp' ? '.webp' : '.jpg';
      const origBaseName = sourceAsset.originalFilename.replace(/\.[^/.]+$/, '');
      const processedFilename = `${origBaseName}_watermarked${ext}`;
      const mimeType = batch.outputSettings.format === 'png' ? 'image/png' : batch.outputSettings.format === 'webp' ? 'image/webp' : 'image/jpeg';

      const outputAsset = await StorageService.saveUploadedBuffer({
        companyId,
        buffer: processedResult.outputBuffer,
        originalFilename: processedFilename,
        mimeType,
        assetType: 'processed',
      });

      // 4. Update item
      item.outputAssetId = outputAsset._id as Types.ObjectId;
      item.status = 'completed';
      item.completedAt = new Date();
      await item.save();

      // 5. Update Design
      await Design.findOneAndUpdate(
        { _id: item.designId, companyId: batch.companyId },
        {
          $addToSet: { processedAssetIds: outputAsset._id },
          $set: {
            activeProcessedAssetId: outputAsset._id,
            processingStatus: 'processed',
          },
        }
      );

      // Increment batch completed counter
      await ProcessingBatch.findByIdAndUpdate(batchId, {
        $inc: { 'counters.completed': 1 },
      });
    } catch (err: any) {
      console.error(`Failed to process item ${item._id}:`, err);
      item.status = 'failed';
      item.errorDetails = err.message || 'Processing error';
      item.completedAt = new Date();
      await item.save();

      await Design.findOneAndUpdate(
        { _id: item.designId, companyId: batch.companyId },
        { $set: { processingStatus: 'failed' } }
      );

      // Increment batch failed counter
      await ProcessingBatch.findByIdAndUpdate(batchId, {
        $inc: { 'counters.failed': 1 },
      });
    }
  }

  // Finalize batch
  const finalBatch = await ProcessingBatch.findById(batchId);
  if (finalBatch && finalBatch.status !== 'cancelled') {
    const total = finalBatch.counters.total;
    const completed = finalBatch.counters.completed;
    const failed = finalBatch.counters.failed;

    if (failed === 0 && completed === total) {
      finalBatch.status = 'completed';
    } else if (completed > 0 && failed > 0) {
      finalBatch.status = 'completed_with_errors';
    } else if (failed === total) {
      finalBatch.status = 'failed';
    } else {
      finalBatch.status = 'completed';
    }

    finalBatch.completedAt = new Date();
    await finalBatch.save();

    await ActivityLogger.log({
      companyId: finalBatch.companyId,
      actorId: finalBatch.requestedBy,
      action: 'BATCH_COMPLETED',
      resourceType: 'batch',
      resourceId: finalBatch._id,
      metadata: {
        total,
        completed,
        failed,
        status: finalBatch.status,
      },
    });
  }
}

export class QueueService {
  /**
   * Enqueues a batch for background watermarking
   */
  static async enqueueBatch(batchId: string): Promise<void> {
    if (isRedisAvailable && processingQueue) {
      await processingQueue.add(
        'process-watermarks',
        { batchId },
        {
          attempts: 2,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        }
      );
    } else {
      // Execute asynchronously in background event loop without blocking HTTP request
      setImmediate(() => {
        executeBatchProcessing(batchId).catch((err) => {
          console.error(`[QueueService] In-process execution error for batch ${batchId}:`, err);
        });
      });
    }
  }

  /**
   * Retries failed items in a batch
   */
  static async retryBatch(batchId: string, companyId: string): Promise<IProcessingBatch> {
    const batch = await ProcessingBatch.findOne({ _id: batchId, companyId });
    if (!batch) {
      throw new Error('Batch not found');
    }

    // Reset failed items
    const failedItems = await ProcessingItem.find({ batchId: batch._id, status: 'failed' });
    if (failedItems.length === 0) {
      throw new Error('No failed items to retry');
    }

    await ProcessingItem.updateMany(
      { batchId: batch._id, status: 'failed' },
      { status: 'pending', errorDetails: null }
    );

    // Adjust counters
    batch.counters.failed = 0;
    batch.status = 'queued';
    await batch.save();

    await this.enqueueBatch(batch._id.toString());
    return batch;
  }

  /**
   * Cancels a running batch
   */
  static async cancelBatch(batchId: string, companyId: string): Promise<IProcessingBatch> {
    const batch = await ProcessingBatch.findOne({ _id: batchId, companyId });
    if (!batch) {
      throw new Error('Batch not found');
    }

    batch.status = 'cancelled';
    await batch.save();

    await ProcessingItem.updateMany(
      { batchId: batch._id, status: { $in: ['pending', 'processing'] } },
      { status: 'cancelled' }
    );

    return batch;
  }
}
