import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Eye, Download, ArrowLeft, SplitSquareVertical, Images } from 'lucide-react';
import { designsApi, assetsApi } from '../../api/index.js';
import { Design } from '../../types/index.js';
import { Card, Button, Badge } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const ImagePreviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const designId = searchParams.get('designId');
  const { role, company } = useAuthStore();

  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [viewMode, setViewMode] = useState<'watermarked' | 'original' | 'split'>('watermarked');
  const [loading, setLoading] = useState(true);

  const allowDownload = company?.settings?.allowViewerDownload ?? true;
  const canDownloadThisAsset =
    allowDownload &&
    (viewMode === 'watermarked' || viewMode === 'split'
      ? !!selectedDesign?.activeProcessedAssetId
      : role !== 'Viewer');

  useEffect(() => {
    designsApi.list({ limit: 50 }).then((res) => {
      const list = res.data.data || [];
      setDesigns(list);
      if (designId) {
        const found = list.find((d: Design) => d._id === designId);
        if (found) setSelectedDesign(found);
        else if (list.length > 0) setSelectedDesign(list[0]);
      } else if (list.length > 0) {
        setSelectedDesign(list[0]);
      }
      setLoading(false);
    });
  }, [designId]);

  if (loading) {
    return <div className="py-12 text-center text-xs text-[#64748B]">Loading viewer preview...</div>;
  }

  if (!selectedDesign) {
    return (
      <div className="py-12 text-center text-xs text-[#64748B]">
        No designs available in this catalogue.
      </div>
    );
  }

  const downloadAssetId =
    viewMode === 'original' && role !== 'Viewer'
      ? selectedDesign.originalAssetId
      : (selectedDesign.activeProcessedAssetId || selectedDesign.originalAssetId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/viewer/gallery">
            <button className="p-2 rounded-lg border border-[#E2E8F0] hover:bg-white text-[#64748B]">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B] font-heading">
              {selectedDesign.filename}
            </h1>
            <p className="text-xs text-[#64748B]">
              SKU: <span className="font-semibold text-[#7C3AED] font-mono">{selectedDesign.sku || 'N/A'}</span>
            </p>
          </div>
        </div>

        {/* View Controls & Download */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-lg p-1 text-xs">
            <button
              onClick={() => setViewMode('watermarked')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === 'watermarked' ? 'bg-[#7C3AED] text-white' : 'text-[#64748B]'
              }`}
            >
              Watermarked
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === 'original' ? 'bg-[#7C3AED] text-white' : 'text-[#64748B]'
              }`}
            >
              Original Master
            </button>
            {selectedDesign.activeProcessedAssetId && (
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  viewMode === 'split' ? 'bg-[#7C3AED] text-white' : 'text-[#64748B]'
                }`}
              >
                Split Compare
              </button>
            )}
          </div>

          {canDownloadThisAsset && downloadAssetId && (
            <a href={assetsApi.getDownloadUrl(downloadAssetId)} download>
              <Button size="sm" variant="gold">
                <Download className="w-3.5 h-3.5 mr-1" />
                Download {viewMode === 'original' ? 'Master' : 'Watermarked'}
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Main Image Display */}
      <Card className="p-4 flex items-center justify-center bg-[#F8FAFC]">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="text-center space-y-1.5">
              <span className="text-xs font-semibold text-[#64748B]">Original Piece</span>
              <div className="aspect-square bg-white rounded-xl border border-[#E2E8F0] overflow-hidden flex items-center justify-center p-2">
                <img
                  src={assetsApi.getViewUrl(selectedDesign.originalAssetId)}
                  alt="Original"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="text-center space-y-1.5">
              <span className="text-xs font-semibold text-[#7C3AED]">Watermarked Copy</span>
              <div className="aspect-square bg-white rounded-xl border border-[#E2E8F0] overflow-hidden flex items-center justify-center p-2">
                <img
                  src={assetsApi.getViewUrl(selectedDesign.activeProcessedAssetId)}
                  alt="Watermarked"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-h-[600px] flex items-center justify-center">
            <img
              src={
                viewMode === 'watermarked' && selectedDesign.activeProcessedAssetId
                  ? assetsApi.getViewUrl(selectedDesign.activeProcessedAssetId)
                  : assetsApi.getViewUrl(selectedDesign.originalAssetId)
              }
              alt="Jewellery piece"
              className="max-h-[550px] object-contain rounded-xl shadow-xs"
            />
          </div>
        )}
      </Card>

      {/* Image Carousel Strip */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#1E293B] font-heading">
          Browse Other Pieces in Catalogue:
        </span>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {designs.map((d) => {
            const asset = d.activeProcessedAssetId || d.originalAssetId;
            const isCurrent = d._id === selectedDesign._id;
            return (
              <button
                key={d._id}
                onClick={() => setSelectedDesign(d)}
                className={`flex-shrink-0 w-20 h-20 rounded-xl border overflow-hidden p-1 bg-white transition ${
                  isCurrent
                    ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                {asset ? (
                  <img
                    src={assetsApi.getViewUrl(asset)}
                    alt={d.filename}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Images className="w-6 h-6 text-[#CBD5E1] m-auto" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
