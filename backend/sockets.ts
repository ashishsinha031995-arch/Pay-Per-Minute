import { Server, Socket } from 'socket.io';
import { db, logWalletTransaction } from './db.js';

export function registerSocketHandlers(io: Server) {
  // ==========================================
  // SERVER-AUTHORITATIVE TIMER TICKER
  // ==========================================
  // Periodically check all active sessions, decrement or check expiry against system clock,
  // handle closing of sessions, wallet credit, and database logging.
  setInterval(() => {
    try {
      const now = new Date();

      // Check for missed pending sessions (older than 60 seconds)
      const pendingSessions = db.prepare("SELECT * FROM sessions WHERE status = 'pending'").all() as any[];
      for (const sess of pendingSessions) {
        const createdTime = new Date(sess.created_at);
        const diffMs = now.getTime() - createdTime.getTime();
        if (diffMs > 60 * 1000) { // 60 seconds ring timeout
          console.log(`[Timer Engine] Session ${sess.id} timed out waiting for acceptance. Marking as missed.`);
          db.prepare("UPDATE sessions SET status = 'missed' WHERE id = ?").run(sess.id);
          db.prepare('UPDATE consultants SET is_busy = 0 WHERE id = ?').run(sess.consultant_id);

          // Refund User Wallet fully!
          if (sess.user_id && sess.total_paid > 0) {
            db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(sess.total_paid, sess.user_id);
            logWalletTransaction(
              Number(sess.user_id),
              'refund',
              sess.total_paid,
              `Refund: Consultation request missed/timed out by advisor`
            );
          }

          io.to(sess.id).emit('session:missed', {
            session_id: sess.id,
            message: 'Chat request was missed by the consultant.'
          });
        }
      }

      // Select all sessions that are active and have expired based on current time
      const activeSessions = db.prepare("SELECT * FROM sessions WHERE status = 'active'").all() as any[];

      for (const sess of activeSessions) {
        if (sess.expires_at) {
          const expiryTime = new Date(sess.expires_at);
          if (now >= expiryTime) {
            // Session has expired!
            console.log(`[Timer Engine] Session ${sess.id} expired. Auto-completing.`);
            
            // 1. Fetch transcript (group all chat messages)
            const msgs = db.prepare('SELECT sender_name, text, created_at FROM messages WHERE session_id = ? ORDER BY id ASC').all(sess.id) as any[];
            const transcript = msgs.map(m => `[${new Date(m.created_at).toLocaleTimeString()}] ${m.sender_name}: ${m.text}`).join('\n');

            // 2. Mark session as completed
            db.prepare('UPDATE sessions SET status = ?, transcript = ? WHERE id = ?').run('completed', transcript, sess.id);

            // 3. Add earnings to consultant wallet
            const cid = sess.consultant_id;
            const earnings = sess.consultant_earnings;
            db.prepare(`
              UPDATE consultants 
              SET wallet_today = wallet_today + ?, 
                  wallet_monthly = wallet_monthly + ?, 
                  wallet_total = wallet_total + ?, 
                  wallet_withdrawable = wallet_withdrawable + ?,
                  is_busy = 0
              WHERE id = ?
            `).run(earnings, earnings, earnings, earnings, cid);

            // 4. Broadcast event via socket.io to instantly stop UI inputs
            io.to(sess.id).emit('session:expired', {
              session_id: sess.id,
              transcript,
              message: 'Session has run out of time and completed successfully.'
            });
          } else {
            // Calculate remaining seconds and optionally broadcast to keep clocks synchronized
            const remainingMs = expiryTime.getTime() - now.getTime();
            const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
            io.to(sess.id).emit('timer:tick', {
              session_id: sess.id,
              remainingSeconds,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in Server-Authoritative Timer Loop:', error);
    }
  }, 2000); // Check every 2 seconds


  // ==========================================
  // SOCKET.IO REAL-TIME CHAT SETUP
  // ==========================================
  io.on('connection', (socket: Socket) => {
    console.log('Socket Client Connected:', socket.id);

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

    // 5. Disconnect
    socket.on('disconnect', () => {
      console.log('Socket Client Disconnected:', socket.id);
    });
  });
}
