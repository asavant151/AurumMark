import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshSession extends Document {
  userId: Types.ObjectId;
  hashedToken: string;
  expiresAt: Date;
  isRevoked: boolean;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshSessionSchema = new Schema<IRefreshSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hashedToken: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

// TTL index to automatically clean up expired sessions
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession = mongoose.model<IRefreshSession>(
  'RefreshSession',
  RefreshSessionSchema
);
