import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace, requireRole } from '../middlewares/role.js';

const router = Router();

router.use(requireAuth, requireCompanyWorkspace);

router.get('/', ProjectController.list);
router.post('/', requireRole('Company', 'Designer'), ProjectController.create);
router.get('/:projectId', ProjectController.getById);
router.patch('/:projectId', requireRole('Company', 'Designer'), ProjectController.update);
router.delete('/:projectId', requireRole('Company'), ProjectController.delete);

export default router;
