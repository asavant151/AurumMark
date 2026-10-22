import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Images,
  Cpu,
  FolderKanban,
  Stamp,
  HardDrive,
  Download,
  AlertTriangle,
  ArrowRight,
  Upload,
  Plus,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';
import { dashboardApi } from '../../api/index.js';
import { DashboardMetrics, ActivityLogItem } from '../../types/index.js';
import { Card, Button, Badge } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const CompanyDashboard: React.FC = () => {
  const { company } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [sumRes, actRes] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getActivity(),
        ]);
        setMetrics(sumRes.data.data.metrics);
        setActivities(actRes.data.data || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const statCards = [
    {
      label: 'Uploaded Images',
      value: metrics?.totalUploadedImages || 0,
      icon: Images,
      color: 'text-[#7C3AED]',
      bg: 'bg-[#7C3AED]/10',
      to: '/company/gallery',
    },
    {
      label: 'Processed Images',
      value: metrics?.totalProcessedImages || 0,
      icon: Sparkles,
      color: 'text-[#16A34A]',
      bg: 'bg-[#16A34A]/10',
      to: '/company/gallery?status=processed',
    },
    {
      label: 'Jewellery Projects',
      value: metrics?.totalProjects || 0,
      icon: FolderKanban,
      color: 'text-[#B8860B]',
      bg: 'bg-[#B8860B]/10',
      to: '/company/projects',
    },
    {
      label: 'Saved Templates',
      value: metrics?.savedTemplates || 0,
      icon: Stamp,
      color: 'text-[#6366F1]',
      bg: 'bg-[#6366F1]/10',
      to: '/company/templates',
    },
    {
      label: 'Active Processing',
      value: metrics?.activeProcessingJobs || 0,
      icon: Cpu,
      color: 'text-[#D97706]',
      bg: 'bg-[#D97706]/10',
      to: '/company/history',
    },
    {
      label: 'Recent Downloads',
      value: metrics?.recentDownloads || 0,
      icon: Download,
      color: 'text-[#0284C7]',
      bg: 'bg-[#0284C7]/10',
      to: '/company/downloads',
    },
  ];

  const storageUsedMB = metrics ? (metrics.storageUsageBytes / (1024 * 1024)).toFixed(1) : '0';
  const storageQuotaGB = metrics ? (metrics.storageQuotaBytes / (1024 * 1024 * 1024)).toFixed(0) : '5';
  const storagePercent = metrics?.storagePercentage || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-white via-white to-[#7C3AED]/5 rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7C3AED] font-heading mb-1">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            Workspace Active: {company?.name}
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
            Company Management Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Manage your jewellery catalogue, configure watermarks, and control team access.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/company/upload">
            <Button variant="primary" size="md">
              <Upload className="w-3.5 h-3.5 mr-1" />
              Upload Images
            </Button>
          </Link>
          <Link to="/company/editor">
            <Button variant="gold" size="md">
              <Stamp className="w-3.5 h-3.5 mr-1" />
              Watermark Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statCards.map((card, i) => (
          <Link key={i} to={card.to} className="block group">
            <Card className="p-4 hover:border-[#7C3AED]/50 transition h-full">
              <div className="flex items-center justify-between mb-2">
                <span className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </span>
                <ArrowRight className="w-3 h-3 text-[#CBD5E1] group-hover:text-[#7C3AED] transition" />
              </div>
              <div className="text-xl font-extrabold text-[#1E293B] font-heading">
                {loading ? '...' : card.value}
              </div>
              <div className="text-[11px] font-medium text-[#64748B] mt-0.5 truncate">
                {card.label}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Storage and Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Meter Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E293B] font-heading">Company Storage</h3>
                <p className="text-[11px] text-[#64748B]">Quota allocation & usage</p>
              </div>
            </div>
            <Badge variant={storagePercent > 80 ? 'danger' : 'primary'}>
              {storagePercent}% Used
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-[#F1F5F9] rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  storagePercent > 80
                    ? 'bg-[#DC2626]'
                    : storagePercent > 50
                    ? 'bg-[#D97706]'
                    : 'bg-[#7C3AED]'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, storagePercent))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#64748B] font-medium">
              <span>{storageUsedMB} MB used</span>
              <span>{storageQuotaGB} GB total</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B]">
            All original jewellery masters and rendered watermarked copies are securely tenant-isolated.
          </div>

          <Link to="/company/storage" className="block text-center">
            <span className="text-xs font-semibold text-[#7C3AED] hover:underline font-heading">
              Manage Storage & Retention →
            </span>
          </Link>
        </Card>

        {/* Recent Audit Feed */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#B8860B]/10 text-[#B8860B]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E293B] font-heading">Recent Activity</h3>
                <p className="text-[11px] text-[#64748B]">Real-time company audit log</p>
              </div>
            </div>
            <Link to="/company/activity" className="text-xs font-semibold text-[#7C3AED] hover:underline">
              View All Logs
            </Link>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">No recent activity logged.</div>
            ) : (
              activities.slice(0, 5).map((act) => (
                <div key={act._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                    <span className="font-semibold text-[#1E293B] font-mono">{act.action}</span>
                    <span className="text-[#64748B] hidden sm:inline">
                      by {act.actorId?.name || 'System'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
