import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import { Types } from 'mongoose';
import { Export, IExport } from '../models/Export.js';
import { Asset, IAsset } from '../models/Asset.js';
import { StorageService } from './storage.js';

export class ExportService {
  /**
   * Sanitizes a filename to avoid path traversal and illegal characters
   */
  static sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .trim();
  }

  /**
   * Builds a streaming ZIP archive from authorized company assets
   */
  static async createZipExport(params: {
    companyId: string;
    requestedBy: string;
    assetIds: string[];
  }): Promise<IExport> {
    const { companyId, requestedBy, assetIds } = params;

    // Fetch assets strictly scoped to this company
    const assets = await Asset.find({
      _id: { $in: assetIds.map((id) => new Types.ObjectId(id)) },
      companyId: new Types.ObjectId(companyId),
      lifecycleStatus: 'active',
    });

    if (assets.length === 0) {
      throw new Error('No valid assets found for export');
    }

    // Generate random secure download token and archive filename
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const exportDir = StorageService.getExportDir();
    const archiveFilename = `export_${companyId}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.zip`;
    const archivePath = path.join(exportDir, archiveFilename);

    // Set expiry to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create Export record in 'pending' status
    const exportRecord = await Export.create({
      companyId: new Types.ObjectId(companyId),
      requestedBy: new Types.ObjectId(requestedBy),
      selectedAssetIds: assets.map((a) => a._id),
      archiveStorageKey: archiveFilename,
      status: 'pending',
      fileCount: assets.length,
      downloadToken,
      expiresAt,
    });

    // Run streaming compression and await so archive is immediately ready for download
    try {
      await this.streamZipArchive({
        exportRecord,
        assets,
        archivePath,
      });
    } catch (err: any) {
      console.error('ZIP generation failed:', err);
      exportRecord.status = 'failed';
      exportRecord.errorMessage = err.message || 'ZIP compression failed';
      await exportRecord.save();
    }

    return exportRecord;
  }

  private static async streamZipArchive(params: {
    exportRecord: IExport;
    assets: IAsset[];
    archivePath: string;
  }): Promise<void> {
    const { exportRecord, assets, archivePath } = params;

    exportRecord.status = 'processing';
    await exportRecord.save();

    const output = fs.createWriteStream(archivePath);
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Balanced compression
    });

    return new Promise<void>((resolve, reject) => {
      output.on('close', async () => {
        try {
          const stats = fs.statSync(archivePath);
          exportRecord.archiveSize = stats.size;
          exportRecord.status = 'completed';
          await exportRecord.save();
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      output.on('error', (err) => reject(err));
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      // Track duplicate filenames and check if export contains both original & processed
      const filenameCounts = new Map<string, number>();
      const hasBothTypes =
        assets.some((a) => a.assetType === 'original') &&
        assets.some((a) => a.assetType === 'processed');

      (async () => {
        try {
          for (const asset of assets) {
            const filePath = StorageService.getAbsolutePath(asset.storageKey);
            let baseName = this.sanitizeFilename(asset.originalFilename || 'jewellery_image');
            const ext = path.extname(baseName) || (asset.mimeType === 'image/png' ? '.png' : '.jpg');
            const nameWithoutExt = path.basename(baseName, ext);

            const folderPrefix = hasBothTypes
              ? asset.assetType === 'original'
                ? 'originals/'
                : 'watermarked/'
              : '';

            const uniqueKey = `${folderPrefix}${baseName}`;
            const count = filenameCounts.get(uniqueKey) || 0;
            filenameCounts.set(uniqueKey, count + 1);

            const entryFilename = count > 0 ? `${nameWithoutExt}_${count}${ext}` : baseName;
            const archiveEntryName = `${folderPrefix}${entryFilename}`;

            if (fs.existsSync(filePath)) {
              archive.file(filePath, { name: archiveEntryName });
            } else if (asset.url) {
              try {
                const resp = await fetch(asset.url);
                if (resp.ok) {
                  const arrayBuf = await resp.arrayBuffer();
                  archive.append(Buffer.from(arrayBuf), { name: archiveEntryName });
                }
              } catch (e) {
                console.warn(`Could not fetch remote asset for zip: ${asset.url}`);
              }
            }
          }
          archive.finalize();
        } catch (err) {
          archive.abort();
          reject(err);
        }
      })();
    });
  }

  /**
   * Cleanup routine to remove expired zip archives from disk
   */
  static async cleanupExpiredExports(): Promise<void> {
    try {
      const now = new Date();
      const expiredList = await Export.find({
        expiresAt: { $lt: now },
        archiveStorageKey: { $ne: null },
      });

      const exportDir = StorageService.getExportDir();
      for (const exp of expiredList) {
        if (exp.archiveStorageKey) {
          const fullPath = path.join(exportDir, exp.archiveStorageKey);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (e) {
              // Ignore unlink errors
            }
          }
        }
      }

      await Export.deleteMany({ expiresAt: { $lt: now } });
    } catch (err) {
      console.error('Error cleaning up expired exports:', err);
    }
  }
}
