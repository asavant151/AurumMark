import { Router } from 'express';
import { ExportController } from '../controllers/exportController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace } from '../middlewares/role.js';

const router = Router();

// Public download with secure token
router.get('/download/:token', ExportController.downloadArchive);

// Authenticated export operations
router.use(requireAuth, requireCompanyWorkspace);

router.post('/', ExportController.createExport);
router.get('/', ExportController.listExports);
router.get('/single-downloads', ExportController.listSingleDownloads);
router.get('/:exportId', ExportController.getExportById);

export default router;
