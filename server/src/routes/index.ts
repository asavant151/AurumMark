import { Router } from 'express';
import authRoutes from './auth.routes.js';
import companyRoutes from './company.routes.js';
import projectRoutes from './project.routes.js';
import designRoutes from './design.routes.js';
import templateRoutes from './template.routes.js';
import processingRoutes from './processing.routes.js';
import exportRoutes from './export.routes.js';
import assetRoutes from './asset.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import uploadRoutes from './upload.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/companies', companyRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/designs', designRoutes);
apiRouter.use('/watermark-templates', templateRoutes);
apiRouter.use('/processing', processingRoutes);
apiRouter.use('/exports', exportRoutes);
apiRouter.use('/assets', assetRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/uploads', uploadRoutes);

export default apiRouter;
