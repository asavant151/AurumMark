import mongoose, { Schema, Document, Types } from 'mongoose';

export type DesignUploadStatus = 'completed' | 'failed';
export type DesignProcessingStatus = 'unprocessed' | 'processing' | 'processed' | 'failed';

export interface IDesignMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  aspectRatio?: number;
}

export interface IDesign extends Document {
  companyId: Types.ObjectId;
  projectId?: Types.ObjectId;
  originalAssetId: Types.ObjectId;
  processedAssetIds: Types.ObjectId[];
  activeProcessedAssetId?: Types.ObjectId;
  filename: string;
  sku?: string;
  tags: string[];
  metadata: IDesignMetadata;
  uploadedBy: Types.ObjectId;
  uploadStatus: DesignUploadStatus;
  processingStatus: DesignProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DesignSchema = new Schema<IDesign>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    originalAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    processedAssetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    activeProcessedAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    filename: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true }],
    metadata: {
      width: { type: Number },
      height: { type: Number },
      format: { type: String },
      size: { type: Number },
      aspectRatio: { type: Number },
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadStatus: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
      index: true,
    },
    processingStatus: {
      type: String,
      enum: ['unprocessed', 'processing', 'processed', 'failed'],
      default: 'unprocessed',
      index: true,
    },
  },
  { timestamps: true }
);

DesignSchema.index({ companyId: 1, projectId: 1, createdAt: -1 });
DesignSchema.index({ companyId: 1, sku: 1 });
DesignSchema.index({ companyId: 1, processingStatus: 1 });

export const Design = mongoose.model<IDesign>('Design', DesignSchema);
