import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, ArrowRight, Lock, Mail, User, Building2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../api/index.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../components/common/index.js';

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Please enter a valid business email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterCompanyPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register(data);
      const { user, company, role, permissions, accessToken, refreshToken } = res.data.data;

      setAuth({
        user,
        company,
        role,
        permissions,
        accessToken,
        refreshToken,
        availableCompanies: [{ id: company.id, name: company.name, slug: company.slug, role: 'Company' }],
      });

      navigate('/company/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#B8860B] shadow-md shadow-[#7C3AED]/20 text-white mb-3">
          <Sparkles className="w-6 h-6 text-amber-200" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#1E293B] font-heading tracking-tight">
          Register Jewellery Business
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Create your private company workspace, watermark templates, and catalogue library
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E2E8F0] rounded-2xl sm:px-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-center gap-2 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Company / Brand Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  {...register('companyName')}
                  placeholder="e.g. Royal Diamonds & Jewels"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              {errors.companyName && (
                <p className="mt-1 text-[11px] text-[#DC2626]">{errors.companyName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Owner / Representative Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  {...register('ownerName')}
                  placeholder="e.g. Elena Rostova"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              {errors.ownerName && (
                <p className="mt-1 text-[11px] text-[#DC2626]">{errors.ownerName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Business Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="contact@royaldiamonds.com"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-[#DC2626]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Account Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Minimum 8 characters"
                  className="block w-full pl-9 pr-10 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#1E293B] focus:outline-none cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#64748B]" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-[#DC2626]">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full justify-center mt-2"
            >
              {loading ? 'Creating Workspace...' : 'Create Company Workspace'}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[#64748B] pt-4 border-t border-[#E2E8F0]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#7C3AED] hover:underline font-heading">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
