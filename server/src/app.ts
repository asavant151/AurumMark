import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const createApp = (): Express => {
  const app = express();

  // Morgan HTTP Request Logger (shows API route calls in terminal)
  if (ENV.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  } else {
    // In test mode, keep output clean unless debugging
    app.use(morgan(':method :url :status - :response-time ms', {
      skip: () => process.env.SILENT_TESTS === 'true',
    }));
  }

  // Helmet with relaxed cross-origin resource policy for image viewing
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Explicit CORS configuration
  const allowedOrigins = [
    ENV.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate Limiter
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Parsers
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));
  app.use(cookieParser());

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      time: new Date().toISOString(),
      service: 'Jewellery Watermark SaaS API',
    });
  });

  // Mount API v1
  app.use('/api/v1', apiRouter);

  // Global error handler
  app.use(errorHandler);

  return app;
};
