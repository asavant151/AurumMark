import React, { useState, useEffect } from 'react';
import {
  Download,
  FileArchive,
  Clock,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Images,
  Image as ImageIcon,
  RotateCw,
  User,
} from 'lucide-react';
import { exportsApi, assetsApi } from '../../api/index.js';
import { ExportRecord, SingleDownloadRecord } from '../../types/index.js';
import { Card, Button, Badge, EmptyState } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const DownloadHistoryPage: React.FC = () => {
  const { role, company, permissions } = useAuthStore();

  const canViewSingleTab =
    role === 'Company' ||
    role === 'Designer' ||
    (role === 'Viewer' && company?.settings?.allowViewerDownload !== false);

  const canViewZipsTab =
    role === 'Company' ||
    (role === 'Designer' && permissions?.canExportZip !== false) ||
    (role === 'Viewer' && company?.settings?.allowViewerZipDownload === true);

  const [activeTab, setActiveTab] = useState<'single' | 'zips'>(
    canViewSingleTab ? 'single' : 'zips'
  );
  const [exportsList, setExportsList] = useState<ExportRecord[]>([]);
  const [singleDownloads, setSingleDownloads] = useState<SingleDownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const isViewerBlocked = !canViewSingleTab && !canViewZipsTab;

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [expRes, singleRes] = await Promise.allSettled([
        exportsApi.listExports(),
        exportsApi.listSingleDownloads(),
      ]);

      const exps = expRes.status === 'fulfilled' ? expRes.value.data.data || [] : [];
      const singles = singleRes.status === 'fulfilled' ? singleRes.value.data.data || [] : [];

      setExportsList(exps);
      setSingleDownloads(singles);

      // Auto-switch tab if only one is allowed or one is empty
      if (!canViewSingleTab && canViewZipsTab) {
        setActiveTab('zips');
      } else if (canViewSingleTab && !canViewZipsTab) {
        setActiveTab('single');
      } else if (singles.length === 0 && exps.length > 0) {
        setActiveTab('zips');
      }
    } catch (err) {
      console.error('Failed to load download history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Smart polling for ZIP exports in progress
  useEffect(() => {
    const hasActiveExports = exportsList.some(
      (e) => e.status === 'pending' || e.status === 'processing'
    );
    if (!hasActiveExports) return;

    const timer = setTimeout(fetchHistory, 4000);
    return () => clearTimeout(timer);
  }, [exportsList]);

  if (isViewerBlocked) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-[#D97706] mx-auto" />
        <h2 className="text-xl font-bold text-[#1E293B] font-heading">
          Downloads Restricted by Company Policy
        </h2>
        <p className="text-xs text-[#64748B] max-w-md mx-auto">
          The company owner has configured read-only viewing permissions for the Viewer role.
          Catalogue downloads are currently disabled.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
            Download & Export History
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Access downloaded watermarked jewellery images and generated ZIP catalogue archives.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchHistory} disabled={loading}>
          <RotateCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh History
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0]">
        {canViewSingleTab && (
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg flex items-center gap-2 transition border-b-2 ${
              activeTab === 'single'
                ? 'border-[#7C3AED] text-[#7C3AED] bg-white font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B] hover:bg-white/50'
            }`}
          >
            <Images className="w-4 h-4 text-[#7C3AED]" />
            <span>Single Images</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'single'
                  ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
                  : 'bg-[#F1F5F9] text-[#64748B]'
              }`}
            >
              {singleDownloads.length}
            </span>
          </button>
        )}

        {canViewZipsTab && (
          <button
            onClick={() => setActiveTab('zips')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg flex items-center gap-2 transition border-b-2 ${
              activeTab === 'zips'
                ? 'border-[#7C3AED] text-[#7C3AED] bg-white font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B] hover:bg-white/50'
            }`}
          >
            <FileArchive className="w-4 h-4 text-[#B8860B]" />
            <span>ZIP Packages</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'zips'
                  ? 'bg-[#B8860B]/15 text-[#B8860B]'
                  : 'bg-[#F1F5F9] text-[#64748B]'
              }`}
            >
              {exportsList.length}
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: SINGLE IMAGE DOWNLOADS */}
      {activeTab === 'single' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-heading">
                  <th className="py-3 px-5">Jewellery Design</th>
                  <th className="py-3 px-5">SKU / Code</th>
                  <th className="py-3 px-5">File Size</th>
                  <th className="py-3 px-5">Downloaded By</th>
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#64748B]">
                      Loading downloaded images...
                    </td>
                  </tr>
                ) : singleDownloads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#64748B]">
                      <Images className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                      <div className="font-semibold text-[#1E293B]">No individual image downloads yet.</div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        When you download a watermarked design from the gallery or batch viewer, it will be listed here.
                      </div>
                    </td>
                  </tr>
                ) : (
                  singleDownloads.map((item) => {
                    const sizeKB = item.fileSize ? (item.fileSize / 1024).toFixed(1) : '—';
                    const hasAsset = !!item.assetId;

                    return (
                      <tr key={item._id} className="hover:bg-[#F8FAFC]/60 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] overflow-hidden border border-[#E2E8F0] flex items-center justify-center flex-shrink-0">
                              {item.url ? (
                                <img
                                  src={item.url}
                                  alt={item.filename}
                                  className="w-full h-full object-cover"
                                />
                              ) : item.assetId ? (
                                <img
                                  src={assetsApi.getViewUrl(item.assetId)}
                                  alt={item.filename}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-[#CBD5E1]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#1E293B] font-heading truncate max-w-[220px]">
                                {item.filename}
                              </div>
                              <div className="text-[10px] text-[#64748B]">
                                <Badge variant="success" size="sm">
                                  {item.assetType === 'processed' ? 'Watermarked' : 'Original'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          {item.sku ? (
                            <span className="font-mono text-xs font-semibold text-[#1E293B] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#E2E8F0]">
                              {item.sku}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8] italic">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-[#64748B]">
                          {sizeKB !== '—' ? `${sizeKB} KB` : '—'}
                        </td>

                        <td className="py-3.5 px-5 text-[#64748B]">
                          <div className="font-medium text-[#1E293B]">
                            {item.downloadedBy?.name || 'Jeweller'}
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {item.downloadedBy?.email || item.ipAddress || ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-[#64748B]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          {hasAsset && (item.assetType !== 'original' || role !== 'Viewer') ? (
                            <a
                              href={assetsApi.getDownloadUrl(item.assetId)}
                              download={item.filename}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#7C3AED]/10 hover:bg-[#7C3AED] text-[#7C3AED] hover:text-white text-xs font-semibold rounded-lg transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="text-xs text-[#94A3B8] italic">
                              {hasAsset ? 'Restricted' : 'Archived'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: BULK ZIP PACKAGES */}
      {activeTab === 'zips' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-heading">
                  <th className="py-3 px-5">Archive Package</th>
                  <th className="py-3 px-5">Image Count</th>
                  <th className="py-3 px-5">Archive Size</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Created On</th>
                  <th className="py-3 px-5">Expires In</th>
                  <th className="py-3 px-5 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#64748B]">
                      Loading ZIP archives...
                    </td>
                  </tr>
                ) : exportsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#64748B]">
                      <FileArchive className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                      <div className="font-semibold text-[#1E293B]">No export archives generated yet.</div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Select multiple designs in the Design Gallery to create and stream a ZIP package.
                      </div>
                    </td>
                  </tr>
                ) : (
                  exportsList.map((exp) => {
                    const sizeMB = exp.archiveSize ? (exp.archiveSize / (1024 * 1024)).toFixed(2) : '0';
                    const isReady = exp.status === 'completed';

                    return (
                      <tr key={exp._id} className="hover:bg-[#F8FAFC]/60 transition">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5 font-semibold text-[#1E293B] font-heading">
                            <FileArchive className="w-4 h-4 text-[#7C3AED]" />
                            Watermarked Catalogue ZIP
                          </div>
                          <div className="text-[11px] text-[#64748B] font-mono">
                            Token: {exp.downloadToken.slice(0, 12)}...
                          </div>
                        </td>

                        <td className="py-3.5 px-5 font-semibold text-[#1E293B]">
                          {exp.fileCount} images
                        </td>

                        <td className="py-3.5 px-5 text-[#64748B]">
                          {exp.archiveSize ? `${sizeMB} MB` : 'Calculating...'}
                        </td>

                        <td className="py-3.5 px-5">
                          <Badge
                            variant={
                              exp.status === 'completed'
                                ? 'success'
                                : exp.status === 'failed'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {exp.status === 'completed'
                              ? 'Ready'
                              : exp.status === 'processing'
                              ? 'Archiving...'
                              : exp.status}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-5 text-[#64748B]">
                          {new Date(exp.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-5 text-[#64748B]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(exp.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          {isReady ? (
                            <a
                              href={exportsApi.getDownloadUrl(exp.downloadToken)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-lg shadow-xs transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download ZIP
                            </a>
                          ) : (
                            <span className="text-xs text-[#64748B] italic">Processing...</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
