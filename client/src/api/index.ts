import { apiClient } from './client.js';
import {
  User,
  Company,
  MembershipPermissions,
  UserRole,
  Project,
  Design,
  WatermarkTemplate,
  WatermarkConfiguration,
  ProcessingBatch,
  ExportRecord,
  ActivityLogItem,
  DashboardMetrics,
} from '../types/index.js';

export const authApi = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
  switchCompany: (targetCompanyId: string) =>
    apiClient.post('/auth/switch-company', { targetCompanyId }),
  acceptInvitation: (data: any) => apiClient.post('/auth/invitations/accept', data),
  getInvitationInfo: (token: string) => apiClient.get('/auth/invitations/info', { params: { token } }),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => apiClient.post('/auth/reset-password', data),
  updateProfile: (data: { name: string }) => apiClient.patch('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/auth/change-password', data),
};

export const companyApi = {
  getCurrent: () => apiClient.get('/companies/current'),
  updateCurrent: (data: any) => apiClient.patch('/companies/current', data),
  getMembers: () => apiClient.get('/companies/current/members'),
  updateMember: (memberId: string, data: any) =>
    apiClient.patch(`/companies/current/members/${memberId}`, data),
  deleteMember: (memberId: string) =>
    apiClient.delete(`/companies/current/members/${memberId}`),
  createInvitation: (data: { email: string; role: 'Designer' | 'Viewer' }) =>
    apiClient.post('/companies/current/invitations', data),
  getInvitations: () => apiClient.get('/companies/current/invitations'),
  resendInvitation: (invitationId: string) =>
    apiClient.post(`/companies/current/invitations/${invitationId}/resend`),
  deleteInvitation: (invitationId: string) =>
    apiClient.delete(`/companies/current/invitations/${invitationId}`),
  resetMemberPassword: (memberId: string, data: { newPassword: string }) =>
    apiClient.post(`/companies/current/members/${memberId}/reset-password`, data),
};

export const projectsApi = {
  list: (params?: { search?: string; tag?: string; status?: string }) =>
    apiClient.get('/projects', { params }),
  create: (data: { name: string; description?: string; tags?: string[]; coverAssetId?: string }) =>
    apiClient.post('/projects', data),
  getById: (projectId: string) => apiClient.get(`/projects/${projectId}`),
  update: (projectId: string, data: any) => apiClient.patch(`/projects/${projectId}`, data),
  delete: (projectId: string) => apiClient.delete(`/projects/${projectId}`),
};

export const designsApi = {
  list: (params?: { projectId?: string; processingStatus?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/designs', { params }),
  upload: (formData: FormData) =>
    apiClient.post('/designs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getById: (designId: string) => apiClient.get(`/designs/${designId}`),
  update: (designId: string, data: any) => apiClient.patch(`/designs/${designId}`, data),
  delete: (designId: string) => apiClient.delete(`/designs/${designId}`),
};

export const templatesApi = {
  list: () => apiClient.get('/watermark-templates'),
  create: (data: { name: string; description?: string; watermarkType: string; configuration: WatermarkConfiguration; isDefault?: boolean }) =>
    apiClient.post('/watermark-templates', data),
  getById: (templateId: string) => apiClient.get(`/watermark-templates/${templateId}`),
  update: (templateId: string, data: any) => apiClient.patch(`/watermark-templates/${templateId}`, data),
  duplicate: (templateId: string) => apiClient.post(`/watermark-templates/${templateId}/duplicate`),
  delete: (templateId: string) => apiClient.delete(`/watermark-templates/${templateId}`),
  preview: (data: { assetId: string; configuration: WatermarkConfiguration }) =>
    apiClient.post('/watermark-templates/preview', data),
};

export const processingApi = {
  listBatches: () => apiClient.get('/processing/batches'),
  createBatch: (data: { designIds: string[]; templateId?: string; templateSnapshot?: WatermarkConfiguration; outputSettings?: any }) =>
    apiClient.post('/processing/batches', data),
  getBatchById: (batchId: string) => apiClient.get(`/processing/batches/${batchId}`),
  retryBatch: (batchId: string) => apiClient.post(`/processing/batches/${batchId}/retry`),
  cancelBatch: (batchId: string) => apiClient.post(`/processing/batches/${batchId}/cancel`),
};

export const exportsApi = {
  listExports: () => apiClient.get('/exports'),
  listSingleDownloads: () => apiClient.get('/exports/single-downloads'),
  createExport: (data: { assetIds?: string[]; projectId?: string }) =>
    apiClient.post('/exports', data),
  getExportById: (exportId: string) => apiClient.get(`/exports/${exportId}`),
  getDownloadUrl: (token: string) => `/api/v1/exports/download/${token}`,
};

export const dashboardApi = {
  getSummary: () => apiClient.get<{ success: boolean; data: { metrics: DashboardMetrics } }>('/dashboard/summary'),
  getActivity: () => apiClient.get<{ success: boolean; data: ActivityLogItem[] }>('/dashboard/activity'),
};

export const assetsApi = {
  getViewUrl: (assetOrId: any): string => {
    if (!assetOrId) return '';
    if (typeof assetOrId === 'object') {
      if (assetOrId.url) return assetOrId.url;
      assetOrId = assetOrId._id || assetOrId.id;
    }
    if (typeof assetOrId === 'string') {
      if (assetOrId.startsWith('http://') || assetOrId.startsWith('https://')) {
        return assetOrId;
      }
      const token = localStorage.getItem('auth_access_token');
      return `/api/v1/assets/${assetOrId}/view${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }
    return '';
  },
  getDownloadUrl: (assetOrId: any): string => {
    if (!assetOrId) return '';
    let id = assetOrId;
    if (typeof assetOrId === 'object') {
      id = assetOrId._id || assetOrId.id;
    }
    const token = localStorage.getItem('auth_access_token');
    return `/api/v1/assets/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};

export const uploadApi = {
  uploadDocument: (formData: FormData) =>
    apiClient.post('/uploads/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadLogo: (formData: FormData) =>
    apiClient.post('/uploads/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getCloudinaryStatus: () => apiClient.get('/uploads/status'),
  syncCloudinary: () => apiClient.post('/uploads/sync-cloudinary'),
};
