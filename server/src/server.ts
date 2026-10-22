import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { ExportService } from './services/exportService.js';
import { StorageService } from './services/storage.js';

async function bootstrap() {
  await connectDB();

  const app = createApp();

  // Run initial cleanup of expired exports and schedule periodic cleanup
  ExportService.cleanupExpiredExports().catch(() => {});
  setInterval(() => {
    ExportService.cleanupExpiredExports().catch(() => {});
  }, 60 * 60 * 1000); // Hourly cleanup

  // Background Cloudinary sync for dual storage of existing local assets
  StorageService.syncLocalAssetsToCloudinary().catch((err) => {
    console.warn('Initial Cloudinary sync note:', err?.message);
  });

  const server = app.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`✨ Jewellery Watermark API running on port ${ENV.PORT}`);
    console.log(`🌐 Base URL: http://localhost:${ENV.PORT}/api/v1`);
    console.log(`🔒 Strictly 3 Roles: Company | Designer | Viewer`);
    console.log(`====================================================`);
  });

  const shutdown = async () => {
    console.log('\nGracefully shutting down...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
