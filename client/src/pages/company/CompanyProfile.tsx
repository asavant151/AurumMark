import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { companyApi } from '../../api/index.js';
import { useAuthStore } from '../../store/authStore.js';
import { Card, Button } from '../../components/common/index.js';

export const CompanyProfile: React.FC = () => {
  const { company, updateCompany } = useAuthStore();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: company?.name || '',
      email: company?.contact?.email || '',
      phone: company?.contact?.phone || '',
      website: company?.contact?.website || '',
      address: company?.contact?.address || '',
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await companyApi.updateCurrent({
        name: data.name,
        contact: {
          email: data.email,
          phone: data.phone,
          website: data.website,
          address: data.address,
        },
      });
      updateCompany(res.data.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update company profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] font-heading">Company Profile</h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Manage your jewellery brand workspace details and public catalogue metadata.
        </p>
      </div>

      <Card>
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/20 flex items-center gap-2 text-xs text-[#16A34A]">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Company profile updated successfully.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center gap-2 text-xs text-[#DC2626]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Company Name
              </label>
              <input
                type="text"
                {...register('name', { required: true })}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Workspace Slug (Unique URL Identifier)
              </label>
              <input
                type="text"
                disabled
                value={company?.slug || ''}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#64748B] cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Contact Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Phone Number
              </label>
              <input
                type="text"
                {...register('phone')}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Website
              </label>
              <input
                type="url"
                {...register('website')}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Business Address / Showroom Location
            </label>
            <textarea
              rows={2}
              {...register('address')}
              placeholder="e.g. 45 Diamond District, Suite 400"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={loading} variant="primary" size="md">
              <Save className="w-3.5 h-3.5 mr-1" />
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
