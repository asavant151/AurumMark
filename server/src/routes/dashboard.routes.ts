import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace } from '../middlewares/role.js';

const router = Router();

router.use(requireAuth, requireCompanyWorkspace);

router.get('/summary', DashboardController.getSummary);
router.get('/activity', DashboardController.getActivity);

export default router;
