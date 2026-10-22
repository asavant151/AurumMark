import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Company } from '../models/Company.js';
import { CompanyMembership } from '../models/CompanyMembership.js';
import { Invitation } from '../models/Invitation.js';
import { ActivityLogger } from '../services/activityLogger.js';
import { ENV } from '../config/env.js';

const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  contact: z.object({
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  settings: z.object({
    defaultOutputFormat: z.enum(['jpeg', 'png', 'webp']).optional(),
    defaultQuality: z.number().min(10).max(100).optional(),
    allowViewerDownload: z.boolean().optional(),
    allowViewerZipDownload: z.boolean().optional(),
    allowDesignerCreateProject: z.boolean().optional(),
    sanitizeMetadata: z.boolean().optional(),
  }).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['Designer', 'Viewer']),
});

const updateMemberSchema = z.object({
  role: z.enum(['Designer', 'Viewer']).optional(),
  status: z.enum(['active', 'deactivated']).optional(),
  permissions: z.object({
    canUpload: z.boolean().optional(),
    canProcess: z.boolean().optional(),
    canCreateTemplate: z.boolean().optional(),
    canEditTemplate: z.boolean().optional(),
    canDeleteDesign: z.boolean().optional(),
    canExportZip: z.boolean().optional(),
    canCreateProject: z.boolean().optional(),
  }).optional(),
});

export class CompanyController {
  /**
   * Get current company workspace details
   */
  static async getCurrent(req: Request, res: Response): Promise<void> {
    try {
      const company = await Company.findById(req.user!.companyId).populate('logoAssetId');
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found.' });
        return;
      }
      res.status(200).json({ success: true, data: company });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch company.' });
    }
  }

  /**
   * Update current company workspace profile and settings
   */
  static async updateCurrent(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateCompanySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const updates: any = {};
      if (parsed.data.name) updates.name = parsed.data.name;
      if (parsed.data.contact) updates.contact = { ...req.company!.contact, ...parsed.data.contact };
      if (parsed.data.settings) updates.settings = { ...req.company!.settings, ...parsed.data.settings };

      const updatedCompany = await Company.findByIdAndUpdate(
        req.user!.companyId,
        { $set: updates },
        { new: true }
      );

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'COMPANY_SETTINGS_UPDATED',
        resourceType: 'company',
        resourceId: req.user!.companyId,
        metadata: updates,
        req,
      });

      res.status(200).json({ success: true, data: updatedCompany, message: 'Company profile updated.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to update company.' });
    }
  }

  /**
   * List all team members of the active company
   */
  static async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const members = await CompanyMembership.find({
        companyId: req.user!.companyId,
      })
        .populate('userId', 'name email status emailVerifiedAt createdAt')
        .sort({ createdAt: 1 });

      res.status(200).json({ success: true, data: members });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch team members.' });
    }
  }

  /**
   * Send an invitation to a new Designer or Viewer
   */
  static async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const parsed = inviteMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const { email, role } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      // STRICT ROLE RULE: Can only invite Designer or Viewer
      if (role !== 'Designer' && role !== 'Viewer') {
        res.status(400).json({ success: false, message: 'Can only invite Designer or Viewer roles.' });
        return;
      }

      // Check if user is already an active member of this company
      const existingMembership = await CompanyMembership.findOne({
        companyId: req.user!.companyId,
      }).populate({
        path: 'userId',
        match: { email: normalizedEmail },
      });

      if (existingMembership && (existingMembership as any).userId) {
        res.status(409).json({ success: false, message: 'This user is already a member of this company.' });
        return;
      }

      // Generate random token and hash
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Invalidate existing pending invitations for this email in this company
      await Invitation.deleteMany({
        companyId: req.user!.companyId,
        email: normalizedEmail,
        acceptedAt: null,
      });

      const invitation = await Invitation.create({
        companyId: new Types.ObjectId(req.user!.companyId),
        email: normalizedEmail,
        invitedRole: role,
        tokenHash,
        rawToken,
        expiresAt,
        invitedBy: new Types.ObjectId(req.user!.userId),
      });

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'INVITATION_SENT',
        resourceType: 'member',
        resourceId: invitation._id,
        metadata: { email: normalizedEmail, role },
        req,
      });

      // Provide the invite link pointing to frontend SPA
      const clientBaseUrl = (req.headers.origin as string) || ENV.CLIENT_URL || 'http://localhost:5173';
      const inviteUrl = `${clientBaseUrl}/invite/accept?token=${rawToken}`;

      res.status(201).json({
        success: true,
        message: `Invitation generated for ${normalizedEmail} as ${role}.`,
        data: {
          invitationId: invitation._id,
          email: invitation.email,
          role: invitation.invitedRole,
          expiresAt: invitation.expiresAt,
          inviteToken: rawToken,
          inviteUrl,
        },
      });
    } catch (err: any) {
      console.error('Create invitation error:', err);
      res.status(500).json({ success: false, message: 'Failed to create invitation.' });
    }
  }

  /**
   * List pending and unaccepted invitations
   */
  static async getInvitations(req: Request, res: Response): Promise<void> {
    try {
      const invitations = await Invitation.find({
        companyId: req.user!.companyId,
        acceptedAt: null,
      })
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 });

      const clientBaseUrl = (req.headers.origin as string) || ENV.CLIENT_URL || 'http://localhost:5173';
      const now = new Date();
      const enriched = invitations.map((inv) => {
        const isExpired = inv.expiresAt.getTime() <= now.getTime();
        const inviteUrl = inv.rawToken
          ? `${clientBaseUrl}/invite/accept?token=${inv.rawToken}`
          : '';
        return {
          _id: inv._id,
          email: inv.email,
          invitedRole: inv.invitedRole,
          expiresAt: inv.expiresAt,
          acceptedAt: inv.acceptedAt,
          invitedBy: inv.invitedBy,
          createdAt: inv.createdAt,
          status: isExpired ? 'expired' : 'pending',
          isExpired,
          rawToken: inv.rawToken || '',
          inviteUrl,
        };
      });

      res.status(200).json({ success: true, data: enriched });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to fetch invitations.' });
    }
  }

  /**
   * Resend / regenerate invitation token (extends expiry for 7 days)
   */
  static async resendInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { invitationId } = req.params;

      const invitation = await Invitation.findOne({
        _id: invitationId,
        companyId: req.user!.companyId,
        acceptedAt: null,
      });

      if (!invitation) {
        res.status(404).json({ success: false, message: 'Pending invitation not found or already accepted.' });
        return;
      }

      // Generate a fresh random token and hash
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      // Set expiry to strictly 7 days from now
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      invitation.tokenHash = tokenHash;
      invitation.rawToken = rawToken;
      invitation.expiresAt = expiresAt;
      invitation.invitedBy = new Types.ObjectId(req.user!.userId);
      await invitation.save();

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'INVITATION_RESENT',
        resourceType: 'member',
        resourceId: invitation._id,
        metadata: { email: invitation.email, role: invitation.invitedRole },
        req,
      });

      const clientBaseUrl = (req.headers.origin as string) || ENV.CLIENT_URL || 'http://localhost:5173';
      const inviteUrl = `${clientBaseUrl}/invite/accept?token=${rawToken}`;

      res.status(200).json({
        success: true,
        message: `Invitation request resent to ${invitation.email}! Token valid for 7 days.`,
        data: {
          invitationId: invitation._id,
          email: invitation.email,
          role: invitation.invitedRole,
          expiresAt: invitation.expiresAt,
          inviteToken: rawToken,
          inviteUrl,
        },
      });
    } catch (err: any) {
      console.error('Resend invitation error:', err);
      res.status(500).json({ success: false, message: 'Failed to resend invitation.' });
    }
  }

  /**
   * Cancel / revoke an unaccepted invitation
   */
  static async deleteInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { invitationId } = req.params;

      const invitation = await Invitation.findOneAndDelete({
        _id: invitationId,
        companyId: req.user!.companyId,
        acceptedAt: null,
      });

      if (!invitation) {
        res.status(404).json({ success: false, message: 'Invitation not found or already accepted.' });
        return;
      }

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'INVITATION_REVOKED',
        resourceType: 'member',
        resourceId: invitation._id,
        metadata: { email: invitation.email },
        req,
      });

      res.status(200).json({ success: true, message: 'Invitation revoked successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to revoke invitation.' });
    }
  }

  /**
   * Update member role (Designer <-> Viewer), permissions, or active status
   */
  static async updateMember(req: Request, res: Response): Promise<void> {
    try {
      const { memberId } = req.params;
      const parsed = updateMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const membership = await CompanyMembership.findOne({
        _id: memberId,
        companyId: req.user!.companyId,
      });

      if (!membership) {
        res.status(404).json({ success: false, message: 'Team member not found.' });
        return;
      }

      // CRITICAL RULE: The Company account cannot promote a Designer or Viewer into Company
      // CRITICAL RULE: The Company account cannot modify its own owner role
      if (membership.role === 'Company') {
        res.status(403).json({ success: false, message: 'Cannot modify the Company owner membership role.' });
        return;
      }

      if (parsed.data.role) {
        // Must strictly be Designer or Viewer
        if (parsed.data.role !== 'Designer' && parsed.data.role !== 'Viewer') {
          res.status(400).json({ success: false, message: 'Can only assign Designer or Viewer roles.' });
          return;
        }
        membership.role = parsed.data.role;
      }

      if (parsed.data.status) {
        membership.status = parsed.data.status;
      }

      if (parsed.data.permissions) {
        membership.permissions = {
          ...membership.permissions,
          ...parsed.data.permissions,
        };
      }

      await membership.save();

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'MEMBER_UPDATED',
        resourceType: 'member',
        resourceId: membership._id,
        metadata: { role: membership.role, status: membership.status },
        req,
      });

      res.status(200).json({ success: true, message: 'Member updated successfully.', data: membership });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to update member.' });
    }
  }

  /**
   * Remove a member from the company
   */
  static async deleteMember(req: Request, res: Response): Promise<void> {
    try {
      const { memberId } = req.params;
      const membership = await CompanyMembership.findOne({
        _id: memberId,
        companyId: req.user!.companyId,
      });

      if (!membership) {
        res.status(404).json({ success: false, message: 'Member not found.' });
        return;
      }

      if (membership.role === 'Company') {
        res.status(403).json({ success: false, message: 'Cannot delete the Company owner.' });
        return;
      }

      await CompanyMembership.deleteOne({ _id: membership._id });

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'MEMBER_REMOVED',
        resourceType: 'member',
        resourceId: memberId,
        req,
      });

      res.status(200).json({ success: true, message: 'Member removed from company.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to remove member.' });
    }
  }

  /**
   * Set or reset password for an active workspace member (allows immediate regular login)
   */
  static async resetMemberPassword(req: Request, res: Response): Promise<void> {
    try {
      const { memberId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        return;
      }

      const membership = await CompanyMembership.findOne({
        _id: memberId,
        companyId: req.user!.companyId,
      });

      if (!membership) {
        res.status(404).json({ success: false, message: 'Member not found in this company workspace.' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      const user = await User.findByIdAndUpdate(
        membership.userId,
        { passwordHash, status: 'active' },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ success: false, message: 'Associated user account not found.' });
        return;
      }

      await ActivityLogger.log({
        companyId: req.user!.companyId,
        actorId: req.user!.userId,
        action: 'MEMBER_PASSWORD_RESET',
        resourceType: 'member',
        resourceId: memberId,
        metadata: { memberEmail: user.email },
        req,
      });

      res.status(200).json({
        success: true,
        message: `Password for ${user.name} (${user.email}) has been successfully updated! They can now log in at /login with their email and this password.`,
      });
    } catch (err) {
      console.error('Reset member password error:', err);
      res.status(500).json({ success: false, message: 'Failed to reset member password.' });
    }
  }
}
