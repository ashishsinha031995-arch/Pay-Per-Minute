import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { initDb } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import adminRoutes from './routes/admin.routes.js';
import supportRoutes from './routes/support.routes.js';

const app = express();

// Initialize SQLite database schema & seeds
initDb();

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.error('[App] Failed to create uploads directory:', err);
  }
}

// Serve uploaded profile photos statically
app.use('/uploads', express.static(uploadsDir));

// Body parsers with increased limits for Base64 photo uploading
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register Modular API Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', chatRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api', supportRoutes);
app.use('/api/admin', adminRoutes);

export default app;
