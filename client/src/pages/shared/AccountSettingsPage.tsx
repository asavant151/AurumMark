import React, { useState } from 'react';
import {
  User,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Building2,
  Mail,
  KeyRound,
  Sparkles,
  Palette,
  Shield,
  Layers,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../api/index.js';
import { Card, Button, Badge } from '../../components/common/index.js';

export const AccountSettingsPage: React.FC = () => {
  const { user, company, role, permissions, updateUser, logout } = useAuthStore();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileMessage({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }

    setUpdatingProfile(true);
    setProfileMessage(null);
    try {
      const res = await authApi.updateProfile({ name: name.trim() });
      updateUser({ name: res.data.data.name });
      setProfileMessage({ type: 'success', text: 'Your name has been updated successfully.' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setUpdatingPassword(true);
    setPasswordMessage(null);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      setPasswordMessage({
        type: 'success',
        text: res.data?.message || 'Password changed successfully.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 5000);
    } catch (err: any) {
      setPasswordMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password. Please check your current password.',
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] font-heading flex items-center gap-2">
          <User className="w-6 h-6 text-[#7C3AED]" />
          Account Settings
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Manage your personal credentials, password, and view your workspace membership privileges.
        </p>
      </div>

      {/* Account Overview Header Card */}
      <Card className="p-5 bg-gradient-to-r from-white via-white to-[#7C3AED]/5 border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#B8860B] text-white flex items-center justify-center font-bold text-lg font-heading shadow-md shadow-[#7C3AED]/20">
              {user?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1E293B] font-heading">{user?.name}</h2>
                <Badge
                  variant={
                    role === 'Company' ? 'primary' : role === 'Designer' ? 'gold' : 'success'
                  }
                >
                  {role === 'Company' ? (
                    <>
                      <ShieldCheck className="w-3 h-3" /> Company Owner
                    </>
                  ) : role === 'Designer' ? (
                    <>
                      <Palette className="w-3 h-3" /> Designer
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" /> Viewer
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span className="font-mono">{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Profile Information Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <div className="p-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E293B] font-heading">Personal Profile</h3>
              <p className="text-[11px] text-[#64748B]">Update your display name</p>
            </div>
          </div>

          {profileMessage && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs border ${
                profileMessage.type === 'success'
                  ? 'bg-[#16A34A]/10 border-[#16A34A]/20 text-[#16A34A]'
                  : 'bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]'
              }`}
            >
              {profileMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{profileMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Full Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#1E293B] font-heading">
                  Email Address
                </label>
                <span className="text-[10px] text-[#16A34A] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              </div>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#64748B] font-mono cursor-not-allowed select-all"
              />
              <p className="text-[10px] text-[#64748B] mt-1">
                Email address is permanently linked to your workspace login and security sessions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Active Workspace
              </label>
              <div className="px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#1E293B] flex items-center justify-between">
                <span className="font-semibold font-heading flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#7C3AED]" />
                  {company?.name || 'Workspace'}
                </span>
                <span className="text-[11px] text-[#64748B] font-mono">
                  {company?.slug ? `@${company.slug}` : ''}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={updatingProfile}>
                <Save className="w-3.5 h-3.5 mr-1" />
                {updatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </Card>

        {/* 2. Password & Security Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <div className="p-2 rounded-lg bg-[#B8860B]/10 text-[#B8860B]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1E293B] font-heading">Password & Security</h3>
              <p className="text-[11px] text-[#64748B]">Update account password</p>
            </div>
          </div>

          {passwordMessage && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs border ${
                passwordMessage.type === 'success'
                  ? 'bg-[#16A34A]/10 border-[#16A34A]/20 text-[#16A34A]'
                  : 'bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]'
              }`}
            >
              {passwordMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 pr-9 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 pr-9 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-3 py-2 pr-9 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="sm" disabled={updatingPassword}>
                <Lock className="w-3.5 h-3.5 mr-1" />
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* 3. Role Privileges & Workspace Permissions Summary */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <div className="p-2 rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1E293B] font-heading">
              Role Privileges & Access Scope
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Your workspace access level is strictly determined by your role: <strong>{role}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#7C3AED] font-heading">
              Current Role
            </span>
            <p className="text-xs font-bold text-[#1E293B] font-heading">{role} Account</p>
            <p className="text-[11px] text-[#64748B]">
              {role === 'Company'
                ? 'Full administrative control over members, billing, watermark settings, and templates.'
                : role === 'Designer'
                ? 'Authorized to upload designs, craft watermark templates, and process high-res exports.'
                : 'Read-only access to browse designs, view watermarks, and export permitted assets.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#B8860B] font-heading">
              Active Company
            </span>
            <p className="text-xs font-bold text-[#1E293B] font-heading">{company?.name || 'Jewellery Workspace'}</p>
            <p className="text-[11px] text-[#64748B]">
              All images, watermark configurations, and export archives are securely scoped to this company workspace.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#16A34A] font-heading">
              Session Security
            </span>
            <p className="text-xs font-bold text-[#1E293B] font-heading">JWT Authenticated</p>
            <p className="text-[11px] text-[#64748B]">
              Protected with cryptographic refresh token rotation and 7-day session lifetime.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
