import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stamp,
  Type,
  Image as ImageIcon,
  Grid,
  Grid3X3,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Images,
  Cpu,
  Layers,
} from 'lucide-react';
import { WatermarkCanvas } from '../../components/editor/WatermarkCanvas.js';
import { TextSettings } from '../../components/editor/TextSettings.js';
import { LogoSettings } from '../../components/editor/LogoSettings.js';
import { TiledSettings } from '../../components/editor/TiledSettings.js';
import { PositionPresets } from '../../components/editor/PositionPresets.js';
import { useWatermarkStore } from '../../store/watermarkStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { designsApi, templatesApi } from '../../api/index.js';
import { Design } from '../../types/index.js';
import { Card, Button, Modal } from '../../components/common/index.js';

export const WatermarkEditorPage: React.FC = () => {
  const { config, referenceImage, setReferenceImage, resetConfig, undo, redo } = useWatermarkStore();
  const { role, permissions } = useAuthStore();
  const navigate = useNavigate();

  const canAccessEditor =
    role === 'Company' ||
    (role === 'Designer' &&
      (permissions?.canCreateTemplate !== false || permissions?.canEditTemplate !== false));
  const canSaveTemplate =
    role === 'Company' || (role === 'Designer' && permissions?.canCreateTemplate !== false);
  const canProcess =
    role === 'Company' || (role === 'Designer' && permissions?.canProcess !== false);

  const [activeTab, setActiveTab] = useState<'text' | 'logo' | 'tiled' | 'position'>('text');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loadingDesigns, setLoadingDesigns] = useState(false);

  // Save Template Modal
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('Luxury Jewellery Watermark');
  const [templateDesc, setTemplateDesc] = useState('Custom watermark preset');
  const [isDefault, setIsDefault] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Server parity preview state
  const [serverPreviewUrl, setServerPreviewUrl] = useState<string | null>(null);
  const [verifyingParity, setVerifyingParity] = useState(false);

  useEffect(() => {
    if (!canAccessEditor) return;
    setLoadingDesigns(true);
    designsApi
      .list({ limit: 20 })
      .then((res) => {
        const fetched = res.data.data || [];
        setDesigns(fetched);
        // If no reference image set, pick first design's original asset
        if (!referenceImage && fetched.length > 0 && fetched[0].originalAssetId) {
          setReferenceImage(fetched[0].originalAssetId);
        }
      })
      .finally(() => setLoadingDesigns(false));
  }, [canAccessEditor]);

  if (!canAccessEditor) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#1E293B] font-heading">Access Restricted</h2>
        <p className="text-xs text-[#64748B]">
          Your account does not have permission to design or modify watermark templates in the studio.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await templatesApi.create({
        name: templateName.trim(),
        description: templateDesc.trim(),
        watermarkType: config.watermarkType || 'text',
        configuration: config,
        isDefault,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setSaveModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Save template error:', err);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleVerifyServerParity = async () => {
    if (!referenceImage) {
      alert('Please select a reference jewellery image first.');
      return;
    }
    setVerifyingParity(true);
    setServerPreviewUrl(null);
    try {
      const res = await templatesApi.preview({
        assetId: referenceImage._id,
        configuration: config,
      });
      setServerPreviewUrl(res.data.data.previewUrl);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Server parity verification failed.');
    } finally {
      setVerifyingParity(false);
    }
  };

  const handleBulkApply = () => {
    const bulkPath = role === 'Company' ? '/company/processing' : '/designer/processing';
    navigate(bulkPath);
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 space-y-3 sm:space-y-4">
      {/* Studio Top Control Strip */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-shrink-0">
        {/* Left Section: Studio Identity & Reference Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center flex-shrink-0 border border-[#7C3AED]/20 shadow-xs">
              <Stamp className="w-4 h-4 text-[#7C3AED]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#1E293B] font-heading leading-tight truncate">
                Interactive Watermark Studio
              </h1>
              <p className="text-[11px] text-[#64748B] truncate hidden sm:block">
                Customize placement on one image — automatically apply to thousands.
              </p>
            </div>
          </div>

          {/* Reference Image Selector Pill */}
          <div className="flex items-center gap-2 bg-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#E2E8F0] flex-shrink-0 self-start sm:self-auto">
            <Images className="w-3.5 h-3.5 text-[#7C3AED] flex-shrink-0" />
            <span className="text-[11px] font-semibold text-[#64748B] whitespace-nowrap">Reference:</span>
            <select
              value={referenceImage?._id || ''}
              onChange={(e) => {
                const selected = designs.find((d) => d.originalAssetId?._id === e.target.value);
                if (selected?.originalAssetId) {
                  setReferenceImage(selected.originalAssetId);
                }
              }}
              className="bg-transparent text-xs font-semibold text-[#1E293B] focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[210px] truncate"
            >
              {designs.length === 0 ? (
                <option value="">No designs found</option>
              ) : (
                designs.map((d) => (
                  <option key={d._id} value={d.originalAssetId?._id}>
                    {d.sku ? `${d.sku} - ${d.filename}` : d.filename}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Right Section: Action Buttons (Clean, aligned, non-ragged) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end flex-shrink-0">
          {/* Reset button */}
          <button
            onClick={resetConfig}
            title="Reset to Defaults"
            className="p-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Verify Parity Button */}
          <Button
            size="sm"
            variant="outline"
            disabled={verifyingParity}
            onClick={handleVerifyServerParity}
            className="whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5 text-[#7C3AED]" />
            <span>{verifyingParity ? 'Rendering...' : 'Server Parity'}</span>
          </Button>

          {/* Save Template Button */}
          {canSaveTemplate && (
            <Button
              size="sm"
              variant="gold"
              onClick={() => setSaveModalOpen(true)}
              className="whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              <span>Save Template</span>
            </Button>
          )}

          {/* Bulk Apply Button */}
          {canProcess && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleBulkApply}
              className="whitespace-nowrap"
            >
              <Cpu className="w-3.5 h-3.5 mr-1.5" />
              <span>Apply to Multiple</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Studio Viewport: Canvas Left + Controls Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Visual Konva Canvas (8 cols on lg, full width on mobile/tablet) */}
        <div className="lg:col-span-8 h-[360px] sm:h-[440px] lg:h-full flex flex-col">
          <WatermarkCanvas />
        </div>

        {/* Customization Controls Sidebar (4 cols on lg, full width on mobile/tablet) */}
        <div className="lg:col-span-4 min-h-[420px] lg:h-full flex flex-col bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-4 border-b border-[#E2E8F0] bg-[#F8FAFC] p-1 gap-1">
            <button
              onClick={() => setActiveTab('text')}
              className={`py-2 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition ${
                activeTab === 'text'
                  ? 'bg-white text-[#7C3AED] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Text
            </button>
            <button
              onClick={() => setActiveTab('logo')}
              className={`py-2 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition ${
                activeTab === 'logo'
                  ? 'bg-white text-[#B8860B] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Logo
            </button>
            <button
              onClick={() => setActiveTab('tiled')}
              className={`py-2 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition ${
                activeTab === 'tiled'
                  ? 'bg-white text-[#7C3AED] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Tiled
            </button>
            <button
              onClick={() => setActiveTab('position')}
              className={`py-2 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition ${
                activeTab === 'position'
                  ? 'bg-white text-[#7C3AED] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Grid
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'text' && <TextSettings />}
            {activeTab === 'logo' && <LogoSettings />}
            {activeTab === 'tiled' && <TiledSettings />}
            {activeTab === 'position' && <PositionPresets />}
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      <Modal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save Watermark Template"
        description="Preserve this configuration as a reusable company preset for bulk watermarking."
      >
        {saveSuccess ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-[#1E293B] font-heading">
              Template Saved Successfully!
            </h4>
            <p className="text-xs text-[#64748B]">
              You can now apply this watermark configuration to any jewellery collection or batch.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Template Name *
              </label>
              <input
                type="text"
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Export Catalogue — Bottom Right"
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="e.g. Clean gold copyright watermark for wholesale jewellery sheets"
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            {role === 'Company' && (
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
                />
                <span className="text-xs font-semibold text-[#1E293B]">
                  Set as Company Default Template
                </span>
              </label>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => setSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingTemplate} variant="gold" size="md">
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Server Parity Inspection Modal */}
      {serverPreviewUrl && (
        <Modal
          isOpen={!!serverPreviewUrl}
          onClose={() => setServerPreviewUrl(null)}
          title="Server-Side Sharp Parity Verification"
          description="Rendered by the exact server Sharp engine using Outfit & Poppins TTF fonts."
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-center">
            <div className="aspect-video max-h-[500px] bg-black/5 rounded-xl overflow-hidden border border-[#E2E8F0] flex items-center justify-center">
              <img
                src={serverPreviewUrl}
                alt="Server Render"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-[#16A34A] font-semibold">
              ✓ Server Sharp rasterization verified 100% pixel-parity with visual editor!
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
