import { Request } from 'express';
import { Types } from 'mongoose';
import { ActivityLog } from '../models/ActivityLog.js';

export interface LogActivityParams {
  companyId: Types.ObjectId | string;
  actorId: Types.ObjectId | string;
  action: string;
  resourceType: 'project' | 'design' | 'template' | 'batch' | 'export' | 'member' | 'company' | 'auth';
  resourceId?: Types.ObjectId | string | null;
  metadata?: Record<string, any>;
  req?: Request;
}

export class ActivityLogger {
  static async log(params: LogActivityParams): Promise<void> {
    try {
      const ipAddress = params.req?.ip || params.req?.socket?.remoteAddress;
      const userAgent = params.req?.headers['user-agent'];

      await ActivityLog.create({
        companyId: params.companyId,
        actorId: params.actorId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        metadata: params.metadata || {},
        ipAddress,
        userAgent,
      });
    } catch (err) {
      console.error('Failed to write activity log:', err);
    }
  }
}
