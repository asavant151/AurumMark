import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProject extends Document {
  companyId: Types.ObjectId;
  name: string;
  description?: string;
  tags: string[];
  coverAssetId?: Types.ObjectId;
  defaultWatermarkTemplateId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true }],
    coverAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
    defaultWatermarkTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'WatermarkTemplate',
      default: null,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ companyId: 1, name: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
