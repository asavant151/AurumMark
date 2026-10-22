import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sparkles,
  ArrowRight,
  Lock,
  User,
  Key,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '../../api/index.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button, Badge } from '../../components/common/index.js';

const acceptSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  name: z.string().min(2, 'Full name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type AcceptFormData = z.infer<typeof acceptSchema>;

interface InviteInfo {
  email: string;
  role: 'Designer' | 'Viewer';
  companyName: string;
  isExpired: boolean;
  expiresAt: string;
}

export const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AcceptFormData>({
    resolver: zodResolver(acceptSchema),
    defaultValues: {
      token: tokenFromUrl,
    },
  });

  useEffect(() => {
    if (tokenFromUrl) {
      setValue('token', tokenFromUrl);

      // Inspect invitation status & 7-day expiration
      setCheckingToken(true);
      authApi
        .getInvitationInfo(tokenFromUrl)
        .then((res) => {
          setInviteInfo(res.data.data);
          if (res.data.data?.isExpired) {
            setError(
              `This invitation expired on ${new Date(
                res.data.data.expiresAt
              ).toLocaleDateString()} (the 7-day token window has passed). Please ask your workspace administrator to resend the invitation request.`
            );
          }
        })
        .catch((err) => {
          console.error('Failed to inspect token:', err);
        })
        .finally(() => {
          setCheckingToken(false);
        });
    }
  }, [tokenFromUrl, setValue]);

  const onSubmit = async (data: AcceptFormData) => {
    if (inviteInfo?.isExpired) {
      setError('Cannot accept an expired invitation. Please ask your administrator to resend the request.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await authApi.acceptInvitation(data);
      const { user, company, role, permissions, accessToken, refreshToken } = res.data.data;

      setAuth({
        user,
        company,
        role,
        permissions,
        accessToken,
        refreshToken,
        availableCompanies: [{ id: company.id, name: company.name, slug: company.slug, role }],
      });

      if (role === 'Designer') {
        navigate('/designer/dashboard');
      } else {
        navigate('/viewer/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to accept invitation. Token may be invalid or expired after 7 days.'
      );
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
          Join Company Workspace
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Complete your profile to accept your team membership invitation
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E2E8F0] rounded-2xl sm:px-8">
          {/* Invitation Details Banner */}
          {inviteInfo && (
            <div
              className={`mb-5 p-3.5 rounded-xl border text-xs space-y-1.5 ${
                inviteInfo.isExpired
                  ? 'bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]'
                  : 'bg-[#7C3AED]/10 border-[#7C3AED]/20 text-[#1E293B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs font-heading">
                  {inviteInfo.companyName}
                </span>
                <Badge variant={inviteInfo.isExpired ? 'danger' : 'gold'}>
                  {inviteInfo.role}
                </Badge>
              </div>
              <div className="text-[11px] text-[#64748B] flex items-center justify-between">
                <span>Invited: <strong className="text-[#1E293B] font-mono">{inviteInfo.email}</strong></span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {inviteInfo.isExpired ? 'Expired' : '7-Day Token'}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/20 flex items-start gap-2 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Invitation Token
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  {...register('token')}
                  placeholder="Paste invitation token"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg font-mono focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              {errors.token && (
                <p className="mt-1 text-[11px] text-[#DC2626]">{errors.token.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. Maya Lin"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-[11px] text-[#DC2626]">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Create Account Password
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
              disabled={loading || checkingToken || inviteInfo?.isExpired}
              variant="primary"
              className="w-full justify-center mt-2"
            >
              {loading
                ? 'Activating Membership...'
                : inviteInfo?.isExpired
                ? 'Token Expired (Request Resend)'
                : 'Accept Invitation & Join'}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[#64748B] pt-4 border-t border-[#E2E8F0]">
            Already accepted?{' '}
            <Link to="/login" className="font-semibold text-[#7C3AED] hover:underline font-heading">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
