import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../components/common/index.js';

export const AccessDeniedPage: React.FC = () => {
  const { role } = useAuthStore();

  const getDashboardPath = () => {
    if (role === 'Company') return '/company/dashboard';
    if (role === 'Designer') return '/designer/dashboard';
    return '/viewer/dashboard';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
        Access Denied (403 Forbidden)
      </h1>
      <p className="text-sm text-[#64748B] max-w-md mt-2 mb-6">
        You do not have permission to access this page or perform this action. Your current role is{' '}
        <span className="font-semibold text-[#1E293B]">{role || 'Unassigned'}</span>.
      </p>

      <div className="flex items-center gap-3">
        <Link to={getDashboardPath()}>
          <Button variant="primary" size="md">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Return to Authorized Workspace
          </Button>
        </Link>
      </div>
    </div>
  );
};
