import mongoose, { Schema, Document, Types } from 'mongoose';
import { IWatermarkConfiguration } from './WatermarkTemplate.js';

export type BatchStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled';

export interface IBatchOutputSettings {
  format: 'jpeg' | 'png' | 'webp';
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  stripMetadata: boolean;
}

export interface IBatchCounters {
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface IProcessingBatch extends Document {
  companyId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  templateId?: Types.ObjectId;
  templateSnapshot: IWatermarkConfiguration;
  outputSettings: IBatchOutputSettings;
  counters: IBatchCounters;
  status: BatchStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProcessingBatchSchema = new Schema<IProcessingBatch>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'WatermarkTemplate', default: null },
    templateSnapshot: { type: Schema.Types.Mixed, required: true },
    outputSettings: {
      format: { type: String, enum: ['jpeg', 'png', 'webp'], default: 'jpeg' },
      quality: { type: Number, default: 90 },
      maxWidth: { type: Number },
      maxHeight: { type: Number },
      stripMetadata: { type: Boolean, default: true },
    },
    counters: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: [
        'pending',
        'queued',
        'processing',
        'completed',
        'completed_with_errors',
        'failed',
        'cancelled',
      ],
      default: 'pending',
      index: true,
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

ProcessingBatchSchema.index({ companyId: 1, createdAt: -1 });

export const ProcessingBatch = mongoose.model<IProcessingBatch>(
  'ProcessingBatch',
  ProcessingBatchSchema
);
