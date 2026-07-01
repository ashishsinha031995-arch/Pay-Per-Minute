import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import app from './src/app.js';
import { registerSocketHandlers } from './src/sockets/socketManager.js';
import { initializeSystemTimers } from './src/services/timer.service.js';
import { socketConfig } from './src/config/socket.js';

const server = createServer(app);
const io = new Server(server, socketConfig);

// Make socket.io available globally to HTTP route handlers
app.set('io', io);

const PORT = 3000;

// Set up WebSocket handlers & background authoritative timers
registerSocketHandlers(io);
initializeSystemTimers(io);

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
    console.log(`Modular SaaS Chat Platform running on http://0.0.0.0:${PORT}`);
  });
}

startPlatform();

export { app, server, io };
