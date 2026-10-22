import multer from 'multer';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';

// Use memory storage for quick decoding and validation
const memoryStorage = multer.memoryStorage();

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 50,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, and WebP are supported.`));
    }
  },
});

const allowedDocumentMimes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const uploadDocument = multer({
  storage: memoryStorage,
  limits: {
    fileSize: ENV.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedDocumentMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported document type: ${file.mimetype}. Supported types: PDF, Word, Excel, CSV, Plain Text, JPEG, PNG, WebP.`));
    }
  },
});

/**
 * Validates actual image buffers using Sharp to prevent corrupted or disguised files
 */
export const validateImageContents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const files: Express.Multer.File[] = [];

  if (req.file) {
    files.push(req.file);
  }
  if (Array.isArray(req.files)) {
    files.push(...(req.files as Express.Multer.File[]));
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((f) => {
      if (Array.isArray(f)) files.push(...f);
      else if (f) files.push(f);
    });
  }

  if (files.length === 0) {
    return next();
  }

  for (const file of files) {
    try {
      // Decode image headers with sharp
      const meta = await sharp(file.buffer).metadata();
      if (!meta.format || !meta.width || !meta.height) {
        res.status(400).json({
          success: false,
          message: `File '${file.originalname}' could not be decoded as a valid image.`,
        });
        return;
      }

      // Check pixel bounds (prevent pixel flood attack e.g. 100,000 x 100,000)
      if (meta.width > 12000 || meta.height > 12000) {
        res.status(400).json({
          success: false,
          message: `File '${file.originalname}' exceeds maximum pixel dimensions (12000x12000).`,
        });
        return;
      }
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: `File '${file.originalname}' is corrupted or invalid: ${err.message}`,
      });
      return;
    }
  }

  next();
};
