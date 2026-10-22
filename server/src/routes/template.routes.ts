import { Router } from 'express';
import { TemplateController } from '../controllers/templateController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace, requireRole } from '../middlewares/role.js';

const router = Router();

router.use(requireAuth, requireCompanyWorkspace);

router.get('/', TemplateController.list);
router.post('/', requireRole('Company', 'Designer'), TemplateController.create);
router.post('/preview', TemplateController.preview);
router.get('/:templateId', TemplateController.getById);
router.patch('/:templateId', requireRole('Company', 'Designer'), TemplateController.update);
router.post('/:templateId/duplicate', requireRole('Company', 'Designer'), TemplateController.duplicate);
router.delete('/:templateId', requireRole('Company', 'Designer'), TemplateController.delete);

export default router;
