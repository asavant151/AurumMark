import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Cpu,
  Stamp,
  FolderKanban,
  Images,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { designsApi, templatesApi, projectsApi, processingApi } from '../../api/index.js';
import { Design, Project, WatermarkTemplate } from '../../types/index.js';
import { Card, Button, Badge } from '../../components/common/index.js';
import { useAuthStore } from '../../store/authStore.js';

export const BulkProcessingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialDesignIds = searchParams.get('designIds')?.split(',').filter(Boolean) || [];
  const initialTemplateId = searchParams.get('templateId') || '';

  const { role, company, permissions } = useAuthStore();
  const navigate = useNavigate();

  const canProcess =
    role === 'Company' || (role === 'Designer' && permissions?.canProcess !== false);

  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<WatermarkTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [selectedDesignIds, setSelectedDesignIds] = useState<string[]>(initialDesignIds);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>(
    company?.settings?.defaultOutputFormat || 'jpeg'
  );
  const [outputQuality, setOutputQuality] = useState(company?.settings?.defaultQuality ?? 90);
  const [stripMetadata, setStripMetadata] = useState(company?.settings?.sanitizeMetadata ?? true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canProcess) return;
    Promise.all([
      designsApi.list({ limit: 100 }),
      templatesApi.list(),
      projectsApi.list(),
    ]).then(([dRes, tRes, pRes]) => {
      setDesigns(dRes.data.data || []);
      const tmpls = tRes.data.data || [];
      setTemplates(tmpls);
      setProjects(pRes.data.data || []);

      if (!selectedTemplateId && tmpls.length > 0) {
        const def = tmpls.find((t: WatermarkTemplate) => t.isDefault) || tmpls[0];
        setSelectedTemplateId(def._id);
      }
    });
  }, [canProcess]);

  if (!canProcess) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#1E293B] font-heading">Access Restricted</h2>
        <p className="text-xs text-[#64748B]">
          Your role does not have permission to execute bulk watermark processing batches.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  // When project selector changes, select all designs in that project
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    if (projId) {
      const filtered = designs.filter((d) => d.projectId?._id === projId || d.projectId === projId);
      setSelectedDesignIds(filtered.map((d) => d._id));
    }
  };

  const handleLaunchBatch = async () => {
    if (selectedDesignIds.length === 0) {
      setError('Please select at least one jewellery design to process.');
      return;
    }
    if (!selectedTemplateId) {
      setError('Please choose a watermark template.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await processingApi.createBatch({
        designIds: selectedDesignIds,
        templateId: selectedTemplateId,
        outputSettings: {
          format: outputFormat,
          quality: Number(outputQuality),
          stripMetadata,
        },
      });

      const batchId = res.data.data._id;
      const historyPath =
        role === 'Company' ? '/company/history' : '/designer/history';
      navigate(`${historyPath}?activeBatch=${batchId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start processing batch.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
          Bulk Watermark Processing
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Apply a saved watermark configuration automatically across multiple jewellery catalogue images.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center gap-2 text-xs text-[#DC2626]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Select Images or Collection */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <div className="w-6 h-6 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold font-heading">
            1
          </div>
          <h3 className="text-sm font-bold text-[#1E293B] font-heading">
            Select Images or Collection
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Select an Entire Collection
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white font-medium focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="">Choose a collection...</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.designsCount || 0} images)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Target Images Selected
            </label>
            <div className="px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] font-semibold text-[#7C3AED]">
              {selectedDesignIds.length} jewellery images staged
            </div>
          </div>
        </div>

        {/* Small thumbnail previews of selected */}
        {selectedDesignIds.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-[#64748B] block mb-1.5">
              Staged Designs Preview:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto p-1 max-w-full">
              {designs
                .filter((d) => selectedDesignIds.includes(d._id))
                .slice(0, 10)
                .map((d) => (
                  <div
                    key={d._id}
                    className="flex-shrink-0 w-12 h-12 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] overflow-hidden"
                  >
                    <img
                      src={`/api/v1/assets/${d.originalAssetId?._id}/view`}
                      alt={d.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              {selectedDesignIds.length > 10 && (
                <span className="text-xs text-[#64748B] font-semibold pl-2">
                  +{selectedDesignIds.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Step 2: Select Watermark Template */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <div className="w-6 h-6 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold font-heading">
            2
          </div>
          <h3 className="text-sm font-bold text-[#1E293B] font-heading">
            Choose Watermark Template
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {templates.map((tmpl) => (
            <div
              key={tmpl._id}
              onClick={() => setSelectedTemplateId(tmpl._id)}
              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                selectedTemplateId === tmpl._id
                  ? 'border-[#7C3AED] bg-[#7C3AED]/5 ring-2 ring-[#7C3AED]/20'
                  : 'border-[#E2E8F0] hover:border-[#CBD5E1] bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#1E293B] font-heading truncate">
                    {tmpl.name}
                  </span>
                  {tmpl.isDefault && (
                    <Badge variant="gold" size="sm">
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] line-clamp-1">
                  {tmpl.description || 'Watermark preset'}
                </p>
              </div>

              <div className="mt-2 text-[10px] text-[#64748B] flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                <span className="capitalize">{tmpl.configuration?.positionPreset}</span>
                <span className="capitalize">{tmpl.configuration?.scalingPolicy}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Step 3: Configure Output Settings */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <div className="w-6 h-6 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-xs font-bold font-heading">
            3
          </div>
          <h3 className="text-sm font-bold text-[#1E293B] font-heading">
            Output Settings & Compression
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Render Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white font-semibold focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="jpeg">JPEG (High Compatibility)</option>
              <option value="png">PNG (Preserve Transparency)</option>
              <option value="webp">WebP (Modern Compact High Quality)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-[#1E293B] font-heading mb-1">
              <span>Quality Factor</span>
              <span className="text-[#7C3AED] font-bold">{outputQuality}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={outputQuality}
              onChange={(e) => setOutputQuality(parseInt(e.target.value, 10))}
              className="w-full accent-[#7C3AED]"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer">
          <input
            type="checkbox"
            checked={stripMetadata}
            onChange={(e) => setStripMetadata(e.target.checked)}
            className="w-4 h-4 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
          />
          <span className="text-xs font-semibold text-[#1E293B]">
            Strip EXIF camera metadata to preserve production privacy
          </span>
        </label>
      </Card>

      {/* Launch Action */}
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          disabled={submitting || selectedDesignIds.length === 0}
          variant="gold"
          size="lg"
          onClick={handleLaunchBatch}
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          {submitting
            ? 'Queueing Batch...'
            : `Start Batch Watermarking (${selectedDesignIds.length} Images)`}
        </Button>
      </div>
    </div>
  );
};
