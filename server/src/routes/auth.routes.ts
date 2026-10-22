import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.get('/invitations/info', AuthController.getInvitationInfo);
router.post('/invitations/accept', AuthController.acceptInvitation);
router.post('/switch-company', requireAuth, AuthController.switchCompany);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/verify-email', AuthController.verifyEmail);
router.get('/me', requireAuth, AuthController.getMe);
router.patch('/profile', requireAuth, AuthController.updateProfile);
router.post('/change-password', requireAuth, AuthController.changePassword);

export default router;
