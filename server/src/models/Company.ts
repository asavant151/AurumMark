import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompanySettings {
  defaultOutputFormat: 'jpeg' | 'png' | 'webp';
  defaultQuality: number;
  allowViewerDownload: boolean;
  allowViewerZipDownload: boolean;
  allowDesignerCreateProject: boolean;
  sanitizeMetadata: boolean;
}

export interface ICompanyContact {
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export interface ICompany extends Document {
  name: string;
  slug: string;
  logoAssetId?: Types.ObjectId;
  contact: ICompanyContact;
  settings: ICompanySettings;
  storageQuota: number; // in bytes
  storageUsage: number; // in bytes
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    logoAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    contact: {
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      website: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    settings: {
      defaultOutputFormat: { type: String, enum: ['jpeg', 'png', 'webp'], default: 'jpeg' },
      defaultQuality: { type: Number, default: 90, min: 10, max: 100 },
      allowViewerDownload: { type: Boolean, default: true },
      allowViewerZipDownload: { type: Boolean, default: false },
      allowDesignerCreateProject: { type: Boolean, default: true },
      sanitizeMetadata: { type: Boolean, default: true },
    },
    storageQuota: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5 GB
    storageUsage: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
