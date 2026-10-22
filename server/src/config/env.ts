import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jewellery_watermark_db',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'jewellery_watermark_jwt_access_secret_super_secure_key_12345!',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'jewellery_watermark_jwt_refresh_secret_super_secure_key_67890!',
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  STORAGE_DIR: path.resolve(process.env.STORAGE_DIR || './uploads'),
  EXPORT_DIR: path.resolve(process.env.EXPORT_DIR || './temp-exports'),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  MAX_BATCH_SIZE_MB: parseInt(process.env.MAX_BATCH_SIZE_MB || '150', 10),
  STORAGE_QUOTA_DEFAULT_BYTES: 5 * 1024 * 1024 * 1024, // 5 GB default
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER as 'local' | 'cloudinary') || (process.env.CLOUDINARY_API_KEY ? 'cloudinary' : 'local'),
};
