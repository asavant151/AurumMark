import { Router } from 'express';
import { AssetController } from '../controllers/assetController.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.js';
import { requireCompanyWorkspace } from '../middlewares/role.js';

const router = Router();

// Viewing assets (supports Bearer token, ?token= param, or direct <img> streaming/redirect)
router.get('/:assetId/view', optionalAuth, AssetController.viewAsset);

// Downloading individual assets (strictly enforces authenticated company workspace and viewer download policies)
router.get('/:assetId/download', requireAuth, requireCompanyWorkspace, AssetController.downloadAsset);

export default router;
