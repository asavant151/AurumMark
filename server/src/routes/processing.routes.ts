import { Router } from 'express';
import { ProcessingController } from '../controllers/processingController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace, requireRole } from '../middlewares/role.js';

const router = Router();

router.use(requireAuth, requireCompanyWorkspace);

router.get('/batches', ProcessingController.listBatches);
router.post('/batches', requireRole('Company', 'Designer'), ProcessingController.createBatch);
router.get('/batches/:batchId', ProcessingController.getBatchById);
router.post('/batches/:batchId/retry', requireRole('Company', 'Designer'), ProcessingController.retryBatch);
router.post('/batches/:batchId/cancel', requireRole('Company', 'Designer'), ProcessingController.cancelBatch);

export default router;
