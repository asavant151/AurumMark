import { Router } from 'express';
import { CompanyController } from '../controllers/companyController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace, requireRole } from '../middlewares/role.js';

const router = Router();

router.use(requireAuth, requireCompanyWorkspace);

router.get('/current', CompanyController.getCurrent);
router.patch('/current', requireRole('Company'), CompanyController.updateCurrent);

router.get('/current/members', CompanyController.getMembers);
router.post('/current/invitations', requireRole('Company'), CompanyController.createInvitation);
router.get('/current/invitations', requireRole('Company'), CompanyController.getInvitations);
router.post('/current/invitations/:invitationId/resend', requireRole('Company'), CompanyController.resendInvitation);
router.delete('/current/invitations/:invitationId', requireRole('Company'), CompanyController.deleteInvitation);
router.patch('/current/members/:memberId', requireRole('Company'), CompanyController.updateMember);
router.delete('/current/members/:memberId', requireRole('Company'), CompanyController.deleteMember);
router.post('/current/members/:memberId/reset-password', requireRole('Company'), CompanyController.resetMemberPassword);

export default router;
