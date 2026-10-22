import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { CompanyMembership } from '../models/CompanyMembership.js';
import { Invitation } from '../models/Invitation.js';
import { RefreshSession } from '../models/RefreshSession.js';
import { WatermarkTemplate } from '../models/WatermarkTemplate.js';
import { JWTUtil } from '../utils/jwt.js';
import { ActivityLogger } from '../services/activityLogger.js';

const registerSchema = z.object({
  companyName: z.string().min(2).max(100),
  ownerName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().optional(),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(100).optional(),
  password: z.string().min(8).max(100).optional(),
});

export class AuthController {
  /**
   * Register a new Company and owner account
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const { companyName, ownerName, email, password } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      // Generate company slug
      let baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!baseSlug) baseSlug = 'jewellery-co';
      let slug = baseSlug;
      let counter = 1;
      while (await Company.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create User
      const user = await User.create({
        name: ownerName.trim(),
        email: normalizedEmail,
        passwordHash,
        status: 'active',
        emailVerifiedAt: new Date(), // verified upon initial owner registration
      });

      // Create Company
      const company = await Company.create({
        name: companyName.trim(),
        slug,
        contact: { email: normalizedEmail },
        settings: {
          defaultOutputFormat: 'jpeg',
          defaultQuality: 90,
          allowViewerDownload: true,
          allowViewerZipDownload: false,
          allowDesignerCreateProject: true,
          sanitizeMetadata: true,
        },
        storageQuota: 5 * 1024 * 1024 * 1024, // 5 GB
        storageUsage: 0,
        status: 'active',
      });

      // Create CompanyMembership with ONLY role: 'Company'
      const membership = await CompanyMembership.create({
        companyId: company._id,
        userId: user._id,
        role: 'Company',
        permissions: {
          canUpload: true,
          canProcess: true,
          canCreateTemplate: true,
          canEditTemplate: true,
          canDeleteDesign: true,
          canExportZip: true,
          canInviteMembers: true,
          canCreateProject: true,
        },
        status: 'active',
      });

      // Create starter default watermark template
      await WatermarkTemplate.create({
        companyId: company._id,
        name: 'Default Jewellery Watermark',
        description: 'Clean luxury watermark preset at bottom right',
        watermarkType: 'text',
        configuration: {
          watermarkType: 'text',
          positionPreset: 'bottom-right',
          scalingPolicy: 'relative',
          marginPercent: 0.04,
          textConfig: {
            enabled: true,
            text: company.name.toUpperCase(),
            fontFamily: 'Outfit',
            fontSizeRatio: 0.045,
            fontWeight: '600',
            color: '#FFFFFF',
            opacity: 0.85,
            rotation: 0,
            letterSpacing: 2,
            alignment: 'center',
            normalizedX: 0.82,
            normalizedY: 0.9,
            shadow: { color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 2, offsetY: 2 },
          },
          logoConfig: { enabled: false, scaleRatio: 0.15, opacity: 0.85, rotation: 0, normalizedX: 0.85, normalizedY: 0.85 },
          tiledConfig: { enabled: false },
        },
        version: 1,
        isDefault: true,
        createdBy: user._id,
        updatedBy: user._id,
      });

      // Tokens & Session
      const accessToken = JWTUtil.signAccessToken({
        userId: user._id.toString(),
        companyId: company._id.toString(),
        role: 'Company',
        membershipId: membership._id.toString(),
      });

      const refreshToken = JWTUtil.signRefreshToken({ userId: user._id.toString() });
      const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

      await RefreshSession.create({
        userId: user._id,
        hashedToken: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      await ActivityLogger.log({
        companyId: company._id,
        actorId: user._id,
        action: 'COMPANY_REGISTERED',
        resourceType: 'company',
        resourceId: company._id,
        req,
      });

      res.status(201).json({
        success: true,
        message: 'Company registered successfully.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          company: {
            id: company._id,
            name: company.name,
            slug: company.slug,
            settings: company.settings,
            storageQuota: company.storageQuota,
            storageUsage: company.storageUsage,
          },
          role: 'Company',
          permissions: membership.permissions,
          accessToken,
          refreshToken,
        },
      });
    } catch (err: any) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Server registration error.' });
    }
  }

  /**
   * Login with email and password
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const { email, password, companyId } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      if (user.status !== 'active') {
        res.status(403).json({ success: false, message: 'Your user account is suspended.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      // Fetch all active memberships for this user
      const memberships = await CompanyMembership.find({
        userId: user._id,
        status: 'active',
      }).populate('companyId');

      const validMemberships = memberships.filter((m: any) => m.companyId && m.companyId.status !== 'suspended');

      if (validMemberships.length === 0) {
        res.status(403).json({ success: false, message: 'You have no active company workspace memberships.' });
        return;
      }

      // Select target company membership
      let targetMembership = validMemberships[0];
      if (companyId) {
        const found = validMemberships.find((m: any) => m.companyId._id.toString() === companyId);
        if (found) targetMembership = found;
      }

      const activeCompany = targetMembership.companyId as any;

      // Issue tokens
      const accessToken = JWTUtil.signAccessToken({
        userId: user._id.toString(),
        companyId: activeCompany._id.toString(),
        role: targetMembership.role,
        membershipId: targetMembership._id.toString(),
      });

      const refreshToken = JWTUtil.signRefreshToken({ userId: user._id.toString() });
      const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

      await RefreshSession.create({
        userId: user._id,
        hashedToken: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      const availableCompanies = memberships.map((m: any) => ({
        id: m.companyId._id,
        name: m.companyId.name,
        slug: m.companyId.slug,
        role: m.role,
      }));

      await ActivityLogger.log({
        companyId: activeCompany._id,
        actorId: user._id,
        action: 'USER_LOGIN',
        resourceType: 'auth',
        resourceId: user._id,
        req,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          company: {
            id: activeCompany._id,
            name: activeCompany.name,
            slug: activeCompany.slug,
            settings: activeCompany.settings,
            storageQuota: activeCompany.storageQuota,
            storageUsage: activeCompany.storageUsage,
          },
          role: targetMembership.role,
          permissions: targetMembership.permissions,
          availableCompanies,
          accessToken,
          refreshToken,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Server login error.' });
    }
  }

  /**
   * Switch active company workspace
   */
  static async switchCompany(req: Request, res: Response): Promise<void> {
    try {
      const { targetCompanyId } = req.body;
      if (!targetCompanyId || !req.user?.userId) {
        res.status(400).json({ success: false, message: 'Target company ID is required.' });
        return;
      }

      const membership = await CompanyMembership.findOne({
        userId: req.user.userId,
        companyId: targetCompanyId,
        status: 'active',
      }).populate('companyId');

      if (!membership) {
        res.status(403).json({ success: false, message: 'You do not have an active membership in this company.' });
        return;
      }

      const activeCompany = membership.companyId as any;

      const accessToken = JWTUtil.signAccessToken({
        userId: req.user.userId,
        companyId: activeCompany._id.toString(),
        role: membership.role,
        membershipId: membership._id.toString(),
      });

      res.status(200).json({
        success: true,
        message: `Switched to workspace: ${activeCompany.name}`,
        data: {
          company: {
            id: activeCompany._id,
            name: activeCompany.name,
            slug: activeCompany.slug,
            settings: activeCompany.settings,
            storageQuota: activeCompany.storageQuota,
            storageUsage: activeCompany.storageUsage,
          },
          role: membership.role,
          permissions: membership.permissions,
          accessToken,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to switch company.' });
    }
  }

  /**
   * Get public preview & expiration status of an invitation token
   */
  static async getInvitationInfo(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        res.status(400).json({ success: false, message: 'Token query parameter is required.' });
        return;
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const invitation = await Invitation.findOne({ tokenHash }).populate('companyId', 'name');

      if (!invitation) {
        res.status(404).json({ success: false, message: 'Invitation link is invalid or does not exist.' });
        return;
      }

      if (invitation.acceptedAt) {
        res.status(400).json({ success: false, message: 'This invitation has already been accepted.' });
        return;
      }

      const isExpired = invitation.expiresAt.getTime() <= Date.now();

      res.status(200).json({
        success: true,
        data: {
          email: invitation.email,
          role: invitation.invitedRole,
          companyName: (invitation.companyId as any)?.name || 'Jewellery Workspace',
          isExpired,
          expiresAt: invitation.expiresAt,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to inspect invitation.' });
    }
  }

  /**
   * Accept an invitation (Designer or Viewer)
   */
  static async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const parsed = acceptInviteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
      }

      const { token, name, password } = parsed.data;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const invitation = await Invitation.findOne({
        tokenHash,
        acceptedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (!invitation) {
        res.status(400).json({ success: false, message: 'Invalid or expired invitation token.' });
        return;
      }

      // Check invitedRole: must strictly be Designer or Viewer
      if (invitation.invitedRole !== 'Designer' && invitation.invitedRole !== 'Viewer') {
        res.status(400).json({ success: false, message: 'Invalid role in invitation.' });
        return;
      }

      let user = await User.findOne({ email: invitation.email });
      if (!user) {
        if (!password || !name) {
          res.status(400).json({
            success: false,
            message: 'Name and password are required to create your account.',
          });
          return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        user = await User.create({
          name: name.trim(),
          email: invitation.email,
          passwordHash,
          status: 'active',
          emailVerifiedAt: new Date(),
        });
      } else {
        if (password) {
          user.passwordHash = await bcrypt.hash(password, 12);
        }
        if (name) {
          user.name = name.trim();
        }
        user.status = 'active';
        await user.save();
      }

      // Check if membership already exists
      let membership = await CompanyMembership.findOne({
        companyId: invitation.companyId,
        userId: user._id,
      });

      // Default permissions based on role
      const defaultDesignerPermissions = {
        canUpload: true,
        canProcess: true,
        canCreateTemplate: true,
        canEditTemplate: true,
        canDeleteDesign: true,
        canExportZip: true,
        canInviteMembers: false,
        canCreateProject: true,
      };

      const defaultViewerPermissions = {
        canUpload: false,
        canProcess: false,
        canCreateTemplate: false,
        canEditTemplate: false,
        canDeleteDesign: false,
        canExportZip: false,
        canInviteMembers: false,
        canCreateProject: false,
      };

      const permissions =
        invitation.invitedRole === 'Designer'
          ? defaultDesignerPermissions
          : defaultViewerPermissions;

      if (!membership) {
        membership = await CompanyMembership.create({
          companyId: invitation.companyId,
          userId: user._id,
          role: invitation.invitedRole,
          permissions,
          status: 'active',
          invitedBy: invitation.invitedBy,
        });
      } else {
        membership.role = invitation.invitedRole;
        membership.status = 'active';
        membership.permissions = permissions;
        await membership.save();
      }

      invitation.acceptedAt = new Date();
      await invitation.save();

      const company = await Company.findById(invitation.companyId);
      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found.' });
        return;
      }

      const accessToken = JWTUtil.signAccessToken({
        userId: user._id.toString(),
        companyId: company._id.toString(),
        role: invitation.invitedRole,
        membershipId: membership._id.toString(),
      });

      const refreshToken = JWTUtil.signRefreshToken({ userId: user._id.toString() });
      const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

      await RefreshSession.create({
        userId: user._id,
        hashedToken: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      await ActivityLogger.log({
        companyId: company._id,
        actorId: user._id,
        action: 'INVITATION_ACCEPTED',
        resourceType: 'member',
        resourceId: membership._id,
        metadata: { role: invitation.invitedRole },
        req,
      });

      res.status(200).json({
        success: true,
        message: `Welcome to ${company.name} as a ${invitation.invitedRole}!`,
        data: {
          user: { id: user._id, name: user.name, email: user.email },
          company: {
            id: company._id,
            name: company.name,
            slug: company.slug,
            settings: company.settings,
            storageQuota: company.storageQuota,
            storageUsage: company.storageUsage,
          },
          role: invitation.invitedRole,
          permissions: membership.permissions,
          accessToken,
          refreshToken,
        },
      });
    } catch (err: any) {
      console.error('Accept invitation error:', err);
      res.status(500).json({ success: false, message: 'Server error processing invitation.' });
    }
  }

  /**
   * Refresh access token
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, message: 'Refresh token required.' });
        return;
      }

      let payload;
      try {
        payload = JWTUtil.verifyRefreshToken(refreshToken);
      } catch (e) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
        return;
      }

      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const session = await RefreshSession.findOne({
        userId: payload.userId,
        hashedToken,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        res.status(401).json({ success: false, message: 'Session revoked or expired.' });
        return;
      }

      const user = await User.findById(payload.userId);
      if (!user || user.status !== 'active') {
        res.status(401).json({ success: false, message: 'User account inactive.' });
        return;
      }

      // Find company membership (use body.companyId or first active)
      const requestedCompanyId = req.body.companyId;
      let membership = requestedCompanyId
        ? await CompanyMembership.findOne({ userId: user._id, companyId: requestedCompanyId, status: 'active' })
        : await CompanyMembership.findOne({ userId: user._id, status: 'active' });

      if (!membership) {
        res.status(403).json({ success: false, message: 'No active company membership.' });
        return;
      }

      const newAccessToken = JWTUtil.signAccessToken({
        userId: user._id.toString(),
        companyId: membership.companyId.toString(),
        role: membership.role,
        membershipId: membership._id.toString(),
      });

      res.status(200).json({
        success: true,
        accessToken: newAccessToken,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Refresh token error.' });
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      if (refreshToken) {
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await RefreshSession.updateOne({ hashedToken }, { isRevoked: true });
      }
      res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Logout failed.' });
    }
  }

  /**
   * Get current authenticated user profile, active company, and memberships
   */
  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const user = await User.findById(req.user.userId).select('-passwordHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const memberships = await CompanyMembership.find({
        userId: user._id,
        status: 'active',
      }).populate('companyId');

      const availableCompanies = memberships.map((m: any) => ({
        id: m.companyId._id,
        name: m.companyId.name,
        slug: m.companyId.slug,
        role: m.role,
      }));

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
          company: req.company
            ? {
                id: req.company._id,
                name: req.company.name,
                slug: req.company.slug,
                settings: req.company.settings,
                storageQuota: req.company.storageQuota,
                storageUsage: req.company.storageUsage,
              }
            : null,
          role: req.user.role,
          permissions: req.membership?.permissions || {},
          availableCompanies,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
    }
  }

  /**
   * Request password reset token
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required.' });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();
        
        // In local/staging, return token or log it
        console.log(`[Auth] Password reset token for ${email}: ${token}`);
        res.status(200).json({
          success: true,
          message: 'If an account exists, a reset link has been issued.',
          resetToken: token, // returned for seamless testing/demo flow
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'If an account exists, a reset link has been issued.',
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Forgot password error.' });
    }
  }

  /**
   * Reset password with valid token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Valid token and minimum 8 char password required.' });
        return;
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
        return;
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Invalidate existing sessions
      await RefreshSession.updateMany({ userId: user._id }, { isRevoked: true });

      res.status(200).json({ success: true, message: 'Password has been reset successfully. Please login.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Password reset error.' });
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ success: false, message: 'Verification token required.' });
        return;
      }

      const user = await User.findOne({ verificationToken: token });
      if (!user) {
        res.status(400).json({ success: false, message: 'Invalid verification token.' });
        return;
      }

      user.emailVerifiedAt = new Date();
      user.verificationToken = undefined;
      await user.save();

      res.status(200).json({ success: true, message: 'Email verified successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Email verification error.' });
    }
  }

  /**
   * Update user profile (name)
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
        return;
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        { name: name.trim() },
        { new: true }
      ).select('-passwordHash');

      if (!updatedUser) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      await ActivityLogger.log({
        companyId: req.user.companyId,
        actorId: req.user.userId,
        action: 'USER_PROFILE_UPDATED',
        resourceType: 'user',
        resourceId: updatedUser._id,
        metadata: { name: updatedUser.name },
        req,
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: 'Not authenticated.' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current password and new password are required.' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        return;
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await user.save();

      await ActivityLogger.log({
        companyId: req.user.companyId,
        actorId: req.user.userId,
        action: 'PASSWORD_CHANGED',
        resourceType: 'user',
        resourceId: user._id,
        req,
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully.',
      });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Failed to change password.' });
    }
  }
}
