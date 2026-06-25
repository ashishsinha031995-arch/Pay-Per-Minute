import express from 'express';
import { initDb } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// Initialize SQLite database schema & seeds
initDb();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register Modular API Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', chatRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

export default app;
