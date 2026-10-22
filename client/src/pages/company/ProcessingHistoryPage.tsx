import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  History,
  RotateCw,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Images,
  Cpu,
} from 'lucide-react';
import { processingApi, assetsApi } from '../../api/index.js';
import { ProcessingBatch, ProcessingItem } from '../../types/index.js';
import { Card, Button, Badge, Modal, EmptyState, ConfirmDeleteModal } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const ProcessingHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeBatchFromUrl = searchParams.get('activeBatch');

  const { role, company, permissions } = useAuthStore();
  const canProcess =
    role === 'Company' || (role === 'Designer' && permissions?.canProcess !== false);
  const canDownloadOutput =
    role === 'Company' ||
    role === 'Designer' ||
    (role === 'Viewer' && company?.settings?.allowViewerDownload !== false);

  const [batches, setBatches] = useState<ProcessingBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Batch Detail Modal
  const [inspectBatchId, setInspectBatchId] = useState<string | null>(activeBatchFromUrl || null);
  const [inspectBatch, setInspectBatch] = useState<ProcessingBatch | null>(null);
  const [batchItems, setBatchItems] = useState<ProcessingItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [cancelBatchTarget, setCancelBatchTarget] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const fetchBatches = async () => {
    try {
      const res = await processingApi.listBatches();
      const list = res.data.data || [];
      setBatches(list);
      return list;
    } catch (err) {
      console.error('Failed to load batches:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadBatchDetails = async (batchId: string, showSpinner = true) => {
    if (showSpinner) setLoadingDetails(true);
    try {
      const res = await processingApi.getBatchById(batchId);
      const b = res.data.data.batch;
      setInspectBatch(b);
      setBatchItems(res.data.data.items || []);
      return b;
    } catch (err) {
      console.error('Failed to load batch details:', err);
      return null;
    } finally {
      if (showSpinner) setLoadingDetails(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBatches();
    if (inspectBatchId) {
      loadBatchDetails(inspectBatchId, true);
    }
  }, []);

  // Smart polling: ONLY poll if any batch in the list or the inspected batch is actively queued/processing/pending
  useEffect(() => {
    const hasActiveBatches = batches.some(
      (b) => b.status === 'processing' || b.status === 'queued' || b.status === 'pending'
    );
    const isInspectActive =
      inspectBatch &&
      (inspectBatch.status === 'processing' ||
        inspectBatch.status === 'queued' ||
        inspectBatch.status === 'pending');

    // If nothing is actively running, do NOT poll
    if (!hasActiveBatches && !isInspectActive) {
      return;
    }

    const timer = setTimeout(async () => {
      await fetchBatches();
      if (inspectBatchId && isInspectActive) {
        await loadBatchDetails(inspectBatchId, false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [batches, inspectBatch, inspectBatchId]);

  const handleOpenDetails = (batchId: string) => {
    setInspectBatchId(batchId);
    loadBatchDetails(batchId, true);
  };

  const handleRetry = async (batchId: string) => {
    try {
      await processingApi.retryBatch(batchId);
      fetchBatches();
      if (inspectBatchId) loadBatchDetails(inspectBatchId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Retry failed.');
    }
  };

  const confirmCancelJob = async () => {
    if (!cancelBatchTarget) return;
    setCanceling(true);
    try {
      await processingApi.cancelBatch(cancelBatchTarget);
      setCancelBatchTarget(null);
      fetchBatches();
      if (inspectBatchId) loadBatchDetails(inspectBatchId);
    } catch (err: any) {
      console.error('Cancel batch error:', err);
    } finally {
      setCanceling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
        return <Badge variant="primary">Processing...</Badge>;
      case 'queued':
        return <Badge variant="warning">Queued</Badge>;
      case 'completed_with_errors':
        return <Badge variant="warning">Completed with Errors</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
            Processing History & Queue
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitor background Sharp rendering tasks, track item progress, and trigger error retries.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchBatches}>
          <RotateCw className="w-3.5 h-3.5 mr-1" />
          Refresh Status
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-heading">
                <th className="py-3 px-5">Batch ID / Template</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Progress</th>
                <th className="py-3 px-5">Format</th>
                <th className="py-3 px-5">Started By</th>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#64748B]">
                    Loading processing history...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#64748B]">
                    No batch operations recorded yet.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const total = batch.counters?.total || 0;
                  const completed = batch.counters?.completed || 0;
                  const failed = batch.counters?.failed || 0;
                  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const isRunning = batch.status === 'processing' || batch.status === 'queued';

                  return (
                    <tr key={batch._id} className="hover:bg-[#F8FAFC]/60 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-[#1E293B] font-heading">
                          {batch.templateId?.name || 'Custom Watermark Batch'}
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B]">
                          ID: {batch._id.slice(-8)}
                        </div>
                      </td>

                      <td className="py-3.5 px-5">{getStatusBadge(batch.status)}</td>

                      <td className="py-3.5 px-5 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-[#64748B]">
                            <span>
                              {completed} / {total} done
                            </span>
                            {failed > 0 && (
                              <span className="text-[#DC2626] font-semibold">({failed} failed)</span>
                            )}
                          </div>
                          <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                failed > 0 ? 'bg-[#D97706]' : 'bg-[#16A34A]'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 uppercase font-mono text-[11px] text-[#64748B]">
                        {batch.outputSettings?.format || 'JPEG'} @ {batch.outputSettings?.quality || 90}%
                      </td>

                      <td className="py-3.5 px-5 text-[#64748B]">
                        {batch.requestedBy?.name || 'User'}
                      </td>

                      <td className="py-3.5 px-5 text-[#64748B]">
                        {new Date(batch.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDetails(batch._id)}
                            title="Inspect items"
                            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#1E293B] transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canProcess && failed > 0 && (
                            <button
                              onClick={() => handleRetry(batch._id)}
                              title="Retry Failed Items"
                              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#D97706] hover:bg-[#D97706]/10 transition"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canProcess && isRunning && (
                            <button
                              onClick={() => setCancelBatchTarget(batch._id)}
                              title="Cancel Batch"
                              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#DC2626] hover:bg-[#DC2626]/10 transition cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Batch Item Inspection Modal */}
      {inspectBatchId && (
        <Modal
          isOpen={!!inspectBatchId}
          onClose={() => setInspectBatchId(null)}
          title={`Batch Details: ${inspectBatch?.templateId?.name || 'Watermark Job'}`}
          description={`Batch ID: ${inspectBatchId}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            {loadingDetails ? (
              <div className="py-8 text-center text-xs text-[#64748B]">Loading items...</div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#E2E8F0]">
                {batchItems.map((item) => (
                  <div key={item._id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] overflow-hidden border border-[#E2E8F0] flex items-center justify-center flex-shrink-0">
                        {item.outputAssetId ? (
                          <img
                            src={assetsApi.getViewUrl(item.outputAssetId)}
                            alt="Result"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Images className="w-4 h-4 text-[#CBD5E1]" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-[#1E293B] font-heading">
                          {item.designId?.filename || 'Jewellery Design'}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono">
                          SKU: {item.designId?.sku || 'N/A'}
                        </div>
                        {item.errorDetails && (
                          <div className="text-[11px] text-[#DC2626]">{item.errorDetails}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.status === 'completed' && (
                        <Badge variant="success">Processed</Badge>
                      )}
                      {item.status === 'processing' && (
                        <Badge variant="primary">Processing</Badge>
                      )}
                      {item.status === 'failed' && <Badge variant="danger">Failed</Badge>}
                      {item.status === 'pending' && <Badge variant="neutral">Pending</Badge>}

                      {item.outputAssetId && canDownloadOutput && (
                        <a
                          href={assetsApi.getDownloadUrl(item.outputAssetId._id)}
                          download
                          className="text-[#7C3AED] hover:underline font-semibold"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reusable Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!cancelBatchTarget}
        onClose={() => setCancelBatchTarget(null)}
        onConfirm={confirmCancelJob}
        title="Cancel Processing Batch?"
        description="Are you sure you want to cancel this processing job? Any images already watermarked will be saved, but remaining queue items will be stopped."
        confirmText="Cancel Batch"
        variant="warning"
        loading={canceling}
      />
    </div>
  );
};
