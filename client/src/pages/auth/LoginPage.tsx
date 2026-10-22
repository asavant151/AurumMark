import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, Building2, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../api/index.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../components/common/index.js';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid business email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const { user, company, role, permissions, accessToken, refreshToken, availableCompanies } =
        res.data.data;

      setAuth({
        user,
        company,
        role,
        permissions,
        accessToken,
        refreshToken,
        availableCompanies,
      });

      // Role-based workspace routing
      if (role === 'Company') {
        navigate('/company/dashboard');
      } else if (role === 'Designer') {
        navigate('/designer/dashboard');
      } else {
        navigate('/viewer/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
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
          Sign In to Aurum<span className="text-[#7C3AED]">Mark</span>
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Jewellery Watermark Management & Catalogue Distribution SaaS
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
                Business Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="owner@jewels.com"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-[#DC2626]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#1E293B] font-heading">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-[#7C3AED] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
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
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2 font-heading">
              Role Access System
            </p>
            <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] text-[11px] text-[#64748B] space-y-1">
              <div>
                <span className="font-semibold text-[#7C3AED]">Company:</span> Workspace owner & team admin
              </div>
              <div>
                <span className="font-semibold text-[#B8860B]">Designer:</span> Image upload, watermark & bulk processing
              </div>
              <div>
                <span className="font-semibold text-[#16A34A]">Viewer:</span> Read-only catalogue browsing & downloads
              </div>
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs text-[#64748B]">New jewellery business? </span>
              <Link
                to="/register"
                className="text-xs font-semibold text-[#7C3AED] hover:underline font-heading"
              >
                Register Company
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
