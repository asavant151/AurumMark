import { Request, Response, NextFunction } from 'express';
import { UserRole, IMembershipPermissions } from '../models/CompanyMembership.js';

export const requireCompanyWorkspace = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.companyId || !req.company || !req.membership) {
    res.status(403).json({
      success: false,
      message: 'Access denied. You must be active in a company workspace.',
    });
    return;
  }
  next();
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized for this operation. Requires one of: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};

export const requirePermission = (permission: keyof IMembershipPermissions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.membership) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    // Company workspace owner always has all permissions
    if (req.user.role === 'Company') {
      return next();
    }

    // Viewer policy checks for downloads
    if (req.user.role === 'Viewer') {
      if (permission === 'canExportZip' && !req.company?.settings.allowViewerZipDownload) {
        res.status(403).json({
          success: false,
          message: 'Company policy does not permit Viewers to export ZIP archives.',
        });
        return;
      }
    }

    // Check member's specific permission
    const hasPerm = req.membership.permissions[permission];
    if (!hasPerm) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Missing required permission: ${String(permission)}.`,
      });
      return;
    }

    next();
  };
};
