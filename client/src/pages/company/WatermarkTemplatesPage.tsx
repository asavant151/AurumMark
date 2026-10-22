import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sliders,
  Plus,
  Copy,
  Trash2,
  Stamp,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Type,
  Image as ImageIcon,
  Grid,
} from 'lucide-react';
import { templatesApi } from '../../api/index.js';
import { WatermarkTemplate } from '../../types/index.js';
import { Card, Button, Badge, EmptyState, ConfirmDeleteModal } from '../../components/common/index.js';
import { useWatermarkStore } from '../../store/watermarkStore.js';
import { useAuthStore } from '../../store/authStore.js';

export const WatermarkTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<WatermarkTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<WatermarkTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const setConfig = useWatermarkStore((s) => s.setConfig);
  const { role, permissions } = useAuthStore();
  const navigate = useNavigate();

  const canEdit =
    role === 'Company' || (role === 'Designer' && permissions?.canEditTemplate !== false);
  const canProcess =
    role === 'Company' || (role === 'Designer' && permissions?.canProcess !== false);

  const fetchTemplates = async () => {
    try {
      const res = await templatesApi.list();
      setTemplates(res.data.data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleLoadInEditor = (template: WatermarkTemplate) => {
    setConfig(template.configuration);
    const editorPath = role === 'Company' ? '/company/editor' : '/designer/editor';
    navigate(editorPath);
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      await templatesApi.duplicate(templateId);
      fetchTemplates();
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const confirmDeleteTemplate = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await templatesApi.delete(deleteTarget._id);
      setDeleteTarget(null);
      fetchTemplates();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await templatesApi.update(templateId, { isDefault: true });
      fetchTemplates();
    } catch (err) {
      console.error('Failed to set default template:', err);
    }
  };

  const handleApplyToBatch = (templateId: string) => {
    const processingPath =
      role === 'Company' ? '/company/processing' : '/designer/processing';
    navigate(`${processingPath}?templateId=${templateId}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
            Watermark Templates
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Reusable watermark positioning, typography, and logo branding configurations.
          </p>
        </div>

        {canEdit && (
          <Link to={role === 'Company' ? '/company/editor' : '/designer/editor'}>
            <Button variant="primary" size="md">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create in Studio
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#64748B]">Loading watermark templates...</div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={Sliders}
          title="No Watermark Templates Saved"
          description="Create and save your first jewellery watermark template to begin bulk operations."
          actionText={canEdit ? 'Open Watermark Studio' : undefined}
          onAction={
            canEdit
              ? () => navigate(role === 'Company' ? '/company/editor' : '/designer/editor')
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tmpl) => (
            <Card key={tmpl._id} className="flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center">
                    {tmpl.watermarkType === 'logo' ? (
                      <ImageIcon className="w-5 h-5 text-[#B8860B]" />
                    ) : tmpl.watermarkType === 'tiled' ? (
                      <Grid className="w-5 h-5" />
                    ) : (
                      <Type className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tmpl.isDefault && (
                      <Badge variant="gold" size="sm">
                        Default
                      </Badge>
                    )}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                      v{tmpl.version}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#1E293B] font-heading group-hover:text-[#7C3AED] transition">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-[#64748B] mt-1 line-clamp-2">
                  {tmpl.description || 'Saved watermark configuration.'}
                </p>

                {/* Configuration Specs */}
                <div className="mt-4 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-[11px] text-[#64748B]">
                  <div className="flex justify-between">
                    <span>Position Preset:</span>
                    <span className="font-semibold text-[#1E293B] capitalize">
                      {tmpl.configuration?.positionPreset || 'bottom-right'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Font & Weight:</span>
                    <span className="font-semibold text-[#1E293B]">
                      {tmpl.configuration?.textConfig?.fontFamily || 'Outfit'} (
                      {tmpl.configuration?.textConfig?.fontWeight || '600'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scaling Policy:</span>
                    <span className="font-semibold text-[#7C3AED] capitalize">
                      {tmpl.configuration?.scalingPolicy || 'relative'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <button
                      onClick={() => handleLoadInEditor(tmpl)}
                      title="Load into Studio"
                      className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#7C3AED]/10 hover:text-[#7C3AED] transition text-[#64748B]"
                    >
                      <Stamp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => handleDuplicate(tmpl._id)}
                      title="Duplicate Template"
                      className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] transition text-[#64748B]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {role === 'Company' && !tmpl.isDefault && (
                    <button
                      onClick={() => handleSetDefault(tmpl._id)}
                      title="Set as Default"
                      className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#B8860B]/10 hover:text-[#B8860B] transition text-[#64748B]"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => setDeleteTarget(tmpl)}
                      title="Delete Template"
                      className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#DC2626]/10 hover:text-[#DC2626] transition text-[#64748B] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {canProcess && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApplyToBatch(tmpl._id)}
                  >
                    <Cpu className="w-3.5 h-3.5 mr-1" />
                    Apply Batch
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reusable Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTemplate}
        title="Delete Watermark Template?"
        description="Are you sure you want to delete this template? Previously processed images will not be affected."
        itemName={deleteTarget?.name}
        confirmText="Delete Template"
        loading={deleting}
      />
    </div>
  );
};
