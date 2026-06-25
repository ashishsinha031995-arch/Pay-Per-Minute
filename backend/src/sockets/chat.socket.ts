import { Server, Socket } from 'socket.io';
import { db } from '../config/database.js';

export function handleChatSocket(io: Server, socket: Socket) {
  // 1. Join Chat Session Room
  socket.on('join:room', async ({ session_id, role, username }) => {
    socket.join(session_id);
    console.log(`[Socket Server] Client ${username || 'Anonymous'} joined Room: ${session_id} as ${role}`);

    try {
      // Let the partner in the room know someone joined
      const roomObj = io.sockets.adapter.rooms.get(session_id);
      const roomSize = roomObj ? roomObj.size : 0;
      console.log(`[Socket Server] Room ${session_id} size is now ${roomSize}`);
      if (roomSize >= 2) {
        // Broadcast to entire room that both are connected and active
        io.to(session_id).emit('partner:joined', { role: 'both', username: 'both' });
      } else {
        socket.to(session_id).emit('partner:joined', { role, username });
      }
    } catch (err) {
      console.error('Error starting session countdown on room join:', err);
    }
  });

  // Inform partner when client is disconnecting from their rooms
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('partner:left');
      }
    }
  });

  // 2. Real-time Messages exchange
  socket.on('send:message', ({ session_id, sender_type, sender_name, text }) => {
    console.log(`[Socket Server] Received send:message from ${sender_name} (${sender_type}) in session ${session_id}: "${text}"`);
    try {
      // Ensure session is active or pending before allowing messages
      let sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
      if (!sess) {
        console.warn(`[Socket Server] Session ${session_id} not found!`);
        socket.emit('error:msg', 'Session not found.');
        return;
      }

      if (sess.status === 'completed' || sess.status === 'cancelled' || sess.status === 'rejected' || sess.status === 'missed') {
        console.warn(`[Socket Server] Session ${session_id} is not active!`);
        socket.emit('error:msg', 'This session is not active.');
        return;
      }

      const created_at = new Date().toISOString();
      const result = db.prepare(`
        INSERT INTO messages (session_id, sender_type, sender_name, text, created_at, is_read)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(session_id, sender_type, sender_name, text, created_at);

      console.log(`[Socket Server] Message inserted successfully. Row ID:`, result.lastInsertRowid);

      const savedMessage = {
        id: Number(result.lastInsertRowid),
        session_id,
        sender_type,
        sender_name,
        text,
        created_at,
        is_read: 0,
      };

      console.log(`[Socket Server] Broadcasting message to session room ${session_id}:`, savedMessage);
      // Broadcast message to everyone in the room
      io.to(session_id).emit('message', savedMessage);
    } catch (err) {
      console.error('Failed to save and broadcast chat message:', err);
    }
  });

  // 3. Typing indicator
  socket.on('typing', ({ session_id, sender_name, is_typing }) => {
    socket.to(session_id).emit('partner:typing', { sender_name, is_typing });
  });

  // 4. Mark messages as read
  socket.on('read:messages', ({ session_id, sender_type }) => {
    try {
      // Mark all incoming messages from partner as read
      const partnerType = sender_type === 'user' ? 'consultant' : 'user';
      db.prepare('UPDATE messages SET is_read = 1 WHERE session_id = ? AND sender_type = ?').run(session_id, partnerType);
      
      // Broadcast read receipt event to the room
      io.to(session_id).emit('messages:read_receipt', { session_id, reader_type: sender_type });
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  });
}
