import { Server } from 'socket.io';
import { db, logWalletTransaction } from '../config/database.js';
import { processNextInQueue } from '../controllers/payment.controller.js';
import { ChatMemoryService } from '../services/chatMemory.js';
import { checkAndResetMonthlyWallets } from '../utils/salary.js';

export function startChatExpiryJob(io: Server) {
  // Periodically check all active sessions, decrement or check expiry against system clock,
  // handle closing of sessions, wallet credit, and database logging.
  setInterval(() => {
    try {
      const now = new Date();

      // Ensure monthly wallets are reset immediately when midnight of next day of cutoff starts
      checkAndResetMonthlyWallets();

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
          processNextInQueue(consultantId, io);

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
            
            // Consolidate in-memory messages and save to SQLite/MongoDB database!
            const { transcript, consultantMsgCount } = ChatMemoryService.consolidateAndSave(sess.id);

            if (consultantMsgCount === 0) {
              // Consultant did not reply or participate at all!
              // Treat this as missed / cancelled! No money deducted from user wallet (refund).
              console.log(`[Timer Engine] Session ${sess.id} expired with 0 consultant replies. Refunded user fully.`);
              
              const userId = sess.user_id;
              const totalPaid = sess.total_paid;
              const consultantId = sess.consultant_id;

              db.prepare("UPDATE sessions SET status = 'missed', total_paid = 0.0, commission_amount = 0.0, consultant_earnings = 0.0, duration_minutes = 0 WHERE id = ?").run(sess.id);
              processNextInQueue(consultantId, io);

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
            
            // Check and trigger monthly wallet reset if crossed cutoff day before adding new monthly earnings
            checkAndResetMonthlyWallets();

            db.prepare(`
              UPDATE consultants 
              SET wallet_today = wallet_today + ?, 
                  wallet_monthly = wallet_monthly + ?, 
                  wallet_total = wallet_total + ?, 
                  wallet_withdrawable = wallet_withdrawable + ?,
                  lifetime_revenue = lifetime_revenue + ?,
                  total_sessions = total_sessions + ?
              WHERE id = ?
            `).run(earnings, earnings, earnings, earnings, earnings, 1, cid);

            processNextInQueue(cid, io);

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

      // Run self-healing reconciliation of consultant busy states
      reconcileConsultantBusyStates(io);
    } catch (error) {
      console.error('Error in Server-Authoritative Timer Loop:', error);
    }
  }, 2000); // Check every 2 seconds
}

function reconcileConsultantBusyStates(io: Server) {
  try {
    // 1. Get all consultants who are currently marked as is_busy = 1, but NOT manually busy
    const busyConsultants = db.prepare("SELECT id, display_name FROM consultants WHERE is_busy = 1 AND (manual_busy IS NULL OR manual_busy = 0)").all() as any[];
    
    for (const consultant of busyConsultants) {
      const consultantId = consultant.id;
      
      // 2. Check if this consultant has any active or pending session
      const activeOrPending = db.prepare(`
        SELECT id FROM sessions 
        WHERE consultant_id = ? AND status IN ('active', 'pending')
        LIMIT 1
      `).get(consultantId);
      
      if (!activeOrPending) {
        // No active or pending session found!
        console.log(`[Self-Healing] Consultant ${consultant.display_name} (ID: ${consultantId}) is marked busy but has no active/pending sessions. Reconciling.`);
        
        // Find next in queue, or mark as not busy
        processNextInQueue(consultantId, io);
      }
    }
  } catch (err) {
    console.error('[Self-Healing] Error reconciling consultant busy states:', err);
  }
}

