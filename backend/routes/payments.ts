import { Router } from 'express';
import crypto from 'crypto';
import { db, logWalletTransaction } from '../db.js';
import { getRazorpayClient } from '../razorpay.js';

const router = Router();

// Get list of subscription plans
router.get('/plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM plans').all();
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Razorpay Order or Mock Sandbox Order
router.post('/payments/create-order', async (req, res) => {
  try {
    const { consultant_id, duration_minutes, user_name } = req.body;
    if (!consultant_id || !duration_minutes || !user_name) {
      return res.status(400).json({ error: 'Consultant, duration, and user name are required' });
    }

    // Check if user is blocked by this consultant
    const isBlocked = db.prepare('SELECT id FROM blocked_users WHERE consultant_id = ? AND LOWER(user_name) = LOWER(?)').get(consultant_id, user_name.trim());
    if (isBlocked) {
      return res.status(403).json({ error: 'Aap is consultant ke sath chat nahi kar sakte kyunki aap blocked hain. (You have been blocked by this consultant.)' });
    }

    // Get consultant details
    const consultant = db.prepare('SELECT price_per_minute, is_online, is_busy FROM consultants WHERE id = ? AND is_active = 1').get(consultant_id) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found or deactivated' });
    }

    const total_amount_inr = consultant.price_per_minute * duration_minutes;
    const amount_in_paise = Math.round(total_amount_inr * 100);

    const razorpayClient = getRazorpayClient();

    // If Razorpay initialized, create actual Razorpay order
    if (razorpayClient) {
      try {
        const order = await razorpayClient.orders.create({
          amount: amount_in_paise,
          currency: 'INR',
          receipt: `receipt_session_${Date.now()}`,
          notes: {
            consultant_id: consultant_id.toString(),
            duration_minutes: duration_minutes.toString(),
            user_name,
          },
        });
        return res.json({
          success: true,
          is_mock: false,
          key_id: process.env.RAZORPAY_KEY_ID,
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          total_paid: total_amount_inr,
        });
      } catch (err: any) {
        console.error('Razorpay Order Creation Failed. Falling back to Mock Order.', err.message);
      }
    }

    // Mock Order Sandbox Flow (if Razorpay key is missing or failed)
    const mock_order_id = `order_mock_${Math.random().toString(36).slice(2, 11)}`;
    res.json({
      success: true,
      is_mock: true,
      key_id: 'rzp_test_mock_key',
      order_id: mock_order_id,
      amount: amount_in_paise,
      currency: 'INR',
      total_paid: total_amount_inr,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Payment and Initialize Chat Session
router.post('/payments/verify', (req, res) => {
  try {
    const { 
      consultant_id, 
      duration_minutes, 
      user_name, 
      order_id, 
      payment_id, 
      signature, 
      is_mock,
      user_id,
      payment_method
    } = req.body;

    if (!consultant_id || !duration_minutes || !user_name) {
      return res.status(400).json({ error: 'Missing required validation fields' });
    }

    // Check if user is blocked by this consultant
    const isBlocked = db.prepare('SELECT id FROM blocked_users WHERE consultant_id = ? AND LOWER(user_name) = LOWER(?)').get(consultant_id, user_name.trim());
    if (isBlocked) {
      return res.status(403).json({ error: 'Aap is consultant ke sath chat nahi kar sakte kyunki aap blocked hain. (You have been blocked by this consultant.)' });
    }

    // Load consultant details
    const consultant = db.prepare('SELECT price_per_minute, display_name FROM consultants WHERE id = ?').get(consultant_id) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    // Calculate finances
    const price_per_minute = consultant.price_per_minute;
    const total_paid = price_per_minute * duration_minutes;

    const razorpayClient = getRazorpayClient();

    // Handle Wallet payment deduct hold
    if (payment_method === 'wallet' && user_id) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as any;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (user.is_blocked === 1) {
        return res.status(403).json({ error: 'Aapka account block kar diya gaya hai admin dwara. (Your account is blocked.)' });
      }
      if (user.wallet_balance < total_paid) {
        return res.status(400).json({ error: `Aapke wallet me paryapt balance nahi hai. Minimum balance required is ₹${total_paid}. Please recharge.` });
      }

      // Deduct hold from user's wallet
      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(total_paid, user_id);
      logWalletTransaction(
        Number(user_id),
        'consultation',
        total_paid,
        `Consultation with ${consultant.display_name} (${duration_minutes} mins booked)`
      );
    } else {
      // Verify signature if it's a real Razorpay checkout
      if (!is_mock && razorpayClient && signature && payment_id && order_id) {
        const body = order_id + '|' + payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
          .update(body.toString())
          .digest('hex');

        if (expectedSignature !== signature) {
          return res.status(400).json({ error: 'Payment signature verification failed' });
        }
      }
    }

    // Load platform commission rate (default 20%)
    const commissionSetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'commission_percentage'").get() as { value: string };
    const commission_rate = parseFloat(commissionSetting?.value || '20');

    const commission_amount = total_paid * (commission_rate / 100);
    const consultant_earnings = total_paid - commission_amount;

    // Create session UUID
    const session_id = `sess_${Math.random().toString(36).slice(2, 15)}`;
    const created_at = new Date().toISOString();

    const final_order_id = order_id || `order_wallet_${Math.random().toString(36).slice(2, 11)}`;
    const final_payment_id = payment_id || (payment_method === 'wallet' ? `pay_wallet_${Math.random().toString(36).slice(2, 11)}` : `pay_mock_${Math.random().toString(36).slice(2, 11)}`);

    // Insert Chat Session (Status starts as 'pending' till first join, or active immediately)
    db.prepare(`
      INSERT INTO sessions (
        id, consultant_id, user_id, user_name, duration_minutes, price_per_minute, total_paid, 
        commission_rate, consultant_earnings, commission_amount, status, payment_id, order_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session_id,
      consultant_id,
      user_id || null,
      user_name,
      duration_minutes,
      price_per_minute,
      total_paid,
      commission_rate,
      consultant_earnings,
      commission_amount,
      'pending', // Starts pending until user or consultant joins and starts the real countdown
      final_payment_id,
      final_order_id,
      created_at
    );

    res.json({
      success: true,
      session_id,
      total_paid,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Active/Historic Session Status & Meta
router.get('/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const session = db.prepare(`
      SELECT s.*, c.display_name as consultant_name, c.photo_url as consultant_photo, c.price_per_minute as consultant_price
      FROM sessions s
      JOIN consultants c ON s.consultant_id = c.id
      WHERE s.id = ?
    `).get(id) as any;

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Fetch messages for this session
    const messages = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC').all(id);

    res.json({
      session,
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Robust REST fallback for sending chat messages
router.post('/sessions/:id/messages', (req, res) => {
  try {
    const { id: session_id } = req.params;
    const { sender_type, sender_name, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    let sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
    if (!sess) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (sess.status === 'completed' || sess.status === 'cancelled' || sess.status === 'rejected' || sess.status === 'missed') {
      return res.status(400).json({ error: 'This session is not active.' });
    }

    const created_at = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO messages (session_id, sender_type, sender_name, text, created_at, is_read)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(session_id, sender_type, sender_name, text, created_at);

    console.log(`[REST Server] Message inserted successfully. Row ID:`, result.lastInsertRowid);

    const savedMessage = {
      id: Number(result.lastInsertRowid),
      session_id,
      sender_type,
      sender_name,
      text,
      created_at,
      is_read: 0,
    };

    const io = req.app.get('io');
    if (io) {
      console.log(`[REST Server] Broadcasting message to session room ${session_id} via Socket.IO:`, savedMessage);
      io.to(session_id).emit('message', savedMessage);
    }

    res.json({
      success: true,
      message: savedMessage,
    });
  } catch (err: any) {
    console.error('Error in REST fallback message send:', err);
    res.status(500).json({ error: err.message });
  }
});

// Accept Chat Session
router.post('/sessions/:id/accept', (req, res) => {
  try {
    const { id: session_id } = req.params;
    const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (sess.status !== 'pending') {
      return res.status(400).json({ error: `Session is already ${sess.status}` });
    }

    const startTime = new Date();
    const expiryTime = new Date(startTime.getTime() + sess.duration_minutes * 60 * 1000);
    
    db.prepare("UPDATE sessions SET status = 'active', started_at = ?, expires_at = ? WHERE id = ?")
      .run(startTime.toISOString(), expiryTime.toISOString(), session_id);
    
    // Update consultant busy status
    db.prepare('UPDATE consultants SET is_busy = 1 WHERE id = ?').run(sess.consultant_id);

    console.log(`[Timer Engine] Session ${session_id} accepted and activated.`);

    const io = req.app.get('io');
    if (io) {
      io.to(session_id).emit('session:started', {
        session_id,
        started_at: startTime.toISOString(),
        expires_at: expiryTime.toISOString(),
        duration_minutes: sess.duration_minutes,
      });
    }

    res.json({ success: true, status: 'active', started_at: startTime.toISOString(), expires_at: expiryTime.toISOString() });
  } catch (err: any) {
    console.error('Error in accept session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reject Chat Session
router.post('/sessions/:id/reject', (req, res) => {
  try {
    const { id: session_id } = req.params;
    const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (sess.status !== 'pending') {
      return res.status(400).json({ error: `Session is already ${sess.status}` });
    }

    db.prepare("UPDATE sessions SET status = 'rejected' WHERE id = ?").run(session_id);
    
    // Ensure consultant is NOT busy
    db.prepare('UPDATE consultants SET is_busy = 0 WHERE id = ?').run(sess.consultant_id);

    // Refund User Wallet fully!
    if (sess.user_id && sess.total_paid > 0) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(sess.total_paid, sess.user_id);
      logWalletTransaction(
        Number(sess.user_id),
        'refund',
        sess.total_paid,
        `Refund: Consultation request rejected by advisor`
      );
    }

    console.log(`[Timer Engine] Session ${session_id} rejected.`);

    const io = req.app.get('io');
    if (io) {
      io.to(session_id).emit('session:rejected', {
        session_id,
        message: 'Chat request was rejected by the consultant.'
      });
    }

    res.json({ success: true, status: 'rejected' });
  } catch (err: any) {
    console.error('Error in reject session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Manually End Chat Session (User or Consultant can initiate)
router.post('/sessions/:id/end', (req, res) => {
  try {
    const { id: session_id } = req.params;
    let sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (sess.status === 'completed' || sess.status === 'cancelled' || sess.status === 'rejected' || sess.status === 'missed') {
      return res.json({ success: true, status: sess.status, message: 'Session is already inactive.' });
    }

    // 1. Fetch transcript (group all chat messages)
    const msgs = db.prepare('SELECT sender_name, text, created_at FROM messages WHERE session_id = ? ORDER BY id ASC').all(sess.id) as any[];
    const transcript = msgs.map(m => `[${new Date(m.created_at).toLocaleTimeString()}] ${m.sender_name}: ${m.text}`).join('\n');

    // 2. Calculate exact minutes spent
    let actualMinutes = sess.duration_minutes;
    if (sess.started_at) {
      const start = new Date(sess.started_at);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const actualSeconds = Math.max(0, Math.floor(diffMs / 1000));
      // Round up, but limit by the initial pre-paid duration_minutes
      actualMinutes = Math.min(sess.duration_minutes, Math.max(1, Math.ceil(actualSeconds / 60)));
    } else {
      actualMinutes = 0; // Session never started (e.g. manual end on pending)
    }

    const price_per_minute = sess.price_per_minute;
    const actualCost = price_per_minute * actualMinutes;
    const refundAmount = Math.max(0, sess.total_paid - actualCost);

    const actual_commission = actualCost * (sess.commission_rate / 100);
    const actual_consultant_earnings = actualCost - actual_commission;

    // 3. Mark session as completed in database
    db.prepare(`
      UPDATE sessions 
      SET status = 'completed', 
          duration_minutes = ?,
          total_paid = ?,
          commission_amount = ?,
          consultant_earnings = ?,
          transcript = ? 
      WHERE id = ?
    `).run(actualMinutes, actualCost, actual_commission, actual_consultant_earnings, transcript, sess.id);

    // 4. Refund user wallet if user_id is present and refund exists
    if (sess.user_id && refundAmount > 0) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(refundAmount, sess.user_id);
      logWalletTransaction(
        Number(sess.user_id),
        'refund',
        refundAmount,
        `Refund: Remaining balance after completing ${actualMinutes} mins consultation`
      );
    }

    // 5. Add earnings to consultant wallet and release busy state
    const cid = sess.consultant_id;
    db.prepare(`
      UPDATE consultants 
      SET wallet_today = wallet_today + ?, 
          wallet_monthly = wallet_monthly + ?, 
          wallet_total = wallet_total + ?, 
          wallet_withdrawable = wallet_withdrawable + ?,
          is_busy = 0
      WHERE id = ?
    `).run(actual_consultant_earnings, actual_consultant_earnings, actual_consultant_earnings, actual_consultant_earnings, cid);

    console.log(`[REST Manual End] Session ${sess.id} marked as completed by manual request. Talked: ${actualMinutes} mins, Cost: ${actualCost}, Refund: ${refundAmount}`);

    const io = req.app.get('io');
    if (io) {
      io.to(sess.id).emit('session:expired', {
        session_id: sess.id,
        transcript,
        message: `Session was manually ended. Talked for ${actualMinutes} mins.`
      });
    }

    res.json({ success: true, status: 'completed', transcript, actualMinutes, actualCost, refundAmount });
  } catch (err: any) {
    console.error('Error ending session manually:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
