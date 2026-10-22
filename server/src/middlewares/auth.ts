import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '../utils/jwt.js';
import { CompanyMembership } from '../models/CompanyMembership.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    let payload;
    try {
      payload = JWTUtil.verifyAccessToken(token);
    } catch (err: any) {
      res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
      return;
    }

    if (!payload.userId) {
      res.status(401).json({ success: false, message: 'Malformed authentication token.' });
      return;
    }

    // Check user status
    const user = await User.findById(payload.userId);
    if (!user || user.status !== 'active') {
      res.status(401).json({ success: false, message: 'User account is suspended or not found.' });
      return;
    }

    // If companyId is in payload, verify active membership and company
    if (payload.companyId) {
      const membership = await CompanyMembership.findOne({
        userId: user._id,
        companyId: payload.companyId,
        status: 'active',
      });

      if (!membership) {
        res.status(403).json({ success: false, message: 'No active membership found for this company workspace.' });
        return;
      }

      const company = await Company.findById(payload.companyId);
      if (!company || company.status !== 'active') {
        res.status(403).json({ success: false, message: 'Company workspace is suspended or inactive.' });
        return;
      }

      req.user = {
        userId: user._id.toString(),
        companyId: company._id.toString(),
        role: membership.role,
        membershipId: membership._id.toString(),
      };
      req.company = company;
      req.membership = membership;
    } else {
      // User authenticated without active company yet
      req.user = {
        userId: user._id.toString(),
        companyId: '',
        role: 'Viewer', // default fallback
        membershipId: '',
      };
    }

    next();
  } catch (error: any) {
    console.error('requireAuth error:', error);
    res.status(500).json({ success: false, message: 'Authentication verification failure.' });
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      return next();
    }

    const payload = JWTUtil.verifyAccessToken(token);
    if (payload.userId) {
      const user = await User.findById(payload.userId);
      if (user && user.status === 'active') {
        req.user = {
          userId: user._id.toString(),
          role: (payload.role as any) || 'Viewer',
          companyId: payload.companyId || '',
          membershipId: '',
        };
      }
    }
  } catch {
    // Silently continue if optional token is absent or invalid
  }
  next();
};

