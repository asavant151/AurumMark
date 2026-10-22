import React, { useState, useEffect } from 'react';
import { HardDrive, ShieldCheck, Database, FileImage, Sparkles, AlertCircle } from 'lucide-react';
import { dashboardApi } from '../../api/index.js';
import { DashboardMetrics } from '../../types/index.js';
import { Card, Badge } from '../../components/common/index.js';

export const StorageUsagePage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getSummary().then((res) => {
      setMetrics(res.data.data.metrics);
      setLoading(false);
    });
  }, []);

  const usedBytes = metrics?.storageUsageBytes || 0;
  const quotaBytes = metrics?.storageQuotaBytes || 5 * 1024 * 1024 * 1024;
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
  const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(1);
  const percent = metrics?.storagePercentage || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] font-heading">Storage Usage & Quota</h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Tenant-isolated storage accounting for jewellery masters and rendered watermarked copies.
        </p>
      </div>

      {/* Main Quota Meter Card */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E293B] font-heading">
                Allocated Workspace Storage
              </h3>
              <p className="text-xs text-[#64748B]">5.0 GB Standard Plan Quota</p>
            </div>
          </div>
          <Badge variant={percent > 85 ? 'danger' : 'success'} size="md">
            {percent}% Utilized
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-[#F1F5F9] rounded-full h-4 overflow-hidden p-0.5 border border-[#E2E8F0]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percent > 85 ? 'bg-[#DC2626]' : percent > 60 ? 'bg-[#D97706]' : 'bg-[#7C3AED]'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#64748B] font-medium pt-1">
            <span>{usedMB} MB current storage consumption</span>
            <span>{quotaGB} GB plan capacity</span>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white text-[#7C3AED] border border-[#E2E8F0]">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#64748B]">Original Jewellery Masters</div>
              <div className="text-lg font-bold text-[#1E293B] font-heading">
                {metrics?.totalUploadedImages || 0} Assets
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white text-[#16A34A] border border-[#E2E8F0]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#64748B]">Rendered Watermarked Copies</div>
              <div className="text-lg font-bold text-[#1E293B] font-heading">
                {metrics?.totalProcessedImages || 0} Outputs
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
