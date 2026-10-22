import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Palette,
  Upload,
  Stamp,
  Images,
  Cpu,
  History,
  Download,
  FolderKanban,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { dashboardApi } from '../../api/index.js';
import { DashboardMetrics } from '../../types/index.js';
import { Card, Button, Badge } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const DesignerDashboard: React.FC = () => {
  const { user, company, permissions } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const canUpload = permissions?.canUpload !== false;
  const canEditStudio =
    permissions?.canCreateTemplate !== false || permissions?.canEditTemplate !== false;
  const canProcess = permissions?.canProcess !== false;

  useEffect(() => {
    dashboardApi.getSummary().then((res) => {
      setMetrics(res.data.data.metrics);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Designer Hero Banner */}
      <div className="bg-gradient-to-r from-white via-white to-[#B8860B]/10 rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B8860B] font-heading mb-1">
            <Palette className="w-3.5 h-3.5" />
            Designer Workstation: {company?.name}
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Upload jewellery images, customize watermarks on reference pieces, and run batch jobs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canUpload && (
            <Link to="/designer/upload">
              <Button variant="primary" size="md">
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload Images
              </Button>
            </Link>
          )}
          {canEditStudio && (
            <Link to="/designer/editor">
              <Button variant="gold" size="md">
                <Stamp className="w-3.5 h-3.5 mr-1" />
                Open Watermark Studio
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/designer/gallery" className="block group">
          <Card className="hover:border-[#7C3AED]/40 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                <Images className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#7C3AED] transition" />
            </div>
            <div className="text-xl font-extrabold text-[#1E293B] font-heading">
              {loading ? '...' : metrics?.totalUploadedImages || 0}
            </div>
            <div className="text-xs text-[#64748B]">Total Uploaded Designs</div>
          </Card>
        </Link>

        <Link to="/designer/gallery?status=processed" className="block group">
          <Card className="hover:border-[#16A34A]/40 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
                <Sparkles className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#16A34A] transition" />
            </div>
            <div className="text-xl font-extrabold text-[#1E293B] font-heading">
              {loading ? '...' : metrics?.totalProcessedImages || 0}
            </div>
            <div className="text-xs text-[#64748B]">Watermarked Copies</div>
          </Card>
        </Link>

        <Link to="/designer/projects" className="block group">
          <Card className="hover:border-[#B8860B]/40 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#B8860B]/10 text-[#B8860B]">
                <FolderKanban className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#B8860B] transition" />
            </div>
            <div className="text-xl font-extrabold text-[#1E293B] font-heading">
              {loading ? '...' : metrics?.totalProjects || 0}
            </div>
            <div className="text-xs text-[#64748B]">Active Collections</div>
          </Card>
        </Link>

        <Link to="/designer/history" className="block group">
          <Card className="hover:border-[#D97706]/40 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#D97706]/10 text-[#D97706]">
                <Cpu className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#D97706] transition" />
            </div>
            <div className="text-xl font-extrabold text-[#1E293B] font-heading">
              {loading ? '...' : metrics?.activeProcessingJobs || 0}
            </div>
            <div className="text-xs text-[#64748B]">Active Processing Jobs</div>
          </Card>
        </Link>
      </div>

      {/* Quick Launchpad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {canUpload && (
          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-[#1E293B] font-heading flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-[#7C3AED]" />
              1. Upload Jewellery
            </h3>
            <p className="text-xs text-[#64748B]">
              Add high-res product photos across JPEG, PNG, or WebP with automated SKU assignment.
            </p>
            <Link to="/designer/upload" className="block pt-1">
              <Button size="sm" variant="outline" className="w-full">
                Upload New Images
              </Button>
            </Link>
          </Card>
        )}

        {canEditStudio && (
          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-[#1E293B] font-heading flex items-center gap-1.5">
              <Stamp className="w-4 h-4 text-[#B8860B]" />
              2. Customize Watermark
            </h3>
            <p className="text-xs text-[#64748B]">
              Position text or company logos with drag-and-drop normalized precision on reference images.
            </p>
            <Link to="/designer/editor" className="block pt-1">
              <Button size="sm" variant="outline" className="w-full">
                Open Watermark Studio
              </Button>
            </Link>
          </Card>
        )}

        {canProcess && (
          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-[#1E293B] font-heading flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#16A34A]" />
              3. Run Bulk Processing
            </h3>
            <p className="text-xs text-[#64748B]">
              Apply the exact configuration automatically to entire collections with background queues.
            </p>
            <Link to="/designer/processing" className="block pt-1">
              <Button size="sm" variant="outline" className="w-full">
                Queue Batch Operation
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};
