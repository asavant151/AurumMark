import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MailPlus,
  Copy,
  Check,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Palette,
  Eye,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react';
import { companyApi } from '../../api/index.js';
import { Invitation } from '../../types/index.js';
import { Card, Button, Badge, ConfirmDeleteModal } from '../../components/common/index.js';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid business email address'),
  role: z.enum(['Designer', 'Viewer']),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export const Invitations: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'Designer' },
  });

  const fetchInvitations = async () => {
    try {
      const res = await companyApi.getInvitations();
      setInvitations(res.data.data || []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const onSubmit = async (data: InviteFormData) => {
    setSending(true);
    setMessage(null);
    try {
      const res = await companyApi.createInvitation({ email: data.email, role: data.role });
      const inviteUrl =
        res.data.data?.inviteUrl ||
        `${window.location.origin}/invite/accept?token=${res.data.data?.inviteToken}`;
      setMessage({
        type: 'success',
        text: `Invitation generated for ${data.email} as ${data.role}! Token is strictly valid for 7 days.`,
        link: inviteUrl,
      });
      reset();
      fetchInvitations();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send invitation.',
      });
    } finally {
      setSending(false);
    }
  };

  // Resend invitation & renew 7-day token
  const handleResend = async (inv: Invitation) => {
    setResendingId(inv._id);
    try {
      const res = await companyApi.resendInvitation(inv._id);
      const newUrl =
        res.data.data?.inviteUrl ||
        `${window.location.origin}/invite/accept?token=${res.data.data?.inviteToken}`;
      setMessage({
        type: 'success',
        text: `Invitation request resent to ${inv.email}! Token renewed for 7 days.`,
        link: newUrl,
      });
      fetchInvitations();
      setTimeout(() => {
        setMessage((prev) => (prev?.link === newUrl ? prev : null));
      }, 5000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to resend invitation request.',
      });
    } finally {
      setResendingId(null);
    }
  };

  // Revoke invitation
  const confirmRevoke = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await companyApi.deleteInvitation(deleteTarget._id);
      setMessage({
        type: 'success',
        text: `Invitation for ${deleteTarget.email} was successfully revoked.`,
      });
      setDeleteTarget(null);
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getExpiryDetails = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) {
      return {
        isExpired: true,
        text: 'Expired',
        badgeVariant: 'danger' as const,
      };
    }
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 1) {
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      return {
        isExpired: false,
        text: `Expires in ${hours}h`,
        badgeVariant: 'warning' as const,
      };
    }
    return {
      isExpired: false,
      text: `${days} days left`,
      badgeVariant: 'gold' as const,
    };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E293B] font-heading">Workspace Invitations</h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Send email invitations to onboard Designers and Viewers into your private workspace. All tokens expire in 7 days and can be resent anytime.
        </p>
      </div>

      {/* Invite Form Card */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
            <MailPlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1E293B] font-heading">Invite Team Member</h3>
            <p className="text-xs text-[#64748B]">Assign Designer or Viewer permissions (7-day validity)</p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 p-3.5 rounded-xl border text-xs space-y-2 ${
              message.type === 'success'
                ? 'bg-[#16A34A]/10 border-[#16A34A]/20 text-[#16A34A]'
                : 'bg-[#DC2626]/10 border-[#DC2626]/20 text-[#DC2626]'
            }`}
          >
            <div className="flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-[#64748B] hover:text-[#1E293B] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {message.link && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={message.link}
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-[#E2E8F0] bg-white font-mono text-[#1E293B] select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(message.link!, 'new-invite')}
                >
                  {copiedToken === 'new-invite' ? (
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
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="e.g. designer@jewellerycraft.com"
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#7C3AED]"
            />
            {errors.email && (
              <p className="mt-1 text-[11px] text-[#DC2626]">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E293B] font-heading mb-1">
              Assign Role
            </label>
            <select
              {...register('role')}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white font-semibold focus:outline-none focus:border-[#7C3AED]"
            >
              <option value="Designer">Designer (Image & Watermark Studio)</option>
              <option value="Viewer">Viewer (Read-Only Catalogue)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end pt-1">
            <Button type="submit" disabled={sending} variant="primary" size="md">
              <Send className="w-3.5 h-3.5 mr-1" />
              {sending ? 'Generating Invite...' : 'Generate 7-Day Invitation'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Pending Invites Table */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#1E293B] font-heading">Pending & Unaccepted Invitations</h3>
            <Badge variant="warning">{invitations.length}</Badge>
          </div>
          <span className="text-xs text-[#64748B] font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
            Tokens strictly expire after 7 days
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-heading">
                <th className="py-3 px-5">Invited Email</th>
                <th className="py-3 px-5">Invited Role</th>
                <th className="py-3 px-5">Invitation Link (Copy & Share Anytime)</th>
                <th className="py-3 px-5">Sent By</th>
                <th className="py-3 px-5">Expires On (7 Days)</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#64748B]">
                    Loading invitations...
                  </td>
                </tr>
              ) : invitations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#64748B]">
                    No pending invitations.
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
                      <td className="py-3 px-5 font-semibold text-[#1E293B] font-mono">
                        {inv.email}
                      </td>
                      <td className="py-3 px-5">
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
                                  handleResend(inv);
                                }
                              }}
                              className="shrink-0 px-2.5 py-1 text-xs"
                              title="Copy invitation link"
                            >
                              {copiedToken === inv._id ? (
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
                      <td className="py-3 px-5 text-[#64748B]">
                        {inv.invitedBy?.name || 'Owner'}
                      </td>
                      <td className="py-3 px-5 text-[#64748B]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#64748B]" />
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <Badge variant={expiry.badgeVariant}>
                          {expiry.text}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isResending}
                            onClick={() => handleResend(inv)}
                            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs cursor-pointer"
                            title="Resend invitation and renew token for 7 days"
                          >
                            <RotateCw
                              className={`w-3.5 h-3.5 mr-1 ${isResending ? 'animate-spin' : ''}`}
                            />
                            {isResending ? 'Resending...' : 'Resend'}
                          </Button>

                          <button
                            onClick={() => setDeleteTarget(inv)}
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

      {/* Confirm Revoke Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRevoke}
        title="Revoke Workspace Invitation?"
        description="Are you sure you want to cancel this pending invitation? The invitation link will immediately become invalid."
        itemName={deleteTarget?.email}
        confirmText="Revoke Invitation"
        loading={deleting}
      />
    </div>
  );
};
