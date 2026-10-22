import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore.js';

// Layout & Guards
import { MainLayout } from './components/layout/MainLayout.js';
import { ProtectedRoute } from './components/guards/ProtectedRoute.js';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterCompanyPage } from './pages/auth/RegisterCompanyPage.js';
import { AcceptInvitationPage } from './pages/auth/AcceptInvitationPage.js';
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage.js';

// Company Workspace Pages
import { CompanyDashboard } from './pages/company/CompanyDashboard.js';
import { CompanyProfile } from './pages/company/CompanyProfile.js';
import { ProjectsPage } from './pages/company/ProjectsPage.js';
import { DesignGallery } from './pages/company/DesignGallery.js';
import { UploadCenter } from './pages/company/UploadCenter.js';
import { WatermarkEditorPage } from './pages/company/WatermarkEditorPage.js';
import { WatermarkTemplatesPage } from './pages/company/WatermarkTemplatesPage.js';
import { BulkProcessingPage } from './pages/company/BulkProcessingPage.js';
import { ProcessingHistoryPage } from './pages/company/ProcessingHistoryPage.js';
import { DownloadHistoryPage } from './pages/company/DownloadHistoryPage.js';
import { TeamMembers } from './pages/company/TeamMembers.js';
import { Invitations } from './pages/company/Invitations.js';
import { RolePermissions } from './pages/company/RolePermissions.js';
import { StorageUsagePage } from './pages/company/StorageUsagePage.js';
import { ActivityLogsPage } from './pages/company/ActivityLogsPage.js';

// Designer & Viewer Workspace Pages
import { DesignerDashboard } from './pages/designer/DesignerDashboard.js';
import { ViewerDashboard } from './pages/viewer/ViewerDashboard.js';
import { ImagePreviewPage } from './pages/viewer/ImagePreviewPage.js';
import { AccountSettingsPage } from './pages/shared/AccountSettingsPage.js';

const queryClient = new QueryClient();

// Dynamic index redirection based on authenticated role
const RootRedirect: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#7C3AED] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[#64748B] text-sm font-medium font-heading">
          Connecting to AurumMark SaaS...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'Company') return <Navigate to="/company/dashboard" replace />;
  if (role === 'Designer') return <Navigate to="/designer/dashboard" replace />;
  return <Navigate to="/viewer/dashboard" replace />;
};

export function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterCompanyPage />} />
          <Route path="/invite/accept" element={<AcceptInvitationPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* ROLE 1: COMPANY WORKSPACE */}
          <Route element={<ProtectedRoute allowedRoles={['Company']} />}>
            <Route element={<MainLayout />}>
              <Route path="/company/dashboard" element={<CompanyDashboard />} />
              <Route path="/company/profile" element={<CompanyProfile />} />
              <Route path="/company/projects" element={<ProjectsPage />} />
              <Route path="/company/gallery" element={<DesignGallery />} />
              <Route path="/company/upload" element={<UploadCenter />} />
              <Route path="/company/editor" element={<WatermarkEditorPage />} />
              <Route path="/company/templates" element={<WatermarkTemplatesPage />} />
              <Route path="/company/processing" element={<BulkProcessingPage />} />
              <Route path="/company/history" element={<ProcessingHistoryPage />} />
              <Route path="/company/downloads" element={<DownloadHistoryPage />} />
              <Route path="/company/members" element={<TeamMembers />} />
              <Route path="/company/invitations" element={<Invitations />} />
              <Route path="/company/permissions" element={<RolePermissions />} />
              <Route path="/company/storage" element={<StorageUsagePage />} />
              <Route path="/company/activity" element={<ActivityLogsPage />} />
              <Route path="/company/security" element={<AccountSettingsPage />} />
              <Route path="/settings/account" element={<AccountSettingsPage />} />
            </Route>
          </Route>

          {/* ROLE 2: DESIGNER WORKSPACE */}
          <Route element={<ProtectedRoute allowedRoles={['Designer']} />}>
            <Route element={<MainLayout />}>
              <Route path="/designer/dashboard" element={<DesignerDashboard />} />
              <Route path="/designer/projects" element={<ProjectsPage />} />
              <Route path="/designer/gallery" element={<DesignGallery />} />
              <Route path="/designer/upload" element={<UploadCenter />} />
              <Route path="/designer/editor" element={<WatermarkEditorPage />} />
              <Route path="/designer/templates" element={<WatermarkTemplatesPage />} />
              <Route path="/designer/processing" element={<BulkProcessingPage />} />
              <Route path="/designer/history" element={<ProcessingHistoryPage />} />
              <Route path="/designer/downloads" element={<DownloadHistoryPage />} />
              <Route path="/designer/settings" element={<AccountSettingsPage />} />
              <Route path="/settings/account" element={<AccountSettingsPage />} />
            </Route>
          </Route>

          {/* ROLE 3: VIEWER WORKSPACE */}
          <Route element={<ProtectedRoute allowedRoles={['Viewer']} />}>
            <Route element={<MainLayout />}>
              <Route path="/viewer/dashboard" element={<ViewerDashboard />} />
              <Route path="/viewer/projects" element={<ProjectsPage />} />
              <Route path="/viewer/gallery" element={<DesignGallery />} />
              <Route path="/viewer/preview" element={<ImagePreviewPage />} />
              <Route path="/viewer/status" element={<ProcessingHistoryPage />} />
              <Route path="/viewer/downloads" element={<DownloadHistoryPage />} />
              <Route path="/viewer/settings" element={<AccountSettingsPage />} />
              <Route path="/settings/account" element={<AccountSettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
