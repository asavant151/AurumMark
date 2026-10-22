import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IActivityLog extends Document {
  companyId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  resourceType: 'project' | 'design' | 'template' | 'batch' | 'export' | 'member' | 'company' | 'auth';
  resourceId?: Types.ObjectId | string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    resourceType: {
      type: String,
      enum: ['project', 'design', 'template', 'batch', 'export', 'member', 'company', 'auth'],
      required: true,
      index: true,
    },
    resourceId: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ companyId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
