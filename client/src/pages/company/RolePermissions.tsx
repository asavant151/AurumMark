import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ShieldCheck, Save, CheckCircle2, AlertCircle, Eye, Palette } from 'lucide-react';
import { companyApi } from '../../api/index.js';
import { useAuthStore } from '../../store/authStore.js';
import { Card, Button } from '../../components/common/index.js';

export const RolePermissions: React.FC = () => {
  const { company, updateCompany } = useAuthStore();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      allowDesignerCreateProject: company?.settings?.allowDesignerCreateProject ?? true,
      allowViewerDownload: company?.settings?.allowViewerDownload ?? true,
      allowViewerZipDownload: company?.settings?.allowViewerZipDownload ?? false,
      sanitizeMetadata: company?.settings?.sanitizeMetadata ?? true,
      defaultOutputFormat: company?.settings?.defaultOutputFormat ?? 'jpeg',
      defaultQuality: company?.settings?.defaultQuality ?? 90,
    },
  });

  const onSubmit = async (data: any) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await companyApi.updateCurrent({
        settings: {
          allowDesignerCreateProject: Boolean(data.allowDesignerCreateProject),
          allowViewerDownload: Boolean(data.allowViewerDownload),
          allowViewerZipDownload: Boolean(data.allowViewerZipDownload),
          sanitizeMetadata: Boolean(data.sanitizeMetadata),
          defaultOutputFormat: data.defaultOutputFormat,
          defaultQuality: Number(data.defaultQuality),
        },
      });
      updateCompany(res.data.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update company permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
          Role & Permission Settings
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Configure security boundaries, catalogue distribution rights, and default export policies.
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/20 flex items-center gap-2 text-xs text-[#16A34A]">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Workspace role permissions and output settings updated.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center gap-2 text-xs text-[#DC2626]">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Designer Permissions */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <div className="p-1.5 rounded-lg bg-[#B8860B]/10 text-[#B8860B]">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E293B] font-heading">Designer Policy</h3>
              <p className="text-[11px] text-[#64748B]">Operational controls for jewellery designers</p>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition">
            <input
              type="checkbox"
              {...register('allowDesignerCreateProject')}
              className="w-4 h-4 mt-0.5 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
            />
            <div>
              <span className="text-xs font-semibold text-[#1E293B] block">
                Allow Designers to Create Collections
              </span>
              <span className="text-[11px] text-[#64748B]">
                Permit designers to create new project folders (e.g. Bridal Jewellery, Diamond Rings).
              </span>
            </div>
          </label>
        </Card>

        {/* Viewer Permissions */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <div className="p-1.5 rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E293B] font-heading">Viewer Policy</h3>
              <p className="text-[11px] text-[#64748B]">
                Read-oriented access controls for wholesalers, clients, and viewers
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition">
            <input
              type="checkbox"
              {...register('allowViewerDownload')}
              className="w-4 h-4 mt-0.5 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
            />
            <div>
              <span className="text-xs font-semibold text-[#1E293B] block">
                Allow Individual Image Downloads
              </span>
              <span className="text-[11px] text-[#64748B]">
                Permit Viewers to download individual authorized watermarked images.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition">
            <input
              type="checkbox"
              {...register('allowViewerZipDownload')}
              className="w-4 h-4 mt-0.5 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
            />
            <div>
              <span className="text-xs font-semibold text-[#1E293B] block">
                Allow Bulk ZIP Catalogue Downloads
              </span>
              <span className="text-[11px] text-[#64748B]">
                Permit Viewers to export multiple processed jewellery images as a compressed ZIP file.
              </span>
            </div>
          </label>
        </Card>

        {/* Output & Privacy Defaults */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <div className="p-1.5 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E293B] font-heading">Output & Privacy Defaults</h3>
              <p className="text-[11px] text-[#64748B]">
                Rendering quality and EXIF privacy sanitization
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Default Output Format
              </label>
              <select
                {...register('defaultOutputFormat')}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white font-semibold focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="jpeg">JPEG (Universal Catalogue Compatibility)</option>
                <option value="png">PNG (Lossless Transparency)</option>
                <option value="webp">WebP (Modern Compact High Fidelity)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Default Quality Factor
              </label>
              <select
                {...register('defaultQuality')}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white font-semibold focus:outline-none focus:border-[#7C3AED]"
              >
                <option value={95}>95% (Luxury Archival & Print)</option>
                <option value={90}>90% (Recommended Balance)</option>
                <option value={80}>80% (Fast Web Catalogue)</option>
              </select>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition">
            <input
              type="checkbox"
              {...register('sanitizeMetadata')}
              className="w-4 h-4 mt-0.5 rounded text-[#7C3AED] focus:ring-[#7C3AED] border-[#E2E8F0]"
            />
            <div>
              <span className="text-xs font-semibold text-[#1E293B] block">
                Strip Camera & GPS Metadata (Recommended)
              </span>
              <span className="text-[11px] text-[#64748B]">
                Protects manufacturing secrets, GPS location, and camera serials on exported images.
              </span>
            </div>
          </label>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} variant="primary" size="md">
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving Policies...' : 'Save Workspace Policies'}
          </Button>
        </div>
      </form>
    </div>
  );
};
