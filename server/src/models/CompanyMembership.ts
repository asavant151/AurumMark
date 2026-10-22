import mongoose, { Schema, Document, Types } from 'mongoose';

export type UserRole = 'Company' | 'Designer' | 'Viewer';

export interface IMembershipPermissions {
  canUpload: boolean;
  canProcess: boolean;
  canCreateTemplate: boolean;
  canEditTemplate: boolean;
  canDeleteDesign: boolean;
  canExportZip: boolean;
  canInviteMembers: boolean;
  canCreateProject: boolean;
}

export interface ICompanyMembership extends Document {
  companyId: Types.ObjectId;
  userId: Types.ObjectId;
  role: UserRole;
  permissions: IMembershipPermissions;
  status: 'active' | 'deactivated';
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyMembershipSchema = new Schema<ICompanyMembership>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['Company', 'Designer', 'Viewer'],
      required: true,
      index: true,
    },
    permissions: {
      canUpload: { type: Boolean, default: false },
      canProcess: { type: Boolean, default: false },
      canCreateTemplate: { type: Boolean, default: false },
      canEditTemplate: { type: Boolean, default: false },
      canDeleteDesign: { type: Boolean, default: false },
      canExportZip: { type: Boolean, default: false },
      canInviteMembers: { type: Boolean, default: false },
      canCreateProject: { type: Boolean, default: false },
    },
    status: { type: String, enum: ['active', 'deactivated'], default: 'active', index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Ensure user has only one membership per company
CompanyMembershipSchema.index({ companyId: 1, userId: 1 }, { unique: true });

export const CompanyMembership = mongoose.model<ICompanyMembership>(
  'CompanyMembership',
  CompanyMembershipSchema
);
