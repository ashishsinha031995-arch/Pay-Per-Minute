import { Server, Socket } from 'socket.io';
import { db } from '../config/database.js';
import { ChatMemoryService } from '../services/chatMemory.js';

export function handleChatSocket(io: Server, socket: Socket) {
  // 1. Join Chat Session Room
  socket.on('join:room', async ({ session_id, role, username }) => {
    try {
      // Verify if the session exists
      const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
      if (!sess) {
        console.warn(`[Socket Authorization] Room Join rejected: Session ${session_id} not found.`);
        socket.emit('error:msg', 'Session not found.');
        socket.disconnect();
        return;
      }

      // Check if authenticated userId belongs to this session
      const authUserId = socket.data.userId;
      const isUser = Number(sess.user_id) === Number(authUserId);
      const isConsultant = Number(sess.consultant_id) === Number(authUserId);

      if (!isUser && !isConsultant) {
        console.warn(`[Socket Authorization] Unauthorized Room Join attempt! User ID ${authUserId} tried to join session ${session_id} as ${role}.`);
        socket.emit('error:msg', 'Unauthorized: You are not a participant in this session.');
        socket.disconnect();
        return;
      }

      await socket.join(session_id);
      socket.data.role = role;
      socket.data.session_id = session_id;
      socket.data.username = username;
      console.log(`[Socket Server] Client ${username || 'Anonymous'} (User ID: ${authUserId}) joined Room: ${session_id} as ${role}`);

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
      console.error('Error in room join authorization:', err);
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
      // Sender Validation
      if (!socket.rooms.has(session_id)) {
        console.warn(`[Socket Security Warning] Unauthorized send:message emission! Socket ${socket.id} (User ID: ${socket.data.userId}) attempted to emit message to session ${session_id} but is not active in this session room.`);
        socket.emit('error:msg', 'Unauthorized: You are not active in this session room.');
        return;
      }

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
