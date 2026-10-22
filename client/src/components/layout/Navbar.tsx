import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  ChevronDown,
  LogOut,
  Upload,
  HardDrive,
  User,
  ShieldCheck,
  Palette,
  Eye,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../api/index.js';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { user, company, role, permissions, availableCompanies, setAuth, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const navigate = useNavigate();

  const handleCompanySwitch = async (companyId: string) => {
    if (companyId === company?.id) {
      setDropdownOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await authApi.switchCompany(companyId);
      const { company: newCompany, role: newRole, permissions: newPermissions, accessToken } = res.data.data;
      if (user) {
        setAuth({
          user,
          company: newCompany,
          role: newRole,
          permissions: newPermissions,
          accessToken,
          availableCompanies,
        });
      }
      setDropdownOpen(false);
      navigate(`/${newRole.toLowerCase()}/dashboard`);
    } catch (err) {
      console.error('Failed to switch workspace:', err);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'Company':
        return 'Company Owner';
      case 'Designer':
        return 'Designer';
      case 'Viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const storageUsedMB = company?.storageUsage ? (company.storageUsage / (1024 * 1024)).toFixed(1) : '0';
  const storageQuotaGB = company?.storageQuota ? (company.storageQuota / (1024 * 1024 * 1024)).toFixed(0) : '5';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E2E8F0] px-3.5 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle + Workspace Brand / Switcher */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] transition flex-shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative min-w-0">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:border-[#7C3AED]/40 hover:bg-[#F8FAFC] transition text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED] flex-shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-[#64748B] leading-none mb-0.5">Active Workspace</div>
              <div className="text-xs sm:text-sm font-bold text-[#1E293B] font-heading flex items-center gap-1 leading-tight">
                <span className="truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[200px]">
                  {company?.name || 'My Jewellery Co.'}
                </span>
                {availableCompanies.length > 1 && <ChevronDown className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />}
              </div>
            </div>
          </button>

          {/* Company Switcher Dropdown */}
          {dropdownOpen && availableCompanies.length > 1 && (
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider font-heading">
                Switch Workspace
              </div>
              {availableCompanies.map((c) => (
                <button
                  key={c.id}
                  disabled={switching}
                  onClick={() => handleCompanySwitch(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition ${
                    c.id === company?.id
                      ? 'bg-[#7C3AED]/10 text-[#7C3AED] font-semibold'
                      : 'text-[#1E293B] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                    {c.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
        {/* Storage Quick Glance (Visible on xl+ screens to keep navbar spacious on laptops) */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-[#64748B] bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
          <HardDrive className="w-3.5 h-3.5 text-[#7C3AED]" />
          <span>Storage:</span>
          <span className="font-semibold text-[#1E293B]">{storageUsedMB} MB</span>
          <span>/</span>
          <span>{storageQuotaGB} GB</span>
        </div>

        {/* Quick Upload Button (Company and authorized Designers only) */}
        {(role === 'Company' || (role === 'Designer' && permissions?.canUpload !== false)) && (
          <Link
            to={role === 'Company' ? '/company/upload' : '/designer/upload'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-lg shadow-sm shadow-[#7C3AED]/20 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Images</span>
            <span className="sm:hidden">Upload</span>
          </Link>
        )}

        {/* User Pill with integrated Role Badge linking to Account Settings */}
        <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-[#E2E8F0]">
          <Link
            to="/settings/account"
            className="flex items-center gap-2 sm:gap-2.5 hover:opacity-85 transition group"
            title="Open Account Settings"
          >
            <div className="w-8 h-8 rounded-full bg-[#B8860B]/15 text-[#B8860B] group-hover:ring-2 group-hover:ring-[#7C3AED]/40 flex items-center justify-center font-bold text-xs border border-[#B8860B]/30 font-heading flex-shrink-0 transition">
              {user?.name?.slice(0, 2).toUpperCase() || 'AU'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-[#1E293B] group-hover:text-[#7C3AED] leading-tight font-heading flex items-center gap-1.5 transition">
                <span className="truncate max-w-[120px]">{user?.name || 'Jeweller'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#7C3AED]/10 text-[#7C3AED] leading-none">
                  {role === 'Company' ? 'Owner' : role}
                </span>
              </div>
              <div className="text-[11px] text-[#64748B] leading-tight truncate max-w-[150px]">
                {user?.email}
              </div>
            </div>
          </Link>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
