import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInvitation extends Document {
  companyId: Types.ObjectId;
  email: string;
  invitedRole: 'Designer' | 'Viewer';
  tokenHash: string;
  rawToken?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  invitedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedRole: {
      type: String,
      enum: ['Designer', 'Viewer'],
      required: true,
    },
    tokenHash: { type: String, required: true, index: true },
    rawToken: { type: String, default: null },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date, default: null },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

InvitationSchema.index({ companyId: 1, email: 1 });

export const Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);
