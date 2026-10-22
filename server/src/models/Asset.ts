import mongoose, { Schema, Document, Types } from 'mongoose';

export type AssetType = 'original' | 'processed' | 'logo' | 'thumbnail' | 'export_zip' | 'document';
export type AssetLifecycleStatus = 'active' | 'archived' | 'deleted';

export interface IAsset extends Document {
  companyId: Types.ObjectId;
  storageKey: string;
  originalFilename: string;
  assetType: AssetType;
  mimeType: string;
  fileSize: number;
  checksum: string;
  width?: number;
  height?: number;
  url?: string;
  cloudinaryPublicId?: string;
  resourceType?: string;
  lifecycleStatus: AssetLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    storageKey: { type: String, required: true },
    originalFilename: { type: String, required: true },
    assetType: {
      type: String,
      enum: ['original', 'processed', 'logo', 'thumbnail', 'export_zip', 'document'],
      required: true,
      index: true,
    },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    checksum: { type: String, required: true },
    width: { type: Number },
    height: { type: Number },
    url: { type: String },
    cloudinaryPublicId: { type: String },
    resourceType: { type: String, default: 'auto' },
    lifecycleStatus: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

AssetSchema.index({ companyId: 1, assetType: 1 });
AssetSchema.index({ companyId: 1, checksum: 1 });

export const Asset = mongoose.model<IAsset>('Asset', AssetSchema);
