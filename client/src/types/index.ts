export type UserRole = 'Company' | 'Designer' | 'Viewer';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CompanySettings {
  defaultOutputFormat: 'jpeg' | 'png' | 'webp';
  defaultQuality: number;
  allowViewerDownload: boolean;
  allowViewerZipDownload: boolean;
  allowDesignerCreateProject: boolean;
  sanitizeMetadata: boolean;
}

export interface CompanyContact {
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export interface Company {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  contact?: CompanyContact;
  settings: CompanySettings;
  storageQuota: number;
  storageUsage: number;
  logoAssetId?: any;
}

export interface MembershipPermissions {
  canUpload: boolean;
  canProcess: boolean;
  canCreateTemplate: boolean;
  canEditTemplate: boolean;
  canDeleteDesign: boolean;
  canExportZip: boolean;
  canInviteMembers: boolean;
  canCreateProject: boolean;
}

export interface CompanyMembership {
  _id: string;
  companyId: string;
  userId: any;
  role: UserRole;
  permissions: MembershipPermissions;
  status: 'active' | 'deactivated';
  invitedBy?: any;
  createdAt: string;
}

export interface Invitation {
  _id: string;
  email: string;
  invitedRole: 'Designer' | 'Viewer';
  expiresAt: string;
  acceptedAt?: string;
  invitedBy: any;
  createdAt: string;
  status?: 'pending' | 'expired' | 'accepted';
  isExpired?: boolean;
  rawToken?: string;
  inviteUrl?: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  tags: string[];
  coverAssetId?: any;
  defaultWatermarkTemplateId?: any;
  createdBy: any;
  status: 'active' | 'archived';
  designsCount?: number;
  processedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  _id: string;
  storageKey: string;
  originalFilename: string;
  assetType: 'original' | 'processed' | 'logo' | 'thumbnail' | 'export_zip' | 'document';
  mimeType: string;
  fileSize: number;
  checksum: string;
  width?: number;
  height?: number;
  url?: string;
  cloudinaryPublicId?: string;
  createdAt: string;
}

export interface Design {
  _id: string;
  filename: string;
  sku?: string;
  tags: string[];
  originalAssetId: Asset;
  processedAssetIds: Asset[];
  activeProcessedAssetId?: Asset;
  projectId?: any;
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
    aspectRatio?: number;
  };
  uploadStatus: 'completed' | 'failed';
  processingStatus: 'unprocessed' | 'processing' | 'processed' | 'failed';
  uploadedBy: any;
  createdAt: string;
  updatedAt: string;
}

export type WatermarkType = 'text' | 'logo' | 'combined' | 'tiled';
export type PositionPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

export type ScalingPolicy = 'relative' | 'fixed' | 'contain' | 'cover';

export interface TextWatermarkConfig {
  enabled: boolean;
  text: string;
  fontFamily: 'Outfit' | 'Poppins';
  fontSizeRatio: number;
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800';
  color: string;
  opacity: number;
  rotation: number;
  letterSpacing: number;
  alignment: 'left' | 'center' | 'right';
  normalizedX: number;
  normalizedY: number;
  stroke?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface LogoWatermarkConfig {
  enabled: boolean;
  logoAssetId?: string | null;
  logoUrl?: string;
  scaleRatio: number;
  opacity: number;
  rotation: number;
  normalizedX: number;
  normalizedY: number;
}

export interface TiledWatermarkConfig {
  enabled: boolean;
  text?: string;
  fontFamily?: 'Outfit' | 'Poppins';
  fontSizeRatio?: number;
  opacity?: number;
  angle?: number;
  spacingX?: number;
  spacingY?: number;
  color?: string;
}

export interface WatermarkConfiguration {
  watermarkType: WatermarkType;
  positionPreset: PositionPreset;
  scalingPolicy: ScalingPolicy;
  marginPercent: number;
  textConfig: TextWatermarkConfig;
  logoConfig: LogoWatermarkConfig;
  tiledConfig: TiledWatermarkConfig;
}

export interface WatermarkTemplate {
  _id: string;
  name: string;
  description?: string;
  watermarkType: WatermarkType;
  configuration: WatermarkConfiguration;
  version: number;
  isDefault: boolean;
  createdBy?: any;
  updatedBy?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingBatch {
  _id: string;
  requestedBy: any;
  templateId?: any;
  templateSnapshot: WatermarkConfiguration;
  outputSettings: {
    format: 'jpeg' | 'png' | 'webp';
    quality: number;
    stripMetadata: boolean;
  };
  counters: {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  status:
    | 'pending'
    | 'queued'
    | 'processing'
    | 'completed'
    | 'completed_with_errors'
    | 'failed'
    | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ProcessingItem {
  _id: string;
  batchId: string;
  designId: any;
  sourceAssetId: Asset;
  outputAssetId?: Asset;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  errorDetails?: string;
  completedAt?: string;
}

export interface ExportRecord {
  _id: string;
  requestedBy: any;
  fileCount: number;
  archiveSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadToken: string;
  expiresAt: string;
  createdAt: string;
}

export interface SingleDownloadRecord {
  _id: string;
  assetId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  assetType: string;
  url?: string;
  storageKey?: string;
  sku?: string;
  downloadedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  ipAddress?: string;
  createdAt: string;
}

export interface ActivityLogItem {
  _id: string;
  actorId: any;
  action: string;
  resourceType: string;
  resourceId?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalUploadedImages: number;
  totalProcessedImages: number;
  totalProjects: number;
  savedTemplates: number;
  activeProcessingJobs: number;
  failedJobs: number;
  recentDownloads: number;
  storageUsageBytes: number;
  storageQuotaBytes: number;
  storagePercentage: number;
}
