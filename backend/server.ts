import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import { initDb } from './db.js';
import { registerSocketHandlers } from './sockets.js';
import adminRouter from './routes/admin.js';
import consultantsRouter from './routes/consultants.js';
import usersRouter from './routes/users.js';
import paymentsRouter from './routes/payments.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Make socket.io available globally to HTTP route handlers
app.set('io', io);

const PORT = 3000;

// Initialize SQLite database, tables, and seed defaults
initDb();

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API Routes
app.use('/api/admin', adminRouter);
app.use('/api/consultants', consultantsRouter);
app.use('/api/user', usersRouter);
app.use('/api', paymentsRouter);

// Set up WebSocket handlers & background authoritative timers
registerSocketHandlers(io);

// Serve Frontend using Vite Dev Server in Development, or Static build files in Production
async function startPlatform() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SaaS Chat Platform running on http://0.0.0.0:${PORT}`);
  });
}

startPlatform();
export { app, server, io };
