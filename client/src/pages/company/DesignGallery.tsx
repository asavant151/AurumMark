import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Images,
  Search,
  Filter,
  Sparkles,
  Download,
  Trash2,
  Stamp,
  CheckSquare,
  Square,
  Eye,
  ExternalLink,
  SplitSquareVertical,
  Upload,
  FileArchive,
  CheckCircle2,
} from 'lucide-react';
import { designsApi, projectsApi, exportsApi, assetsApi } from '../../api/index.js';
import { Design, Project } from '../../types/index.js';
import { Card, Button, Badge, Modal, EmptyState, ConfirmDeleteModal } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';
import { useWatermarkStore } from '../../store/watermarkStore.js';

export const DesignGallery: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';
  const initialStatus = searchParams.get('status') || 'all';

  const { role, permissions, company } = useAuthStore();
  const setReferenceImage = useWatermarkStore((s) => s.setReferenceImage);
  const navigate = useNavigate();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [selectedProject, setSelectedProject] = useState(initialProjectId);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');

  // Preview Modal
  const [previewDesign, setPreviewDesign] = useState<Design | null>(null);
  const [compareMode, setCompareMode] = useState<'watermarked' | 'original' | 'split'>('watermarked');
  const [exporting, setExporting] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Dual Viewing: 'watermarked' (default) vs 'original' (master uploads) vs 'both'
  const [galleryViewMode, setGalleryViewMode] = useState<'watermarked' | 'original' | 'both'>('watermarked');
  // Card-specific overrides (allows flipping a single card directly)
  const [cardViewOverrides, setCardViewOverrides] = useState<Record<string, 'watermarked' | 'original'>>({});
  // Reusable Delete Modal state
  const [deleteDesignTarget, setDeleteDesignTarget] = useState<Design | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canUpload = role === 'Company' || (role === 'Designer' && permissions?.canUpload !== false);
  const canDelete = role === 'Company' || (role === 'Designer' && permissions?.canDeleteDesign !== false);
  const canProcess = role === 'Company' || (role === 'Designer' && permissions?.canProcess !== false);
  const canDownloadSingle =
    role === 'Company' ||
    role === 'Designer' ||
    (role === 'Viewer' && company?.settings?.allowViewerDownload !== false);
  const canDownloadMaster = role === 'Company' || role === 'Designer';
  const canDownloadZip =
    role === 'Company' ||
    (role === 'Designer' && permissions?.canExportZip !== false) ||
    (role === 'Viewer' && company?.settings?.allowViewerZipDownload === true);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const res = await designsApi.list({
        projectId: selectedProject || undefined,
        processingStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery || undefined,
        limit: 100,
      });
      setDesigns(res.data.data || []);
    } catch (err) {
      console.error('Failed to load designs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    projectsApi.list().then((res) => setProjects(res.data.data || []));
  }, []);

  useEffect(() => {
    fetchDesigns();
  }, [selectedProject, selectedStatus, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.length === designs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(designs.map((d) => d._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const confirmDeleteDesign = async () => {
    if (!deleteDesignTarget) return;
    setDeleting(true);
    try {
      await designsApi.delete(deleteDesignTarget._id);
      setDeleteDesignTarget(null);
      fetchDesigns();
      setDownloadToast(`✓ Deleted ${deleteDesignTarget.filename}`);
      setTimeout(() => setDownloadToast(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete design:', err);
      setDownloadToast(`⚠ Delete failed: ${err.response?.data?.message || err.message}`);
      setTimeout(() => setDownloadToast(null), 4000);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenInEditor = (design: Design) => {
    if (design.originalAssetId) {
      setReferenceImage(design.originalAssetId);
      const editorPath = role === 'Company' ? '/company/editor' : '/designer/editor';
      navigate(editorPath);
    }
  };

  const handleBulkProcess = () => {
    const processingPath =
      role === 'Company' ? '/company/processing' : '/designer/processing';
    navigate(`${processingPath}?designIds=${selectedIds.join(',')}`);
  };

  const handleDownloadSelected = async (targetType: 'watermarked' | 'original' | 'both' = 'watermarked') => {
    if (selectedIds.length === 0) return;
    const selectedDesigns = designs.filter((d) => selectedIds.includes(d._id));

    // Case 1: Single image selected -> Direct instant download
    if (selectedDesigns.length === 1 && targetType !== 'both') {
      const design = selectedDesigns[0];
      const asset =
        targetType === 'original'
          ? design.originalAssetId
          : design.activeProcessedAssetId || design.originalAssetId;
      if (!asset) return;

      const link = document.createElement('a');
      link.href = assetsApi.getDownloadUrl(asset);
      link.setAttribute('download', asset.originalFilename || design.filename || 'jewellery.webp');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadToast(`✓ Downloaded ${asset.originalFilename || design.filename}`);
      setTimeout(() => setDownloadToast(null), 3500);
      return;
    }

    // Case 2: Multiple images selected -> Direct ZIP export & download
    setExporting(true);
    const label =
      targetType === 'original'
        ? 'Original Masters'
        : targetType === 'both'
        ? 'Complete Bundle (Originals + Watermarked)'
        : 'Watermarked';

    setDownloadToast(`⏳ Preparing ZIP archive (${label}) for ${selectedDesigns.length} designs...`);
    try {
      let targetAssets: any[] = [];
      if (targetType === 'original') {
        targetAssets = selectedDesigns.map((d) => d.originalAssetId).filter(Boolean);
      } else if (targetType === 'watermarked') {
        targetAssets = selectedDesigns
          .map((d) => d.activeProcessedAssetId || d.originalAssetId)
          .filter(Boolean);
      } else {
        // Both: includes original AND active processed
        selectedDesigns.forEach((d) => {
          if (d.originalAssetId) targetAssets.push(d.originalAssetId);
          if (d.activeProcessedAssetId) targetAssets.push(d.activeProcessedAssetId);
        });
      }

      const assetIds = targetAssets
        .map((a) => a?._id || (typeof a === 'string' ? a : null))
        .filter(Boolean) as string[];

      const res = await exportsApi.createExport({ assetIds });
      let token = res.data.data?.downloadToken;
      let ready = res.data.data?.status === 'completed';

      // If still processing, poll briefly until ready
      if (!ready && res.data.data?._id) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 400));
          const checkRes = await exportsApi.getExportById(res.data.data._id);
          if (checkRes.data.data?.status === 'completed') {
            token = checkRes.data.data.downloadToken;
            ready = true;
            break;
          }
        }
      }

      if (token) {
        const downloadUrl = exportsApi.getDownloadUrl(token);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `AurumMark_${targetType}_${Date.now()}.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloadToast(`✓ Downloaded ZIP archive with ${assetIds.length} images!`);
        setTimeout(() => setDownloadToast(null), 4000);
      } else {
        setDownloadToast('⚠ ZIP archive creation in progress. Please check back shortly.');
        setTimeout(() => setDownloadToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Download failed:', err);
      setDownloadToast(`⚠ Download error: ${err.response?.data?.message || err.message || 'Export failed'}`);
      setTimeout(() => setDownloadToast(null), 5000);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadSingleImages = () => {
    if (selectedIds.length === 0) return;
    const selectedDesigns = designs.filter((d) => selectedIds.includes(d._id));

    selectedDesigns.forEach((design, idx) => {
      const asset = design.activeProcessedAssetId || design.originalAssetId;
      if (!asset) return;
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = assetsApi.getDownloadUrl(asset);
        link.setAttribute('download', asset.originalFilename || design.filename || 'jewellery.webp');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, idx * 300);
    });

    setDownloadToast(`✓ Downloading ${selectedDesigns.length} individual images...`);
    setTimeout(() => setDownloadToast(null), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">Design Gallery</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Browse high-resolution jewellery items, preview watermarks, and trigger batch operations.
          </p>
        </div>

        {canUpload && (
          <Link to={role === 'Company' ? '/company/upload' : '/designer/upload'}>
            <Button variant="primary" size="md">
              <Upload className="w-3.5 h-3.5 mr-1" />
              Upload Images
            </Button>
          </Link>
        )}
      </div>

      {/* Control Toolbar */}
      <Card className="p-4 space-y-3">
        {/* Dual Viewing Switcher: Watermarked vs Original Masters vs Dual View */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mr-1">
              View Mode:
            </span>
            <button
              type="button"
              onClick={() => {
                setGalleryViewMode('watermarked');
                setCardViewOverrides({});
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                galleryViewMode === 'watermarked'
                  ? 'bg-[#7C3AED] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Watermarked Copies
            </button>
            <button
              type="button"
              onClick={() => {
                setGalleryViewMode('original');
                setCardViewOverrides({});
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                galleryViewMode === 'original'
                  ? 'bg-[#1E293B] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-white'
              }`}
            >
              <Images className="w-3.5 h-3.5" />
              Original Master Uploads
            </button>
            <button
              type="button"
              onClick={() => {
                setGalleryViewMode('both');
                setCardViewOverrides({});
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                galleryViewMode === 'both'
                  ? 'bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-white'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              Dual / Comparison View
            </button>
          </div>

          <div className="text-[11px] text-[#64748B] font-medium">
            Total Designs: <span className="font-bold text-[#1E293B]">{designs.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by filename or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Collection Filter */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-lg bg-white font-medium focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="">All Collections</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-lg bg-white font-medium focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="all">All Statuses</option>
              <option value="unprocessed">Unprocessed Masters</option>
              <option value="processed">Watermarked Copies</option>
              <option value="processing">In Processing</option>
              <option value="failed">Failed Jobs</option>
            </select>
          </div>
        </div>

        {/* Multi-Select Action Bar */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 font-semibold text-[#64748B] hover:text-[#1E293B]"
          >
            {selectedIds.length === designs.length && designs.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-[#7C3AED]" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Select All ({selectedIds.length} of {designs.length})
          </button>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {canProcess && (
                <Button variant="primary" size="sm" onClick={handleBulkProcess}>
                  <Stamp className="w-3.5 h-3.5 mr-1" />
                  Watermark Selected ({selectedIds.length})
                </Button>
              )}

              {selectedIds.length === 1 ? (
                <div className="flex items-center gap-1.5">
                  {canDownloadSingle && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exporting}
                      onClick={() => handleDownloadSelected('watermarked')}
                      className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 font-semibold"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download Watermarked
                    </Button>
                  )}
                  {canDownloadMaster && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exporting}
                      onClick={() => handleDownloadSelected('original')}
                      className="border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A]/10 font-semibold"
                    >
                      <Images className="w-3.5 h-3.5 mr-1" />
                      Download Master
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {canDownloadZip && (
                    <>
                      <Button
                        variant="gold"
                        size="sm"
                        disabled={exporting}
                        onClick={() => handleDownloadSelected('watermarked')}
                        className="shadow-sm font-semibold"
                      >
                        <FileArchive className="w-3.5 h-3.5 mr-1" />
                        {exporting ? 'Creating ZIP...' : `Download Watermarked ZIP (${selectedIds.length})`}
                      </Button>

                      {canDownloadMaster && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={exporting}
                            onClick={() => handleDownloadSelected('original')}
                            className="border-[#1E293B] text-[#1E293B] hover:bg-slate-100 font-semibold"
                            title="Download raw original master photos in ZIP"
                          >
                            <FileArchive className="w-3.5 h-3.5 mr-1" />
                            Download Masters ZIP
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={exporting}
                            onClick={() => handleDownloadSelected('both')}
                            className="border-[#B8860B] text-[#B8860B] hover:bg-[#B8860B]/10 font-semibold"
                            title="Download ZIP with both Originals and Watermarked organized into folders"
                          >
                            <FileArchive className="w-3.5 h-3.5 mr-1" />
                            Download Both (ZIP Bundle)
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  {canDownloadSingle && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={exporting}
                      onClick={handleDownloadSingleImages}
                      title="Download each image individually without zipping"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Individual Images ({selectedIds.length})
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Gallery Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#64748B]">Loading jewellery gallery...</div>
      ) : designs.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No Jewellery Designs Found"
          description="Upload your original jewellery photography or select another collection filter."
          actionText={canUpload ? 'Upload Jewellery Images' : undefined}
          onAction={canUpload ? () => navigate(role === 'Company' ? '/company/upload' : '/designer/upload') : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {designs.map((design) => {
            const isSelected = selectedIds.includes(design._id);
            const hasProcessed = !!design.activeProcessedAssetId;

            // Determine which version to show: individual card override takes precedence, then galleryViewMode
            const cardMode =
              cardViewOverrides[design._id] ||
              (galleryViewMode === 'original' ? 'original' : 'watermarked');

            const displayAsset =
              cardMode === 'original'
                ? design.originalAssetId
                : design.activeProcessedAssetId || design.originalAssetId;

            const previewUrl = displayAsset ? assetsApi.getViewUrl(displayAsset) : '';

            return (
              <div
                key={design._id}
                className={`bg-white rounded-xl border overflow-hidden shadow-xs group transition flex flex-col justify-between ${
                  isSelected ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-square bg-[#F1F5F9] overflow-hidden flex items-center justify-center">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={design.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <Images className="w-8 h-8 text-[#CBD5E1]" />
                  )}

                  {/* Checkbox overlay (Elevated with z-20 and crisp styling) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(design._id);
                    }}
                    className={`absolute top-2.5 left-2.5 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      isSelected
                        ? 'bg-[#7C3AED] text-white ring-2 ring-white scale-105'
                        : 'bg-white/95 text-[#64748B] hover:text-[#7C3AED] hover:bg-white border border-[#E2E8F0] hover:scale-105 active:scale-95'
                    }`}
                    title={isSelected ? 'Deselect image' : 'Select image'}
                    aria-label="Select design"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-white" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Card View Mode Toggle Pill (Original Master vs Watermarked) */}
                  {hasProcessed ? (
                    <div className="absolute top-2.5 right-2.5 z-20 flex items-center bg-white/95 backdrop-blur-xs rounded-lg p-0.5 border border-[#E2E8F0] shadow-sm pointer-events-auto">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardViewOverrides((prev) => ({
                            ...prev,
                            [design._id]: 'original',
                          }));
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          cardMode === 'original'
                            ? 'bg-[#1E293B] text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#1E293B]'
                        }`}
                        title="View Original Master Upload"
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardViewOverrides((prev) => ({
                            ...prev,
                            [design._id]: 'watermarked',
                          }));
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                          cardMode === 'watermarked'
                            ? 'bg-[#7C3AED] text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#1E293B]'
                        }`}
                        title="View Watermarked Version"
                      >
                        Watermarked
                      </button>
                    </div>
                  ) : (
                    <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
                      <Badge variant="neutral" size="sm">
                        Master Upload
                      </Badge>
                    </div>
                  )}

                  {/* Quick Action Overlay on Hover */}
                  <div className="absolute inset-0 z-10 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDesign(design);
                      }}
                      title="Inspect & Compare"
                      className="p-2 rounded-full bg-white text-[#1E293B] hover:text-[#7C3AED] transition shadow-md pointer-events-auto cursor-pointer hover:scale-110 active:scale-95"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canProcess && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInEditor(design);
                        }}
                        title="Open in Watermark Studio"
                        className="p-2 rounded-full bg-white text-[#1E293B] hover:text-[#B8860B] transition shadow-md pointer-events-auto cursor-pointer hover:scale-110 active:scale-95"
                      >
                        <Stamp className="w-4 h-4" />
                      </button>
                    )}

                    {design.activeProcessedAssetId && canDownloadSingle && (
                      <a
                        href={assetsApi.getDownloadUrl(design.activeProcessedAssetId)}
                        download={design.filename || 'jewellery_watermarked.webp'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadToast(`✓ Downloading Watermarked: ${design.filename}`);
                          setTimeout(() => setDownloadToast(null), 3000);
                        }}
                        title="Download Watermarked Image"
                        className="p-2 rounded-full bg-white text-[#1E293B] hover:text-[#7C3AED] transition shadow-md pointer-events-auto cursor-pointer hover:scale-110 active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}

                    {design.originalAssetId && canDownloadMaster && (
                      <a
                        href={assetsApi.getDownloadUrl(design.originalAssetId)}
                        download={design.filename || 'jewellery_master.webp'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadToast(`✓ Downloading Original Master: ${design.filename}`);
                          setTimeout(() => setDownloadToast(null), 3000);
                        }}
                        title="Download Original Master Photo"
                        className="p-2 rounded-full bg-white text-[#1E293B] hover:text-[#16A34A] transition shadow-md pointer-events-auto cursor-pointer hover:scale-110 active:scale-95"
                      >
                        <Images className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#7C3AED] font-mono truncate">
                      {design.sku || 'SKU-NONE'}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => setDeleteDesignTarget(design)}
                        title="Delete design"
                        className="text-[#CBD5E1] hover:text-[#DC2626] transition p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-[#1E293B] truncate mt-0.5" title={design.filename}>
                    {design.filename}
                  </div>
                  <div className="text-[10px] text-[#64748B] flex items-center justify-between mt-1 pt-1 border-t border-[#F1F5F9]">
                    <span>
                      {design.metadata?.width && design.metadata?.height
                        ? `${design.metadata.width}x${design.metadata.height}`
                        : 'Image'}
                    </span>
                    <span className="font-medium text-[#7C3AED]">
                      {hasProcessed ? (cardMode === 'original' ? 'Master View' : 'Watermarked') : 'Original'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compare Modal */}
      {previewDesign && (
        <Modal
          isOpen={!!previewDesign}
          onClose={() => setPreviewDesign(null)}
          title={`Jewellery Inspection: ${previewDesign.filename}`}
          description={`SKU: ${previewDesign.sku || 'N/A'}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={compareMode === 'watermarked' ? 'primary' : 'outline'}
                  onClick={() => setCompareMode('watermarked')}
                >
                  Watermarked Version
                </Button>
                <Button
                  size="sm"
                  variant={compareMode === 'original' ? 'primary' : 'outline'}
                  onClick={() => setCompareMode('original')}
                >
                  Original Master
                </Button>
                {previewDesign.activeProcessedAssetId && (
                  <Button
                    size="sm"
                    variant={compareMode === 'split' ? 'primary' : 'outline'}
                    onClick={() => setCompareMode('split')}
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5 mr-1" />
                    Side-by-Side Compare
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {previewDesign.originalAssetId && canDownloadMaster && (
                  <a
                    href={assetsApi.getDownloadUrl(previewDesign.originalAssetId)}
                    download={previewDesign.filename || 'jewellery_master.webp'}
                    onClick={() => {
                      setDownloadToast(`✓ Downloading Original Master: ${previewDesign.filename}`);
                      setTimeout(() => setDownloadToast(null), 3000);
                    }}
                  >
                    <Button size="sm" variant="outline">
                      <Images className="w-3.5 h-3.5 mr-1" /> Original Master
                    </Button>
                  </a>
                )}

                {previewDesign.activeProcessedAssetId && canDownloadSingle && (
                  <a
                    href={assetsApi.getDownloadUrl(previewDesign.activeProcessedAssetId)}
                    download={previewDesign.filename || 'jewellery_watermarked.webp'}
                    onClick={() => {
                      setDownloadToast(`✓ Downloading Watermarked: ${previewDesign.filename}`);
                      setTimeout(() => setDownloadToast(null), 3000);
                    }}
                  >
                    <Button size="sm" variant="gold">
                      <Download className="w-3.5 h-3.5 mr-1" /> Watermarked Copy
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {compareMode === 'split' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-center">
                  <span className="text-xs font-semibold text-[#64748B]">Original Master</span>
                  <div className="aspect-square bg-black/5 rounded-xl overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
                    <img
                      src={assetsApi.getViewUrl(previewDesign.originalAssetId)}
                      alt="Original"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <span className="text-xs font-semibold text-[#7C3AED]">Watermarked Copy</span>
                  <div className="aspect-square bg-black/5 rounded-xl overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
                    <img
                      src={assetsApi.getViewUrl(previewDesign.activeProcessedAssetId)}
                      alt="Watermarked"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video max-h-[500px] bg-black/5 rounded-xl overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
                <img
                  src={
                    compareMode === 'watermarked' && previewDesign.activeProcessedAssetId
                      ? assetsApi.getViewUrl(previewDesign.activeProcessedAssetId)
                      : assetsApi.getViewUrl(previewDesign.originalAssetId)
                  }
                  alt="Jewel Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </Modal>
      )}
      {/* Reusable Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteDesignTarget}
        onClose={() => setDeleteDesignTarget(null)}
        onConfirm={confirmDeleteDesign}
        title="Delete Jewellery Design?"
        description="Are you sure you want to delete this jewellery design and its processed images? This will permanently remove the original and watermarked assets from storage."
        itemName={deleteDesignTarget?.filename || deleteDesignTarget?.sku}
        confirmText="Delete Design"
        loading={deleting}
      />

      {/* Floating Download Toast Notification */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E293B] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{downloadToast}</span>
        </div>
      )}
    </div>
  );
};
