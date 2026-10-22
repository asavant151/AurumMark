import { Router } from 'express';
import { DesignController } from '../controllers/designController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace, requireRole } from '../middlewares/role.js';
import { upload, validateImageContents } from '../middlewares/upload.js';

const router = Router();

router.use(requireAuth, requireCompanyWorkspace);

router.get('/', DesignController.list);

// Upload endpoint accepts multipart image files
router.post(
  '/upload',
  requireRole('Company', 'Designer'),
  upload.array('images', 50),
  validateImageContents,
  DesignController.upload
);

router.get('/:designId', DesignController.getById);
router.patch('/:designId', requireRole('Company', 'Designer'), DesignController.update);
router.delete('/:designId', requireRole('Company', 'Designer'), DesignController.delete);

export default router;
