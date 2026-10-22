import React, { useState, useRef } from 'react';
import { useWatermarkStore } from '../../store/watermarkStore.js';
import { uploadApi } from '../../api/index.js';
import {
  Image as ImageIcon,
  UploadCloud,
  Link2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '../common/index.js';

export const LogoSettings: React.FC = () => {
  const { config, updateLogoConfig } = useWatermarkStore();
  const logoConfig = config.logoConfig;

  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;

    // Check valid image
    const validMimes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validMimes.includes(file.type)) {
      setUploadError('Please select a PNG, SVG, JPEG, or WebP logo file.');
      return;
    }

    setUploadError(null);
    setUploadSuccess(false);

    // 1. Instant local preview via FileReader so Konva canvas updates without latency
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        updateLogoConfig({
          logoUrl: dataUrl,
          enabled: true,
        });
      }
    };
    reader.readAsDataURL(file);

    // 2. Upload file to backend & Cloudinary
    setUploading(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await uploadApi.uploadLogo(formData);
      const { assetId, url } = res.data.data;
      updateLogoConfig({
        logoAssetId: assetId,
        logoUrl: url || logoConfig.logoUrl,
        enabled: true,
      });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      console.warn('Backend logo sync warning:', err);
      // Local preview is already active on canvas so designer can keep working
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    updateLogoConfig({
      logoUrl: '',
      logoAssetId: undefined,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
        <label className="text-xs font-semibold text-[#1E293B] font-heading flex items-center gap-1.5 cursor-pointer">
          <ImageIcon className="w-3.5 h-3.5 text-[#B8860B]" />
          Company Logo Watermark
        </label>
        <input
          type="checkbox"
          checked={logoConfig.enabled}
          onChange={(e) => updateLogoConfig({ enabled: e.target.checked })}
          className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0] cursor-pointer"
        />
      </div>

      {logoConfig.enabled && (
        <div className="space-y-4">
          {/* Choice Tabs: File Upload vs URL Input */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-lg gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`flex-1 py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 ${
                inputMode === 'upload'
                  ? 'bg-white text-[#7C3AED] font-semibold shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload Logo File
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`flex-1 py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1.5 ${
                inputMode === 'url'
                  ? 'bg-white text-[#7C3AED] font-semibold shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Enter Logo URL
            </button>
          </div>

          {/* Mode 1: File Upload */}
          {inputMode === 'upload' && (
            <div className="space-y-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
                className="hidden"
              />

              {logoConfig.logoUrl ? (
                /* Existing Logo Preview Card */
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Checkerboard container for logo transparency */}
                    <div
                      className="w-12 h-12 rounded-lg border border-[#E2E8F0] overflow-hidden flex items-center justify-center p-1 bg-white flex-shrink-0"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                      }}
                    >
                      <img
                        src={logoConfig.logoUrl}
                        alt="Logo watermark"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1E293B] font-heading flex items-center gap-1 truncate">
                        Active Logo
                        {uploadSuccess && <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />}
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate">
                        {uploading ? 'Syncing with Cloudinary...' : 'Ready on Canvas'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 text-[11px] font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-lg transition"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1 text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg transition"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Drag & Drop Upload Trigger */
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelected(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#CBD5E1] hover:border-[#7C3AED] bg-white rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center mb-2 group-hover:scale-105 transition">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[#1E293B] font-heading">
                    Click to browse or drop logo file
                  </span>
                  <span className="text-[10px] text-[#64748B] mt-0.5">
                    PNG with transparent background, SVG, JPEG, or WebP
                  </span>
                </div>
              )}

              {uploadError && (
                <div className="p-2 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center gap-1.5 text-[11px] text-[#DC2626]">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Enter URL Input */}
          {inputMode === 'url' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#64748B] block">
                Direct Image URL or Cloudinary CDN Link
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={logoConfig.logoUrl || ''}
                  onChange={(e) =>
                    updateLogoConfig({
                      logoUrl: e.target.value.trim(),
                      enabled: true,
                    })
                  }
                  placeholder="https://res.cloudinary.com/... or https://..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#1E293B] focus:outline-none focus:border-[#7C3AED]"
                />
                <Link2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              </div>
              <p className="text-[10px] text-[#64748B]">
                Paste any publicly hosted logo link (HTTPS supported).
              </p>
            </div>
          )}

          {/* Scale & Opacity */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
                <span>Scale Ratio</span>
                <span className="text-[#1E293B]">{Math.round(logoConfig.scaleRatio * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.45"
                step="0.01"
                value={logoConfig.scaleRatio}
                onChange={(e) => updateLogoConfig({ scaleRatio: parseFloat(e.target.value) })}
                className="w-full accent-[#7C3AED] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
                <span>Opacity</span>
                <span className="text-[#1E293B]">{Math.round(logoConfig.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={logoConfig.opacity}
                onChange={(e) => updateLogoConfig({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-[#7C3AED] cursor-pointer"
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-[#64748B] mb-1">
              <span>Rotation</span>
              <span className="text-[#1E293B]">{logoConfig.rotation}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={logoConfig.rotation}
              onChange={(e) => updateLogoConfig({ rotation: parseInt(e.target.value, 10) })}
              className="w-full accent-[#7C3AED] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
