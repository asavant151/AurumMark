import mongoose, { Schema, Document, Types } from 'mongoose';

export type ItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface IProcessingItem extends Document {
  companyId: Types.ObjectId;
  batchId: Types.ObjectId;
  designId: Types.ObjectId;
  sourceAssetId: Types.ObjectId;
  outputAssetId?: Types.ObjectId;
  status: ItemStatus;
  attempts: number;
  errorDetails?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProcessingItemSchema = new Schema<IProcessingItem>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'ProcessingBatch', required: true, index: true },
    designId: { type: Schema.Types.ObjectId, ref: 'Design', required: true, index: true },
    sourceAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    outputAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    errorDetails: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProcessingItemSchema.index({ batchId: 1, status: 1 });
ProcessingItemSchema.index({ companyId: 1, designId: 1 });

export const ProcessingItem = mongoose.model<IProcessingItem>(
  'ProcessingItem',
  ProcessingItemSchema
);
