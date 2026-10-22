import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Trash2,
  MailPlus,
  ShieldCheck,
  Palette,
  Eye,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Copy,
  Check,
  Clock,
  Send,
  X,
  ExternalLink,
  KeyRound,
  Lock,
} from 'lucide-react';
import { companyApi } from '../../api/index.js';
import { CompanyMembership, Invitation } from '../../types/index.js';
import { Card, Button, Badge, ConfirmDeleteModal } from '../../components/common/index.js';

export const TeamMembers: React.FC = () => {
  const [members, setMembers] = useState<CompanyMembership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals & action states
  const [deleteTarget, setDeleteTarget] = useState<CompanyMembership | null>(null);
  const [deleteInviteTarget, setDeleteInviteTarget] = useState<Invitation | null>(null);
  const [passwordResetTarget, setPasswordResetTarget] = useState<CompanyMembership | null>(null);
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Direct invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Designer' | 'Viewer'>('Designer');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [recentInviteUrl, setRecentInviteUrl] = useState<{ email: string; url: string } | null>(null);

  const fetchMembers = async () => {
    try {
      const res = await companyApi.getMembers();
      setMembers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await companyApi.getInvitations();
      setInvitations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchInvitations();
  }, []);

  const handleRoleChange = async (memberId: string, newRole: 'Designer' | 'Viewer') => {
    try {
      await companyApi.updateMember(memberId, { role: newRole });
      setMessage({ type: 'success', text: `Member role updated to ${newRole}.` });
      fetchMembers();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update role.' });
    }
  };

  const handleStatusToggle = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    try {
      await companyApi.updateMember(memberId, { status: newStatus });
      setMessage({ type: 'success', text: `Member status set to ${newStatus}.` });
      fetchMembers();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change status.' });
    }
  };

  const confirmDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await companyApi.deleteMember(deleteTarget._id);
      setMessage({ type: 'success', text: 'Member removed from company workspace.' });
      setDeleteTarget(null);
      fetchMembers();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete member.' });
    } finally {
      setDeleting(false);
    }
  };

  // Set / Reset Member Password for immediate regular login
  const handleSaveMemberPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetTarget) return;
    if (newMemberPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await companyApi.resetMemberPassword(passwordResetTarget._id, {
        newPassword: newMemberPassword,
      });
      setMessage({
        type: 'success',
        text: res.data?.message || 'Password updated successfully! Member can now log in at /login.',
      });
      setPasswordResetTarget(null);
      setNewMemberPassword('');
      setTimeout(() => setMessage(null), 6000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to set member password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Resend invitation & renew 7-day token
  const handleResendInvitation = async (invitation: Invitation) => {
    setResendingId(invitation._id);
    try {
      const res = await companyApi.resendInvitation(invitation._id);
      const newUrl =
        res.data.data?.inviteUrl ||
        `${window.location.origin}/invite/accept?token=${res.data.data?.inviteToken}`;
      setRecentInviteUrl({
        email: invitation.email,
        url: newUrl,
      });
      setMessage({
        type: 'success',
        text: `Invitation request resent to ${invitation.email}! Token renewed for 7 days.`,
      });
      await fetchInvitations();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to resend invitation request.',
      });
    } finally {
      setResendingId(null);
    }
  };

  // Revoke / delete invitation
  const confirmDeleteInvitation = async () => {
    if (!deleteInviteTarget) return;
    setDeleting(true);
    try {
      await companyApi.deleteInvitation(deleteInviteTarget._id);
      setMessage({
        type: 'success',
        text: `Invitation for ${deleteInviteTarget.email} was successfully revoked.`,
      });
      if (recentInviteUrl?.email === deleteInviteTarget.email) {
        setRecentInviteUrl(null);
      }
      setDeleteInviteTarget(null);
      fetchInvitations();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to revoke invitation.',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Create new invitation from modal
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setSendingInvite(true);
    try {
      const res = await companyApi.createInvitation({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      const newUrl =
        res.data.data?.inviteUrl ||
        `${window.location.origin}/invite/accept?token=${res.data.data?.inviteToken}`;
      setRecentInviteUrl({
        email: inviteEmail.trim(),
        url: newUrl,
      });
      setMessage({
        type: 'success',
        text: `Invitation link created for ${inviteEmail}! Token is valid for 7 days.`,
      });
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('Designer');
      fetchInvitations();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send invitation.',
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const copyToClipboard = (text: string, identifier?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLink(identifier || text);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Calculate 7-day expiration status & days remaining
  const getExpiryDetails = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) {
      return {
        isExpired: true,
        text: 'Expired',
        subtext: '7-day window passed',
        badgeVariant: 'danger' as const,
      };
    }
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 1) {
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      return {
        isExpired: false,
        text: `Expires in ${hours}h`,
        subtext: `${hours} hours remaining`,
        badgeVariant: 'warning' as const,
      };
    }
    return {
      isExpired: false,
      text: `${days} days left`,
      subtext: `Valid for ${days} more days`,
      badgeVariant: 'gold' as const,
    };
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#7C3AED]" />
            <h1 className="text-2xl font-bold text-[#1E293B] font-heading">Team Members</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage active members and pending invitations. Copy invite links anytime, resend expired requests, or set member passwords.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="primary" size="md" onClick={() => setIsInviteModalOpen(true)}>
            <MailPlus className="w-3.5 h-3.5 mr-1" />
            Invite New Member
          </Button>
          <Link to="/company/invitations">
            <Button variant="outline" size="md">
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Invitations Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 text-xs border ${
            message.type === 'success'
              ? 'bg-[#16A34A]/10 border-[#16A34A]/20 text-[#16A34A]'
              : 'bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Floating Recent Invitation Link Banner */}
      {recentInviteUrl && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#7C3AED]/10 via-[#B8860B]/10 to-[#7C3AED]/5 border border-[#7C3AED]/25 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
                <span className="text-xs font-bold text-[#1E293B] font-heading">
                  Active 7-Day Invitation Link for {recentInviteUrl.email}
                </span>
                <Badge variant="gold">Valid for 7 Days</Badge>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Copy and share this direct link anytime with the invitee to join your jewellery workspace.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={recentInviteUrl.url}
                className="w-64 sm:w-80 px-2.5 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-white font-mono text-[#1E293B] select-all focus:outline-none"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={() => copyToClipboard(recentInviteUrl.url, 'banner-link')}
              >
                {copiedLink === 'banner-link' ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-white" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                  </>
                )}
              </Button>
              <button
                onClick={() => setRecentInviteUrl(null)}
                className="p-1.5 text-[#64748B] hover:text-[#1E293B] rounded-lg hover:bg-white/80 transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Active Team Members Table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#1E293B] font-heading">Active Workspace Members</h2>
            <Badge variant="primary">{members.length}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#16A34A] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active members can log in directly at /login using their email & password</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-heading">
                <th className="py-3 px-5">Member</th>
                <th className="py-3 px-5">Current Role</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Joined Date</th>
                <th className="py-3 px-5 text-right">Role Assignment & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {loadingMembers ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#64748B]">
                    Loading team members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#64748B]">
                    No members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const isOwner = m.role === 'Company';
                  return (
                    <tr key={m._id} className="hover:bg-[#F8FAFC]/60 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] font-bold flex items-center justify-center font-heading text-xs">
                            {m.userId?.name?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-[#1E293B] font-heading">
                              {m.userId?.name || 'Workspace Member'}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-mono">{m.userId?.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        {m.role === 'Company' ? (
                          <Badge variant="primary">
                            <ShieldCheck className="w-3 h-3" />
                            Company Owner
                          </Badge>
                        ) : m.role === 'Designer' ? (
                          <Badge variant="gold">
                            <Palette className="w-3 h-3" />
                            Designer
                          </Badge>
                        ) : (
                          <Badge variant="success">
                            <Eye className="w-3 h-3" />
                            Viewer
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <Badge variant={m.status === 'active' ? 'success' : 'danger'}>
                          {m.status === 'active' ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-5 text-[#64748B]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        {isOwner ? (
                          <span className="text-[11px] font-semibold text-[#64748B] italic">
                            Workspace Owner
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {/* Role Switcher: Strictly between Designer and Viewer */}
                            <select
                              value={m.role}
                              onChange={(e) =>
                                handleRoleChange(m._id, e.target.value as 'Designer' | 'Viewer')
                              }
                              className="px-2 py-1 text-xs border border-[#E2E8F0] rounded-lg bg-white font-semibold focus:outline-none focus:border-[#7C3AED]"
                            >
                              <option value="Designer">Designer</option>
                              <option value="Viewer">Viewer</option>
                            </select>

                            {/* Set / Reset Member Password */}
                            <button
                              onClick={() => {
                                setPasswordResetTarget(m);
                                setNewMemberPassword('');
                              }}
                              title="Set or reset login password for member"
                              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#7C3AED] hover:bg-[#7C3AED]/10 hover:border-[#7C3AED]/40 transition cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Status toggle */}
                            <button
                              onClick={() => handleStatusToggle(m._id, m.status)}
                              title={m.status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                m.status === 'active'
                                  ? 'border-[#E2E8F0] text-[#D97706] hover:bg-[#D97706]/10'
                                  : 'border-[#16A34A]/30 text-[#16A34A] hover:bg-[#16A34A]/10'
                              }`}
                            >
                              {m.status === 'active' ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete member */}
                            <button
                              onClick={() => setDeleteTarget(m)}
                              title="Remove Member"
                              className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] hover:border-[#DC2626]/30 hover:bg-[#DC2626]/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Pending & Unaccepted Invitations Section (With Direct Link & 1-Click Copy in Row) */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#1E293B] font-heading">
              Pending & Unaccepted Invitations
            </h2>
            <Badge variant="warning">{invitations.length} Pending</Badge>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
            <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Tokens expire in <strong>7 days</strong>. Copy invitation link anytime or click Resend to renew.</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-heading">
                <th className="py-3 px-5">Invited Member</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">Invitation Link (Copy & Share Anytime)</th>
                <th className="py-3 px-5">Token Validity</th>
                <th className="py-3 px-5">Sent Date</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loadingInvites ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#64748B]">
                    Loading pending invitations...
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#64748B]">
                    <div className="space-y-1">
                      <p className="font-semibold text-[#1E293B]">No pending invitations</p>
                      <p className="text-[11px] text-[#64748B]">
                        All invited team members have accepted or no new invitations have been sent yet.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => {
                  const expiry = getExpiryDetails(inv.expiresAt);
                  const isResending = resendingId === inv._id;
                  const computedInviteUrl =
                    inv.inviteUrl ||
                    (inv.rawToken
                      ? `${window.location.origin}/invite/accept?token=${inv.rawToken}`
                      : '');

                  return (
                    <tr key={inv._id} className="hover:bg-[#F8FAFC]/60 transition">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#B8860B]/10 text-[#B8860B] font-bold flex items-center justify-center font-heading text-xs">
                            {inv.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#1E293B] font-heading font-mono">
                              {inv.email}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              Invited by {inv.invitedBy?.name || 'Workspace Owner'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        {inv.invitedRole === 'Designer' ? (
                          <Badge variant="gold">
                            <Palette className="w-3 h-3" /> Designer
                          </Badge>
                        ) : (
                          <Badge variant="success">
                            <Eye className="w-3 h-3" /> Viewer
                          </Badge>
                        )}
                      </td>

                      {/* Direct Link Row Cell with 1-Click Copy */}
                      <td className="py-3.5 px-5 min-w-[280px]">
                        {expiry.isExpired ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="danger">Token Expired</Badge>
                            <span className="text-[11px] text-[#64748B]">Click "Resend" to renew link</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-[#F8FAFC] p-1.5 rounded-lg border border-[#E2E8F0]">
                            <input
                              type="text"
                              readOnly
                              value={computedInviteUrl}
                              placeholder={computedInviteUrl ? '' : 'Click Resend to generate link'}
                              className="w-full px-2 py-1 text-[11px] rounded bg-white border border-[#E2E8F0] font-mono text-[#1E293B] select-all truncate focus:outline-none"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (computedInviteUrl) {
                                  copyToClipboard(computedInviteUrl, inv._id);
                                } else {
                                  handleResendInvitation(inv);
                                }
                              }}
                              className="shrink-0 px-2.5 py-1 text-xs"
                              title="Copy invitation link"
                            >
                              {copiedLink === inv._id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 mr-1 text-[#16A34A]" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          <Badge variant={expiry.badgeVariant}>
                            <Clock className="w-3 h-3" />
                            {expiry.text}
                          </Badge>
                          <div className="text-[11px] text-[#64748B]">
                            {expiry.isExpired
                              ? 'Expired - Click Resend'
                              : `Expires: ${new Date(inv.expiresAt).toLocaleDateString()}`}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-[#64748B]">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* Resend Request Button (Farithi Request Mokalvi) */}
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isResending}
                            onClick={() => handleResendInvitation(inv)}
                            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs cursor-pointer"
                            title="Resend invitation and renew token for 7 days"
                          >
                            <RotateCw
                              className={`w-3.5 h-3.5 mr-1 ${isResending ? 'animate-spin' : ''}`}
                            />
                            {isResending ? 'Resending...' : 'Resend'}
                          </Button>

                          {/* Revoke Invitation */}
                          <button
                            onClick={() => setDeleteInviteTarget(inv)}
                            title="Revoke Invitation"
                            className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#DC2626] hover:border-[#DC2626]/30 hover:bg-[#DC2626]/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Set / Reset Member Password Modal */}
      {passwordResetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B] font-heading">
                    Set Member Login Password
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Enable direct /login for {passwordResetTarget.userId?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordResetTarget(null)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-lg hover:bg-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
                <div className="text-[11px] text-[#64748B]">Member Email:</div>
                <div className="font-semibold text-[#1E293B] font-mono">
                  {passwordResetTarget.userId?.email}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    placeholder="Enter password (minimum 8 characters)"
                    className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED] font-mono"
                  />
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Once set, the member can immediately log in at <strong>/login</strong> using their email and this password.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordResetTarget(null)}
                  disabled={savingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingPassword}
                >
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  {savingPassword ? 'Saving Password...' : 'Save & Enable Login'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
                  <MailPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E293B] font-heading">
                    Invite Team Member
                  </h3>
                  <p className="text-xs text-[#64748B]">Token will be valid strictly for 7 days</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-lg hover:bg-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                  Business Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. designer@jewellerycraft.com"
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
                  Assign Workspace Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'Designer' | 'Viewer')}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white font-semibold focus:outline-none focus:border-[#7C3AED]"
                >
                  <option value="Designer">Designer (Watermark Editor & Processing)</option>
                  <option value="Viewer">Viewer (Catalogue & Preview Only)</option>
                </select>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Workspace members are strictly restricted to Designer or Viewer roles.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#1E293B]">
                  <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>7-Day Expiration Guarantee</span>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  The invited member has 7 days to accept. The invitation link will be shown in the table so you can copy and share it anytime.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={sendingInvite}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={sendingInvite}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {sendingInvite ? 'Generating Invite...' : 'Generate & Send Invite'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Member Deletion Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteMember}
        title="Remove Team Member?"
        description="Are you sure you want to remove this member from your company workspace? They will immediately lose access to all jewellery designs."
        itemName={deleteTarget?.userId?.name ? `${deleteTarget.userId.name} (${deleteTarget.userId.email})` : deleteTarget?.userId?.email}
        confirmText="Remove Member"
        loading={deleting}
      />

      {/* Confirm Invitation Revoke Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteInviteTarget}
        onClose={() => setDeleteInviteTarget(null)}
        onConfirm={confirmDeleteInvitation}
        title="Revoke Workspace Invitation?"
        description="Are you sure you want to cancel this pending invitation? The invite link will immediately become invalid and unusable."
        itemName={deleteInviteTarget?.email}
        confirmText="Revoke Invitation"
        loading={deleting}
      />
    </div>
  );
};
