import { Server, Socket } from 'socket.io';
import { handleChatSocket } from './chat.socket.js';
import { db } from '../config/database.js';

export function registerSocketHandlers(io: Server) {
  // Add authentication middleware
  io.use((socket: Socket, next) => {
    const authUserId = socket.handshake.auth?.userId || socket.handshake.headers?.['x-user-id'];
    if (!authUserId) {
      console.warn('[Socket Auth] Connection rejected: User ID missing');
      return next(new Error('Authentication failed: User ID missing'));
    }

    const parsedId = Number(authUserId);
    if (isNaN(parsedId)) {
      console.warn(`[Socket Auth] Connection rejected: Invalid User ID format "${authUserId}"`);
      return next(new Error('Authentication failed: Invalid User ID format'));
    }

    try {
      // Check users table
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(parsedId) as any;
      if (user) {
        if (user.is_blocked === 1) {
          console.warn(`[Socket Auth] Connection rejected: User ID ${parsedId} is blocked`);
          return next(new Error('Authentication failed: User is blocked'));
        }
        socket.data.userId = parsedId;
        return next();
      }

      // Check consultants table
      const consultant = db.prepare('SELECT * FROM consultants WHERE id = ?').get(parsedId) as any;
      if (consultant) {
        if (consultant.suspended_until) {
          const suspendedUntil = new Date(consultant.suspended_until);
          if (suspendedUntil > new Date()) {
            console.warn(`[Socket Auth] Connection rejected: Consultant ID ${parsedId} is suspended`);
            return next(new Error('Authentication failed: Consultant is suspended'));
          }
        }
        socket.data.userId = parsedId;
        return next();
      }

      console.warn(`[Socket Auth] Connection rejected: User/Consultant ID ${parsedId} not found in database`);
      return next(new Error('Authentication failed: User or Consultant not found'));
    } catch (err) {
      console.error('[Socket Auth] Error verifying user/consultant:', err);
      return next(new Error('Authentication failed: Database error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('Socket Client Connected:', socket.id, 'User ID:', socket.data.userId);

    // Delegate room message exchange logic
    handleChatSocket(io, socket);

    socket.on('disconnect', () => {
      console.log('Socket Client Disconnected:', socket.id, 'User ID:', socket.data.userId);
    });
  });
}

