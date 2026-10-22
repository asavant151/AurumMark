import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    console.log(`[Database] MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('[Database] Connection Error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB Disconnected');
  } catch (error) {
    console.error('[Database] Disconnect Error:', error);
  }
};
