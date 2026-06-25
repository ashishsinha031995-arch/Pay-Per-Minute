import { Server, Socket } from 'socket.io';
import { handleChatSocket } from './chat.socket.js';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Socket Client Connected:', socket.id);

    // Delegate room message exchange logic
    handleChatSocket(io, socket);

    socket.on('disconnect', () => {
      console.log('Socket Client Disconnected:', socket.id);
    });
  });
}
