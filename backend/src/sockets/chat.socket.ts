import { Server, Socket } from 'socket.io';
import { db } from '../config/database.js';
import { ChatMemoryService } from '../services/chatMemory.js';

export function handleChatSocket(io: Server, socket: Socket) {
  // 1. Join Chat Session Room
  socket.on('join:room', async ({ session_id, role, username }) => {
    await socket.join(session_id);
    socket.data.role = role;
    socket.data.session_id = session_id;
    socket.data.username = username;
    console.log(`[Socket Server] Client ${username || 'Anonymous'} joined Room: ${session_id} as ${role}`);

    try {
      // Fetch all sockets currently in this session room
      const roomSockets = await io.in(session_id).fetchSockets();
      const rolesInRoom = roomSockets.map(s => s.data.role);
      const hasUser = rolesInRoom.includes('user');
      const hasConsultant = rolesInRoom.includes('consultant');

      console.log(`[Socket Server] Room ${session_id} has roles:`, rolesInRoom);

      if (hasUser && hasConsultant) {
        // Both user and consultant are in the room! Broadcast to entire room.
        io.to(session_id).emit('partner:joined', { role: 'both', username: 'both' });
      } else {
        // Only one of them is in the room. Inform any other listeners of the join
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
  socket.on('send:message', ({ session_id, sender_type, sender_name, text, reply_to_id, reply_to_text, reply_to_sender }) => {
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

      // Store message in-memory during active session
      const savedMessage = ChatMemoryService.addMessage(
        session_id,
        sender_type,
        sender_name,
        text,
        reply_to_id,
        reply_to_text,
        reply_to_sender
      );
      console.log(`[Socket Server] Message added in-memory:`, savedMessage.id);

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
      // Mark all incoming messages from partner as read in-memory
      ChatMemoryService.markAsRead(session_id, sender_type);
      
      // Broadcast read receipt event to the room
      io.to(session_id).emit('messages:read_receipt', { session_id, reader_type: sender_type });
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  });

  // 5. Bidirectional Heartbeat / Ping-Pong
  socket.on('ping:heartbeat', (data) => {
    socket.emit('pong:heartbeat', data);
  });
}
