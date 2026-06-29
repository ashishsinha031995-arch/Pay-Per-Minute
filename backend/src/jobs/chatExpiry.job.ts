import { Server } from 'socket.io';
import { db, logWalletTransaction } from '../config/database.js';

export function startChatExpiryJob(io: Server) {
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
          
          const userId = sess.user_id;
          const totalPaid = sess.total_paid;
          const consultantId = sess.consultant_id;

          db.prepare("UPDATE sessions SET status = 'missed', total_paid = 0.0, commission_amount = 0.0, consultant_earnings = 0.0, duration_minutes = 0 WHERE id = ?").run(sess.id);
          db.prepare('UPDATE consultants SET is_busy = 0 WHERE id = ?').run(consultantId);

          // Refund User Wallet fully!
          if (userId && totalPaid > 0) {
            db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(totalPaid, userId);
            logWalletTransaction(
              Number(userId),
              'refund',
              totalPaid,
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
            const msgs = db.prepare('SELECT sender_type, sender_name, text, created_at FROM messages WHERE session_id = ? ORDER BY id ASC').all(sess.id) as any[];
            const transcript = msgs.map(m => `[${new Date(m.created_at).toLocaleTimeString()}] ${m.sender_name}: ${m.text.startsWith('[VOICE_NOTE]:') ? '[Voice Note 🎙️]' : m.text}`).join('\n');

            const consultantMsgs = msgs.filter(m => m.sender_type === 'consultant');

            if (consultantMsgs.length === 0) {
              // Consultant did not reply or participate at all!
              // Treat this as missed / cancelled! No money deducted from user wallet (refund).
              console.log(`[Timer Engine] Session ${sess.id} expired with 0 consultant replies. Refunded user fully.`);
              
              const userId = sess.user_id;
              const totalPaid = sess.total_paid;
              const consultantId = sess.consultant_id;

              db.prepare("UPDATE sessions SET status = 'missed', total_paid = 0.0, commission_amount = 0.0, consultant_earnings = 0.0, duration_minutes = 0 WHERE id = ?").run(sess.id);
              db.prepare('UPDATE consultants SET is_busy = 0 WHERE id = ?').run(consultantId);

              if (userId && totalPaid > 0) {
                db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(totalPaid, userId);
                logWalletTransaction(
                  Number(userId),
                  'refund',
                  totalPaid,
                  `Refund: Consultation session missed/ignored by advisor (No messages received)`
                );
              }

              io.to(sess.id).emit('session:missed', {
                session_id: sess.id,
                message: 'Session has ended as advisor failed to participate.'
              });
              continue;
            }

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
                  lifetime_revenue = lifetime_revenue + ?,
                  total_sessions = total_sessions + ?,
                  is_busy = 0
              WHERE id = ?
            `).run(earnings, earnings, earnings, earnings, earnings, 1, cid);

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
}
