import mongoose, { Schema, Document, Types } from 'mongoose';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IExport extends Document {
  companyId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  selectedAssetIds: Types.ObjectId[];
  archiveAssetId?: Types.ObjectId;
  archiveStorageKey?: string;
  status: ExportStatus;
  fileCount: number;
  archiveSize?: number;
  downloadToken: string;
  expiresAt: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExportSchema = new Schema<IExport>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    selectedAssetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    archiveAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    archiveStorageKey: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    fileCount: { type: Number, default: 0 },
    archiveSize: { type: Number, default: 0 },
    downloadToken: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

ExportSchema.index({ companyId: 1, createdAt: -1 });

export const Export = mongoose.model<IExport>('Export', ExportSchema);
