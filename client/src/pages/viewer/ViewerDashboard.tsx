import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  Images,
  FolderKanban,
  Download,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { dashboardApi, designsApi, projectsApi } from '../../api/index.js';
import { Design, Project } from '../../types/index.js';
import { Card, Button, Badge } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const ViewerDashboard: React.FC = () => {
  const { user, company } = useAuthStore();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      designsApi.list({ limit: 12 }),
      projectsApi.list(),
    ]).then(([dRes, pRes]) => {
      setDesigns(dRes.data.data || []);
      setProjects(pRes.data.data || []);
      setLoading(false);
    });
  }, []);

  const allowDownload = company?.settings?.allowViewerDownload ?? true;
  const allowZip = company?.settings?.allowViewerZipDownload ?? false;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Viewer Welcome Banner */}
      <div className="bg-gradient-to-r from-white via-white to-[#16A34A]/10 rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#16A34A] font-heading mb-1">
            <Eye className="w-3.5 h-3.5" />
            Client & Viewer Catalogue: {company?.name}
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
            Jewellery Catalogue Gallery
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Browse authorized jewellery lines, view watermarked showroom photos, and download authorized files.
          </p>
        </div>

        {/* Company Download Policy Indicator */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs">
          <div className="text-left">
            <div className="text-[11px] font-semibold text-[#64748B]">Download Permissions</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {allowDownload ? (
                <span className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Single Images Allowed
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> View Only
                </span>
              )}
              {allowZip && (
                <span className="text-[11px] font-semibold text-[#7C3AED] flex items-center gap-1">
                  • <CheckCircle2 className="w-3 h-3" /> ZIP Enabled
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link to="/viewer/gallery" className="block group">
          <Card className="hover:border-[#7C3AED]/40 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                <Images className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#7C3AED] transition" />
            </div>
            <div className="text-xl font-extrabold text-[#1E293B] font-heading">
              {loading ? '...' : designs.length}
            </div>
            <div className="text-xs text-[#64748B]">Accessible Jewellery Designs</div>
          </Card>
        </Link>

        <Link to="/viewer/projects" className="block group">
          <Card className="hover:border-[#B8860B]/40 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#B8860B]/10 text-[#B8860B]">
                <FolderKanban className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#B8860B] transition" />
            </div>
            <div className="text-xl font-extrabold text-[#1E293B] font-heading">
              {loading ? '...' : projects.length}
            </div>
            <div className="text-xs text-[#64748B]">Available Collections</div>
          </Card>
        </Link>

        <Link to="/viewer/gallery?status=processed" className="block group">
          <Card className="hover:border-[#16A34A]/40 transition">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
                <Sparkles className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#16A34A] transition" />
            </div>
            <div className="text-xl font-extrabold text-[#1E293B] font-heading">
              {loading ? '...' : designs.filter((d) => d.activeProcessedAssetId).length}
            </div>
            <div className="text-xs text-[#64748B]">Watermarked Catalogue Pieces</div>
          </Card>
        </Link>
      </div>

      {/* Featured Catalogue Pieces Preview */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-sm font-bold text-[#1E293B] font-heading">
              Featured Jewellery Designs
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Latest catalogued rings, earrings, necklaces, and bridal sets
            </p>
          </div>
          <Link
            to="/viewer/gallery"
            className="text-xs font-semibold text-[#7C3AED] hover:underline flex items-center gap-1 font-heading"
          >
            Open Full Gallery <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {designs.slice(0, 6).map((d) => {
            const asset = d.activeProcessedAssetId || d.originalAssetId;
            return (
              <Link
                key={d._id}
                to={`/viewer/preview?designId=${d._id}`}
                className="group rounded-xl border border-[#E2E8F0] overflow-hidden hover:border-[#7C3AED] transition"
              >
                <div className="aspect-square bg-[#F1F5F9] overflow-hidden flex items-center justify-center">
                  {asset ? (
                    <img
                      src={`/api/v1/assets/${asset._id}/view`}
                      alt={d.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <Images className="w-6 h-6 text-[#CBD5E1]" />
                  )}
                </div>
                <div className="p-2 bg-white text-center">
                  <div className="text-[11px] font-bold text-[#7C3AED] font-mono truncate">
                    {d.sku || 'SKU'}
                  </div>
                  <div className="text-[10px] text-[#64748B] truncate">{d.filename}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
