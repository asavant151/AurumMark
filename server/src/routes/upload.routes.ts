import { Router } from 'express';
import { UploadController } from '../controllers/uploadController.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace, requireRole } from '../middlewares/role.js';
import { upload, uploadDocument, validateImageContents } from '../middlewares/upload.js';

const router = Router();

router.use(requireAuth, requireCompanyWorkspace);

// Check storage & Cloudinary status
router.get('/status', UploadController.getCloudinaryStatus);
router.post('/sync-cloudinary', UploadController.syncCloudinary);

// Upload document (PDF certificates, invoices, hallmarking files, spreadsheets)
router.post(
  '/document',
  requireRole('Company', 'Designer'),
  uploadDocument.array('documents', 10),
  UploadController.uploadDocument
);

// Upload company logo
router.post(
  '/logo',
  requireRole('Company', 'Designer'),
  upload.single('logo'),
  validateImageContents,
  UploadController.uploadLogo
);

export default router;
