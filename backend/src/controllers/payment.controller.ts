import { Request, Response } from 'express';
import crypto from 'crypto';
import { db, logWalletTransaction } from '../config/database.js';
import { getRazorpayClient, getRazorpayErrorMessage, getCleanRazorpayKeyId, getResponseRazorpayKeyId, getCleanRazorpayKeySecret } from '../services/payment.service.js';
import { ChatMemoryService } from '../services/chatMemory.js';
import { checkAndResetMonthlyWallets } from '../utils/salary.js';

export function getMicrosecondISO(): string {
  const now = new Date();
  const iso = now.toISOString(); // e.g. "2026-06-30T08:38:31.123Z"
  const ns = process.hrtime.bigint();
  const micros = Number(ns % 1000000n).toString().padStart(6, '0').slice(-3); // get 3 digits for microseconds
  return iso.replace('Z', `${micros}Z`); // becomes e.g. "2026-06-30T08:38:31.123456Z"
}

export const createRazorpayOrMockOrder = async (req: Request, res: Response) => {
  try {
    const { consultant_id, duration_minutes, user_name } = req.body;
    if (!consultant_id || !duration_minutes || !user_name) {
      return res.status(400).json({ error: 'Consultant, duration, and user name are required' });
    }

    const isBlocked = db.prepare('SELECT id FROM blocked_users WHERE consultant_id = ? AND LOWER(user_name) = LOWER(?)').get(consultant_id, user_name.trim());
    if (isBlocked) {
      return res.status(403).json({ error: 'Aap is consultant ke sath chat nahi kar sakte kyunki aap blocked hain. (You have been blocked by this consultant.)' });
    }

    const consultant = db.prepare('SELECT price_per_minute, is_online, is_busy FROM consultants WHERE id = ? AND is_active = 1').get(consultant_id) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found or deactivated' });
    }

    if (consultant.is_online === 0) {
      return res.status(400).json({ error: 'Yeh consultant abhi offline hain. Kripya unke online aane ka intezar karein ya kisi aur active consultant se juden. (This consultant is currently offline. Please wait for them to come online or select another active consultant.)' });
    }

    const total_amount_inr = consultant.price_per_minute * duration_minutes;
    const amount_in_paise = Math.round(total_amount_inr * 100);

    const razorpayClient = getRazorpayClient();

    if (!razorpayClient) {
      return res.status(400).json({ error: 'Razorpay keys are missing or invalid in backend configuration. Please ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured correctly in your environment.' });
    }

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
        key_id: getResponseRazorpayKeyId(false),
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        total_paid: total_amount_inr,
      });
    } catch (err: any) {
      console.error('[Payment] Razorpay order creation failed:', err);
      const errMsg = getRazorpayErrorMessage(err);
      return res.status(400).json({ error: `Razorpay order creation failed: ${errMsg}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const verifyPaymentAndInitSession = (req: Request, res: Response) => {
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

    const isBlocked = db.prepare('SELECT id FROM blocked_users WHERE consultant_id = ? AND LOWER(user_name) = LOWER(?)').get(consultant_id, user_name.trim());
    if (isBlocked) {
      return res.status(403).json({ error: 'Aap is consultant ke sath chat nahi kar sakte kyunki aap blocked hain. (You have been blocked by this consultant.)' });
    }

    const consultant = db.prepare('SELECT price_per_minute, display_name, is_online FROM consultants WHERE id = ?').get(consultant_id) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    if (consultant.is_online === 0) {
      return res.status(400).json({ error: 'Yeh consultant abhi offline hain. Kripya unke online aane ka intezar karein ya kisi aur active consultant se juden. (This consultant is currently offline. Please wait for them to come online or select another active consultant.)' });
    }

    const price_per_minute = consultant.price_per_minute;
    const total_paid = price_per_minute * duration_minutes;

    const razorpayClient = getRazorpayClient();

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

      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(total_paid, user_id);
      logWalletTransaction(
        Number(user_id),
        'consultation',
        total_paid,
        `Consultation with ${consultant.display_name} (${duration_minutes} mins booked)`
      );
    } else {
      if (!is_mock && razorpayClient && signature && payment_id && order_id) {
        const body = order_id + '|' + payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', getCleanRazorpayKeySecret()!)
          .update(body.toString())
          .digest('hex');

        if (expectedSignature !== signature) {
          return res.status(400).json({ error: 'Payment signature verification failed' });
        }
      }
    }

    // Fetch consultant's plan specific commission rate
    const consultantObj = db.prepare('SELECT plan_id FROM consultants WHERE id = ?').get(consultant_id) as { plan_id: number | null } | undefined;
    let commission_rate = 30.0; // Default to Starter Launchpad commission rate (30%) if no plan is set
    if (consultantObj && consultantObj.plan_id) {
      const plan = db.prepare('SELECT commission_rate FROM plans WHERE id = ?').get(consultantObj.plan_id) as { commission_rate: number } | undefined;
      if (plan && plan.commission_rate !== undefined && plan.commission_rate !== null) {
        commission_rate = plan.commission_rate;
      } else {
        const defaultPlan = db.prepare("SELECT commission_rate FROM plans WHERE LOWER(name) LIKE '%starter%'").get() as { commission_rate: number } | undefined;
        commission_rate = defaultPlan ? defaultPlan.commission_rate : 30.0;
      }
    } else {
      const defaultPlan = db.prepare("SELECT commission_rate FROM plans WHERE LOWER(name) LIKE '%starter%'").get() as { commission_rate: number } | undefined;
      commission_rate = defaultPlan ? defaultPlan.commission_rate : 30.0;
    }

    const commission_amount = total_paid * (commission_rate / 100);
    const consultant_earnings = total_paid - commission_amount;

    // Check if the consultant is busy
    const activeOrPendingSession = db.prepare(`
      SELECT id FROM sessions 
      WHERE consultant_id = ? AND (status = 'active' OR status = 'pending')
      LIMIT 1
    `).get(consultant_id);

    // Also check if the consultant has marked themselves as busy manually
    const consultantObjBusy = db.prepare('SELECT is_busy FROM consultants WHERE id = ?').get(consultant_id) as { is_busy: number } | undefined;

    const isBusyNow = activeOrPendingSession || (consultantObjBusy && consultantObjBusy.is_busy === 1);
    const sessionStatus = isBusyNow ? 'queued' : 'pending';

    const session_id = `sess_${Math.random().toString(36).slice(2, 15)}`;
    const created_at = getMicrosecondISO();

    const final_order_id = order_id || `order_wallet_${Math.random().toString(36).slice(2, 11)}`;
    const final_payment_id = payment_id || (payment_method === 'wallet' ? `pay_wallet_${Math.random().toString(36).slice(2, 11)}` : `pay_mock_${Math.random().toString(36).slice(2, 11)}`);

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
      sessionStatus,
      final_payment_id,
      final_order_id,
      created_at
    );

    // Keep consultant as busy if they are already busy or just received a pending session
    db.prepare('UPDATE consultants SET is_busy = 1 WHERE id = ?').run(consultant_id);

    const io = req.app.get('io');
    if (io) {
      console.log(`[REST Server] Emitting session:created for consultant ${consultant_id} and session ${session_id}`);
      io.emit('session:created', { consultant_id: Number(consultant_id), session_id });
    }

    res.json({
      success: true,
      session_id,
      status: sessionStatus,
      total_paid,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSessionById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.prepare(`
      SELECT s.*, c.display_name as consultant_name, c.photo_url as consultant_photo, c.price_per_minute as consultant_price, u.photo_url as user_photo
      FROM sessions s
      LEFT JOIN consultants c ON s.consultant_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(id) as any;

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Attempt to fetch from active in-memory messages first, fallback to DB
    let messages = ChatMemoryService.getMessages(id) as any[];
    if (messages.length === 0) {
      messages = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC').all(id);
    }

    res.json({
      session,
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const postSessionMessageREST = (req: Request, res: Response) => {
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

    // Save in-memory during active session
    const savedMessage = ChatMemoryService.addMessage(session_id, sender_type, sender_name, text);

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
};

export const acceptSession = (req: Request, res: Response) => {
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
};

export const rejectSession = (req: Request, res: Response) => {
  try {
    const { id: session_id } = req.params;
    const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (sess.status !== 'pending') {
      return res.status(400).json({ error: `Session is already ${sess.status}` });
    }

    const userId = sess.user_id;
    const totalPaid = sess.total_paid;
    const consultantId = sess.consultant_id;

    db.prepare("UPDATE sessions SET status = 'rejected', total_paid = 0.0, commission_amount = 0.0, consultant_earnings = 0.0, duration_minutes = 0 WHERE id = ?").run(session_id);
    ChatMemoryService.clearMemory(session_id);

    if (userId && totalPaid > 0) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(totalPaid, userId);
      logWalletTransaction(
        Number(userId),
        'refund',
        totalPaid,
        `Refund: Consultation request rejected by advisor`
      );
    }

    console.log(`[Timer Engine] Session ${session_id} rejected.`);

    const io = req.app.get('io');
    processNextInQueue(consultantId, io);

    if (io) {
      io.to(session_id).emit('session:rejected', {
        session_id,
        message: 'Chat request was rejected by the consultant.'
      });
      io.emit('consultant:session_update', {
        consultant_id: Number(consultantId),
        session_id,
        status: 'rejected'
      });
    }

    res.json({ success: true, status: 'rejected' });
  } catch (err: any) {
    console.error('Error in reject session:', err);
    res.status(500).json({ error: err.message });
  }
};

export const timeoutSession = (req: Request, res: Response) => {
  try {
    const { id: session_id } = req.params;
    const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (sess.status !== 'pending') {
      return res.status(400).json({ error: `Session is already ${sess.status}` });
    }

    const userId = sess.user_id;
    const totalPaid = sess.total_paid;
    const consultantId = sess.consultant_id;

    db.prepare("UPDATE sessions SET status = 'missed', total_paid = 0.0, commission_amount = 0.0, consultant_earnings = 0.0, duration_minutes = 0 WHERE id = ?").run(session_id);
    ChatMemoryService.clearMemory(session_id);

    if (userId && totalPaid > 0) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(totalPaid, userId);
      logWalletTransaction(
        Number(userId),
        'refund',
        totalPaid,
        `Refund: Consultation request missed/timed out by advisor`
      );
    }

    console.log(`[Timer Engine] Session ${session_id} timed out waiting for acceptance. Marked as missed.`);

    const io = req.app.get('io');
    processNextInQueue(consultantId, io);

    if (io) {
      io.to(session_id).emit('session:missed', {
        session_id,
        message: 'Chat request was missed by the consultant.'
      });
    }

    res.json({ success: true, status: 'missed' });
  } catch (err: any) {
    console.error('Error in timeout session:', err);
    res.status(500).json({ error: err.message });
  }
};

export const endSessionManually = (req: Request, res: Response) => {
  try {
    const { id: session_id } = req.params;
    let sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (sess.status === 'completed' || sess.status === 'cancelled' || sess.status === 'rejected' || sess.status === 'missed') {
      return res.json({ success: true, status: sess.status, message: 'Session is already inactive.' });
    }

    const { ended_by } = req.body || {};
    // Treat as user ending unless explicitly specified as 'consultant'. This ensures robust detection 
    // even if client payload is modified or missing keys.
    const isUserEnding = ended_by === 'user' || ended_by !== 'consultant';

    const { transcript, consultantMsgCount } = ChatMemoryService.consolidateAndSave(sess.id);

    let actualMinutes = sess.duration_minutes;
    let actualCost = sess.price_per_minute * actualMinutes;
    let refundAmount = 0;
    let actual_commission = 0;
    let actual_consultant_earnings = 0;
    let finalStatus = 'completed';

    if (consultantMsgCount === 0) {
      // Consultant did not reply or participate at all! Refund user 100%!
      actualMinutes = 0;
      actualCost = 0.0;
      refundAmount = sess.total_paid;
      actual_commission = 0.0;
      actual_consultant_earnings = 0.0;
      finalStatus = 'missed';
    } else {
      if (sess.started_at) {
        const start = new Date(sess.started_at);
        const now = new Date();
        const diffMs = now.getTime() - start.getTime();
        if (!isNaN(diffMs)) {
          const actualSeconds = Math.max(0, Math.floor(diffMs / 1000));
          actualMinutes = Math.min(sess.duration_minutes, Math.max(1, Math.ceil(actualSeconds / 60)));
        } else {
          actualMinutes = 1;
        }
      } else {
        actualMinutes = 1;
      }

      if (isNaN(actualMinutes) || !isFinite(actualMinutes)) {
        actualMinutes = 1;
      }
      actualCost = sess.price_per_minute * actualMinutes;
      if (isNaN(actualCost) || !isFinite(actualCost)) {
        actualCost = sess.total_paid;
      }
      refundAmount = Math.max(0, sess.total_paid - actualCost);
      if (isNaN(refundAmount) || !isFinite(refundAmount)) {
        refundAmount = 0;
      }
      actual_commission = actualCost * (sess.commission_rate / 100);
      if (isNaN(actual_commission) || !isFinite(actual_commission)) {
        actual_commission = 0;
      }
      actual_consultant_earnings = actualCost - actual_commission;
      if (isNaN(actual_consultant_earnings) || !isFinite(actual_consultant_earnings)) {
        actual_consultant_earnings = 0;
      }
      finalStatus = 'completed';
    }

    db.prepare(`
      UPDATE sessions 
      SET status = ?, 
          duration_minutes = ?,
          total_paid = ?,
          commission_amount = ?,
          consultant_earnings = ?,
          transcript = ? 
      WHERE id = ?
    `).run(finalStatus, actualMinutes, actualCost, actual_commission, actual_consultant_earnings, transcript, sess.id);

    if (sess.user_id && refundAmount > 0) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(refundAmount, sess.user_id);
      logWalletTransaction(
        Number(sess.user_id),
        'refund',
        refundAmount,
        finalStatus === 'missed'
          ? `Refund: Consultation session missed/ignored by advisor (No messages received)`
          : `Refund: Remaining balance after completing ${actualMinutes} mins consultation`
      );
    }

    const cid = sess.consultant_id;
    const isCompletedVal = finalStatus === 'completed' ? 1 : 0;
    
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
    `).run(
      actual_consultant_earnings,
      actual_consultant_earnings,
      actual_consultant_earnings,
      actual_consultant_earnings,
      actual_consultant_earnings,
      isCompletedVal,
      cid
    );

    console.log(`[REST Manual End] Session ${sess.id} marked as ${finalStatus} by manual request. Talked: ${actualMinutes} mins, Cost: ${actualCost}, Refund: ${refundAmount}`);

    const io = req.app.get('io');
    processNextInQueue(cid, io);

    if (io) {
      if (consultantMsgCount === 0) {
        io.to(sess.id).emit('session:missed', {
          session_id: sess.id,
          message: 'Session has ended as advisor failed to participate.'
        });
        io.emit('consultant:session_update', {
          consultant_id: Number(cid),
          session_id: sess.id,
          status: 'missed'
        });
      } else {
        io.to(sess.id).emit('session:expired', {
          session_id: sess.id,
          transcript,
          message: `Session was manually ended. Talked for ${actualMinutes} mins.`
        });
        io.emit('consultant:session_update', {
          consultant_id: Number(cid),
          session_id: sess.id,
          status: 'completed'
        });
      }
    }

    res.json({ success: true, status: finalStatus, transcript, actualMinutes, actualCost, refundAmount });
  } catch (err: any) {
    console.error('Error ending session manually:', err);
    res.status(500).json({ error: err.message });
  }
};

export function processNextInQueue(consultantId: number, io: any) {
  try {
    console.log(`[Queue System] Processing queue for consultant ${consultantId} immediately.`);
    
    // Find the next queued session for this consultant ordered by created_at ascending (FIFO)
    const nextQueuedSess = db.prepare(`
      SELECT * FROM sessions 
      WHERE consultant_id = ? AND status = 'queued' 
      ORDER BY created_at ASC 
      LIMIT 1
    `).get(consultantId) as any;
    
    if (nextQueuedSess) {
      const nowStr = getMicrosecondISO();
      console.log(`[Queue System] Found next queued session ${nextQueuedSess.id} for user ${nextQueuedSess.user_name}. Transitioning to pending.`);
      
      // Update session status to pending, and set created_at to now (triggers 60s countdown)
      db.prepare("UPDATE sessions SET status = 'pending', created_at = ? WHERE id = ?").run(nowStr, nextQueuedSess.id);
      
      // Keep consultant is_busy as 1
      db.prepare('UPDATE consultants SET is_busy = 1 WHERE id = ?').run(consultantId);

      // Notify clients
      if (io) {
        console.log(`[Queue System] Emitting session:created for newly activated queued session ${nextQueuedSess.id}`);
        io.emit('session:created', { consultant_id: Number(consultantId), session_id: nextQueuedSess.id });
        io.to(nextQueuedSess.id).emit('queue:activated', { session_id: nextQueuedSess.id });
      }
    } else {
      // Check if they are manually busy
      const cons = db.prepare('SELECT manual_busy FROM consultants WHERE id = ?').get(consultantId) as { manual_busy: number } | undefined;
      if (cons && cons.manual_busy === 1) {
        console.log(`[Queue System] No queued sessions found for consultant ${consultantId}, but consultant is manually set to busy. Keeping is_busy = 1.`);
        db.prepare('UPDATE consultants SET is_busy = 1 WHERE id = ?').run(consultantId);
      } else {
        console.log(`[Queue System] No queued sessions found for consultant ${consultantId}. Marking as not busy.`);
        // Update is_busy = 0
        db.prepare('UPDATE consultants SET is_busy = 0 WHERE id = ?').run(consultantId);
        if (io) {
          io.emit('consultant:status_update', { consultant_id: Number(consultantId), is_busy: 0 });
        }
      }
    }
  } catch (err) {
    console.error(`[Queue System] Error processing queue for consultant ${consultantId}:`, err);
  }
}

export const getConsultantQueueStatus = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 1. Get current active/pending session
    const activeSession = db.prepare(`
      SELECT * FROM sessions 
      WHERE consultant_id = ? AND status = 'active'
      LIMIT 1
    `).get(id) as any;

    const pendingSession = db.prepare(`
      SELECT * FROM sessions 
      WHERE consultant_id = ? AND status = 'pending'
      LIMIT 1
    `).get(id) as any;

    let remaining_seconds = 0;
    let current_active_id = null;
    let is_busy = false;

    const now = new Date();

    if (activeSession) {
      is_busy = true;
      current_active_id = activeSession.id;
      if (activeSession.expires_at) {
        const expiryTime = new Date(activeSession.expires_at);
        remaining_seconds = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000));
      }
    } else if (pendingSession) {
      is_busy = true;
      current_active_id = pendingSession.id;
      // Pending sessions have a 60-second limit from created_at
      const createdTime = new Date(pendingSession.created_at);
      remaining_seconds = Math.max(0, Math.floor((createdTime.getTime() + 60 * 1000 - now.getTime()) / 1000));
    }

    // 2. Get all queued sessions
    const queuedSessions = db.prepare(`
      SELECT id, user_id, user_name, duration_minutes, created_at 
      FROM sessions 
      WHERE consultant_id = ? AND status = 'queued'
      ORDER BY created_at ASC
    `).all(id) as any[];

    // Calculate total wait time
    let total_wait_time_seconds = remaining_seconds;
    for (const q of queuedSessions) {
      total_wait_time_seconds += q.duration_minutes * 60;
    }

    res.json({
      is_busy,
      current_active_id,
      remaining_seconds,
      queue_count: queuedSessions.length,
      queue_users: queuedSessions.map((q, idx) => ({
        session_id: q.id,
        user_id: q.user_id,
        user_name: q.user_name,
        duration_minutes: q.duration_minutes,
        position: idx + 1,
        created_at: q.created_at
      })),
      total_wait_time_seconds
    });
  } catch (err: any) {
    console.error('Error fetching queue status:', err);
    res.status(500).json({ error: err.message });
  }
};

export const cancelQueuedSession = (req: Request, res: Response) => {
  try {
    const { id: session_id } = req.params;
    const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
    if (!sess) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (sess.status !== 'queued' && sess.status !== 'pending') {
      return res.status(400).json({ error: `Session is already ${sess.status}` });
    }

    const userId = sess.user_id;
    const totalPaid = sess.total_paid;
    const consultantId = sess.consultant_id;

    // Update status to cancelled and zero out earnings
    db.prepare("UPDATE sessions SET status = 'cancelled', total_paid = 0.0, commission_amount = 0.0, consultant_earnings = 0.0, duration_minutes = 0 WHERE id = ?").run(session_id);
    ChatMemoryService.clearMemory(session_id);

    if (userId && totalPaid > 0) {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(totalPaid, userId);
      logWalletTransaction(
        Number(userId),
        'refund',
        totalPaid,
        `Refund: Queued consultation request cancelled by user`
      );
    }

    console.log(`[Queue System] Session ${session_id} cancelled by user.`);

    const io = req.app.get('io');
    if (io) {
      io.to(session_id).emit('session:cancelled', {
        session_id,
        message: 'You have exited the queue.'
      });
      io.emit('consultant:session_update', {
        consultant_id: Number(consultantId),
        session_id,
        status: 'cancelled'
      });
      // Also notify consultant if it was pending
      if (sess.status === 'pending') {
        io.emit('consultant:status_update', { consultant_id: Number(consultantId), is_busy: 0 });
      }
    }

    // Process next in queue
    processNextInQueue(consultantId, io);

    res.json({ success: true, status: 'cancelled' });
  } catch (err: any) {
    console.error('Error in cancelQueuedSession:', err);
    res.status(500).json({ error: err.message });
  }
};

