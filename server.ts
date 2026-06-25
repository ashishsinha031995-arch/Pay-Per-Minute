import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDb, db } from './src/db.js';

dotenv.config();

// Initialize the Database
initDb();

// Wallet transaction helper
function logWalletTransaction(userId: number, type: 'recharge' | 'consultation' | 'refund', amount: number, description: string) {
  try {
    db.prepare(`
      INSERT INTO wallet_transactions (user_id, type, amount, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, type, amount, description, new Date().toISOString());
  } catch (err) {
    console.error('Failed to log wallet transaction:', err);
  }
}

// Simulated Email Sender
function sendEmail(toEmail: string, subject: string, body: string) {
  try {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO sent_emails (to_email, subject, body, created_at) VALUES (?, ?, ?, ?)').run(toEmail, subject, body, now);
    console.log(`\n======================================================`);
    console.log(`📧 EMAIL DISPATCH SIMULATOR`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Failed to log sent email:', err);
  }
}

const app = express();
const server = createServer(app);
const PORT = 3000;

// Socket.IO Server Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Prevent Express / Vite from intercepting or responding to Socket.IO requests
app.use((req, res, next) => {
  if (req.url && req.url.startsWith('/socket.io')) {
    return; // Let Socket.IO handle this request on the server level directly
  }
  next();
});

app.use(express.json());

// Razorpay Client Lazy Initialization
let razorpayClient: any = null;
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (keyId && keySecret) {
  try {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log('Razorpay initialized with live/test key:', keyId);
  } catch (error) {
    console.error('Failed to initialize Razorpay client:', error);
  }
} else {
  console.log('Razorpay credentials missing in .env. Falling back to Razorpay Mock Sandbox Mode.');
}

// ==========================================
// API ROUTES: ADMIN
// ==========================================

// Get Admin Dashboard Stats
app.get('/api/admin/stats', (req, res) => {
  try {
    const totalRevRow = db.prepare("SELECT SUM(total_paid) as total FROM sessions WHERE status = 'completed'").get() as { total: number | null };
    const totalSessionsRow = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
    const totalConsRow = db.prepare('SELECT COUNT(*) as count FROM consultants').get() as { count: number };
    const totalCommissionRow = db.prepare("SELECT SUM(commission_amount) as total FROM sessions WHERE status = 'completed'").get() as { total: number | null };
    const commRateRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'commission_percentage'").get() as { value: string };

    res.json({
      totalRevenue: totalRevRow.total || 0,
      totalSessions: totalSessionsRow.count,
      totalConsultants: totalConsRow.count,
      totalCommission: totalCommissionRow.total || 0,
      commissionRate: parseFloat(commRateRow.value || '20'),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Sent Emails Log (Simulated SMTP Inbox logs)
app.get('/api/admin/emails', (req, res) => {
  try {
    const emails = db.prepare('SELECT * FROM sent_emails ORDER BY id DESC LIMIT 50').all();
    res.json(emails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get List of All Consultants (Admin management)
app.get('/api/admin/consultants', (req, res) => {
  try {
    const consultants = db.prepare('SELECT * FROM consultants ORDER BY id DESC').all();
    res.json(consultants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Consultant Active/Deactive Status
app.put('/api/admin/consultants/:id/toggle-active', (req, res) => {
  try {
    const { id } = req.params;
    const consultant = db.prepare('SELECT is_active FROM consultants WHERE id = ?').get(id) as { is_active: number } | undefined;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }
    const newActive = consultant.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE consultants SET is_active = ? WHERE id = ?').run(newActive, id);
    res.json({ success: true, is_active: newActive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Commission Rate
app.post('/api/admin/settings', (req, res) => {
  try {
    const { commission_percentage } = req.body;
    if (commission_percentage === undefined || isNaN(parseFloat(commission_percentage))) {
      return res.status(400).json({ error: 'Invalid commission percentage' });
    }
    db.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').run('commission_percentage', commission_percentage.toString());
    res.json({ success: true, commission_percentage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Sessions & Financial Logs
app.get('/api/admin/sessions', (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT s.*, c.display_name as consultant_name 
      FROM sessions s 
      JOIN consultants c ON s.consultant_id = c.id 
      ORDER BY s.created_at DESC
    `).all();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API ROUTES: PLANS
// ==========================================

// Get All Subscription Plans for Consultants
app.get('/api/plans', (req, res) => {
  try {
    const plans = db.prepare('SELECT * FROM plans').all();
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create New Plan (Admin)
app.post('/api/admin/plans', (req, res) => {
  try {
    const { name, price, duration_days, description } = req.body;
    if (!name || !price || !duration_days) {
      return res.status(400).json({ error: 'Name, price, and duration are required' });
    }
    const result = db.prepare('INSERT INTO plans (name, price, duration_days, description) VALUES (?, ?, ?, ?)').run(name, price, duration_days, description || '');
    res.json({ id: result.lastInsertRowid, name, price, duration_days, description });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API ROUTES: CONSULTANTS
// ==========================================

// Get All Active Consultants (Public Listings page)
app.get('/api/consultants', (req, res) => {
  try {
    const consultants = db.prepare('SELECT id, username, display_name, photo_url, bio, price_per_minute, is_online, is_busy FROM consultants WHERE is_active = 1').all();
    res.json(consultants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Public Consultant Profile by Username
app.get('/api/consultants/profile/:username', (req, res) => {
  try {
    const { username } = req.params;
    const consultant = db.prepare('SELECT id, username, display_name, photo_url, bio, price_per_minute, is_online, is_busy FROM consultants WHERE username = ? AND is_active = 1').get(username);
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found or inactive' });
    }
    // Fetch reviews
    const reviews = db.prepare('SELECT id, user_name, rating, text, created_at FROM reviews WHERE consultant_id = ? ORDER BY id DESC').all((consultant as any).id);
    res.json({ consultant, reviews });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login Consultant
app.post('/api/consultants/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username/Email and password required' });
    }
    const loginCredential = username.trim().toLowerCase();
    const consultant = db.prepare('SELECT * FROM consultants WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND password = ?').get(loginCredential, loginCredential, password) as any;
    if (!consultant) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
    if (consultant.is_active === 0) {
      return res.status(403).json({ error: 'Your account has been deactivated by Super Admin.' });
    }
    res.json({ success: true, consultant });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Purchase Plan & Generate Random Consultant Credentials (Consultant Registration)
app.post('/api/consultants/register', (req, res) => {
  try {
    const { plan_id, display_name, initial_price_per_minute, category, email } = req.body;
    if (!plan_id || !display_name) {
      return res.status(400).json({ error: 'Plan and Display Name are required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email address is required so login credentials can be sent to you.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingConsultantEmail = db.prepare('SELECT id FROM consultants WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingConsultantEmail) {
      return res.status(400).json({ error: 'This email is already registered as a consultant. Please choose another.' });
    }

    // Fetch plan details
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Generate random Username & Password
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `expert_${display_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${randomSuffix}`;
    const password = Math.random().toString(36).slice(-8);

    // Calculate plan expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration_days);

    // Insert Consultant
    const defaultPhoto = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300`;
    const price = initial_price_per_minute ? parseFloat(initial_price_per_minute) : 15.0;
    const catValue = category || 'Consultants';

    const result = db.prepare(`
      INSERT INTO consultants (
        username, email, password, display_name, photo_url, bio, price_per_minute, 
        is_online, is_busy, is_active, plan_expiry, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,
      cleanEmail,
      password,
      display_name,
      defaultPhoto,
      `Hello! I am ${display_name}, a seasoned professional. Let's start mapping your growth paths together.`,
      price,
      1, // online
      0, // not busy
      1, // active
      expiryDate.toISOString(),
      catValue
    );

    // Trigger Simulated Email delivery
    const subject = `Welcome to Consulting Portal! Your Consultant Login Credentials`;
    const body = `Dear ${display_name},

Thank you for registering on our platform using the ${plan.name}!

Your expert account has been successfully set up. Here are your credentials to log in:
• Username: ${username} (or you can use your email: ${cleanEmail})
• Password: ${password}

Please keep these credentials safe and change your password in your settings once logged in.

Best wishes,
Support Team`;
    
    sendEmail(cleanEmail, subject, body);

    res.json({
      success: true,
      username,
      password,
      display_name,
      email: cleanEmail,
      plan_name: plan.name,
      plan_expiry: expiryDate.toLocaleDateString(),
      consultant_id: result.lastInsertRowid,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Consultant Status (Online/Offline, Busy Toggles)
app.put('/api/consultants/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { is_online, is_busy } = req.body;

    if (is_online !== undefined) {
      db.prepare('UPDATE consultants SET is_online = ? WHERE id = ?').run(is_online ? 1 : 0, id);
    }
    if (is_busy !== undefined) {
      db.prepare('UPDATE consultants SET is_busy = ? WHERE id = ?').run(is_busy ? 1 : 0, id);
    }

    const updated = db.prepare('SELECT id, is_online, is_busy FROM consultants WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Consultant Profile Settings (Photo, Bio, Price Per Minute)
app.put('/api/consultants/:id/profile', (req, res) => {
  try {
    const { id } = req.params;
    const { photo_url, bio, price_per_minute } = req.body;

    if (photo_url !== undefined) {
      db.prepare('UPDATE consultants SET photo_url = ? WHERE id = ?').run(photo_url, id);
    }
    if (bio !== undefined) {
      db.prepare('UPDATE consultants SET bio = ? WHERE id = ?').run(bio, id);
    }
    if (price_per_minute !== undefined) {
      const priceVal = parseFloat(price_per_minute);
      if (!isNaN(priceVal) && priceVal > 0) {
        db.prepare('UPDATE consultants SET price_per_minute = ? WHERE id = ?').run(priceVal, id);
      }
    }

    const updated = db.prepare('SELECT * FROM consultants WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Consultant wallet stats and session history
app.get('/api/consultants/:id/stats', (req, res) => {
  try {
    const { id } = req.params;
    const consultant = db.prepare('SELECT wallet_today, wallet_monthly, wallet_total, wallet_withdrawable, plan_expiry FROM consultants WHERE id = ?').get(id);
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE consultant_id = ? ORDER BY created_at DESC').all(id);
    res.json({
      wallet: consultant,
      sessions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Review for Consultant
app.get('/api/consultants/:id/reviews', (req, res) => {
  try {
    const { id } = req.params;
    const reviews = db.prepare('SELECT id, user_name, rating, text, created_at FROM reviews WHERE consultant_id = ? ORDER BY id DESC').all(id);
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/consultants/:id/reviews', (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, rating, text } = req.body;

    if (!user_name || !rating) {
      return res.status(400).json({ error: 'User name and Rating are required' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO reviews (consultant_id, user_name, rating, text, created_at) VALUES (?, ?, ?, ?, ?)').run(id, user_name, rating, text || '', now);

    // Recalculate average rating for the consultant
    const ratingRow = db.prepare('SELECT AVG(rating) as avgRating FROM reviews WHERE consultant_id = ?').get(id) as { avgRating: number | null };
    if (ratingRow && ratingRow.avgRating !== null) {
      db.prepare('UPDATE consultants SET average_rating = ? WHERE id = ?').run(parseFloat(ratingRow.avgRating.toFixed(1)), id);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// API ROUTES: PAYMENTS & SESSIONS
// ==========================================

// Create Razorpay Order or Mock Sandbox Order
app.post('/api/payments/create-order', async (req, res) => {
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
app.post('/api/payments/verify', (req, res) => {
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
    const consultant = db.prepare('SELECT price_per_minute FROM consultants WHERE id = ?').get(consultant_id) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    // Calculate finances
    const price_per_minute = consultant.price_per_minute;
    const total_paid = price_per_minute * duration_minutes;

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
app.get('/api/sessions/:id', (req, res) => {
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
app.post('/api/sessions/:id/messages', (req, res) => {
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

    console.log(`[REST Server] Broadcasting message to session room ${session_id} via Socket.IO:`, savedMessage);
    // Broadcast message to everyone in the room via Socket.IO
    io.to(session_id).emit('message', savedMessage);

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
app.post('/api/sessions/:id/accept', (req, res) => {
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

    // Broadcast to the socket room that session is started
    io.to(session_id).emit('session:started', {
      session_id,
      started_at: startTime.toISOString(),
      expires_at: expiryTime.toISOString(),
      duration_minutes: sess.duration_minutes,
    });

    res.json({ success: true, status: 'active', started_at: startTime.toISOString(), expires_at: expiryTime.toISOString() });
  } catch (err: any) {
    console.error('Error in accept session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reject Chat Session
app.post('/api/sessions/:id/reject', (req, res) => {
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

    // Broadcast to the socket room that session is rejected
    io.to(session_id).emit('session:rejected', {
      session_id,
      message: 'Chat request was rejected by the consultant.'
    });

    res.json({ success: true, status: 'rejected' });
  } catch (err: any) {
    console.error('Error in reject session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Manually End Chat Session (User or Consultant can initiate)
app.post('/api/sessions/:id/end', (req, res) => {
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

    // 6. Broadcast event via socket.io to instantly stop UI inputs for both participants
    io.to(sess.id).emit('session:expired', {
      session_id: sess.id,
      transcript,
      message: `Session was manually ended. Talked for ${actualMinutes} mins.`
    });

    res.json({ success: true, status: 'completed', transcript, actualMinutes, actualCost, refundAmount });
  } catch (err: any) {
    console.error('Error ending session manually:', err);
    res.status(500).json({ error: err.message });
  }
});

// Block a User
app.post('/api/consultants/block', (req, res) => {
  try {
    const { consultant_id, user_name } = req.body;
    if (!consultant_id || !user_name) {
      return res.status(400).json({ error: 'Consultant ID and User Name are required' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO blocked_users (consultant_id, user_name, created_at)
      VALUES (?, ?, ?)
    `).run(consultant_id, user_name.trim(), now);

    res.json({ success: true, message: `User "${user_name}" has been blocked.` });
  } catch (err: any) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Unblock a User
app.post('/api/consultants/unblock', (req, res) => {
  try {
    const { consultant_id, user_name } = req.body;
    if (!consultant_id || !user_name) {
      return res.status(400).json({ error: 'Consultant ID and User Name are required' });
    }

    db.prepare('DELETE FROM blocked_users WHERE consultant_id = ? AND LOWER(user_name) = LOWER(?)')
      .run(consultant_id, user_name.trim());

    res.json({ success: true, message: `User "${user_name}" has been unblocked.` });
  } catch (err: any) {
    console.error('Error unblocking user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Blocked Users list for a consultant
app.get('/api/consultants/:id/blocked', (req, res) => {
  try {
    const { id } = req.params;
    const blocked = db.prepare('SELECT id, user_name, created_at FROM blocked_users WHERE consultant_id = ? ORDER BY id DESC').all(id);
    res.json(blocked);
  } catch (err: any) {
    console.error('Error fetching blocked list:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get All Blocked Users for Admin
app.get('/api/admin/blocked', (req, res) => {
  try {
    const blocked = db.prepare(`
      SELECT b.id, b.user_name, b.created_at, b.consultant_id, c.display_name as consultant_name
      FROM blocked_users b
      JOIN consultants c ON b.consultant_id = c.id
      ORDER BY b.id DESC
    `).all();
    res.json(blocked);
  } catch (err: any) {
    console.error('Error fetching admin blocked list:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get User Past Consultation History
app.get('/api/user/sessions', (req, res) => {
  try {
    const { user_name, ids } = req.query;
    let sessionsList: any[] = [];

    if (user_name) {
      sessionsList = db.prepare(`
        SELECT s.*, c.display_name as consultant_name 
        FROM sessions s
        JOIN consultants c ON s.consultant_id = c.id
        WHERE LOWER(s.user_name) = LOWER(?)
        ORDER BY s.id DESC
      `).all(String(user_name).trim());
    } else if (ids) {
      const idArr = String(ids).split(',').map(x => x.trim()).filter(Boolean);
      if (idArr.length > 0) {
        const placeholders = idArr.map(() => '?').join(',');
        sessionsList = db.prepare(`
          SELECT s.*, c.display_name as consultant_name 
          FROM sessions s
          JOIN consultants c ON s.consultant_id = c.id
          WHERE s.id IN (${placeholders})
          ORDER BY s.id DESC
        `).all(...idArr);
      }
    } else {
      // Default to returning empty array if no query params provided
      return res.json([]);
    }

    res.json(sessionsList);
  } catch (err: any) {
    console.error('Error fetching user past sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// USER AUTHENTICATION & PORTAL MANAGEMENT APIS
// =========================================================================

// User Sign Up
app.post('/api/user/signup', (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'Username, password and display name are required' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    
    // Check if username already exists in users
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists. Please choose another.' });
    }

    if (cleanEmail) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered. Please choose another or login.' });
      }
    }

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, display_name, wallet_balance, lifetime_recharge, is_blocked)
      VALUES (?, ?, ?, ?, 0.0, 0.0, 0)
    `);
    const result = stmt.run(cleanUsername, cleanEmail, password, display_name.trim());
    
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as any;
    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User Login
app.post('/api/user/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }
    const loginCredential = username.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(loginCredential, loginCredential) as any;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Check spelling or sign up!' });
    }
    if (user.password !== password) {
      return res.status(400).json({ error: 'Incorrect password.' });
    }
    if (user.is_blocked === 1) {
      return res.status(403).json({ error: 'Aapka account block kar diya gaya hai admin dwara. (Your account has been blocked by the admin.)' });
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User Forgot Password
app.post('/api/user/forgot-password', (req, res) => {
  try {
    const { username, new_password } = req.body;
    if (!username || !new_password) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(cleanUsername) as any;
    if (!user) {
      return res.status(404).json({ error: 'Username not found. Cannot reset password.' });
    }

    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(new_password, user.id);
    res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User Update Profile
app.post('/api/user/update-profile', (req, res) => {
  try {
    const { id, display_name, photo_url, dob, gender } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    db.prepare(`
      UPDATE users 
      SET display_name = ?, photo_url = ?, dob = ?, gender = ?
      WHERE id = ?
    `).run(display_name.trim(), photo_url || null, dob || null, gender || null, id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User Wallet Recharge
app.post('/api/user/recharge', (req, res) => {
  try {
    const { id, amount } = req.body;
    if (!id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid ID or recharge amount' });
    }
    const rechargeVal = parseFloat(amount);

    db.prepare(`
      UPDATE users 
      SET wallet_balance = wallet_balance + ?, 
          lifetime_recharge = lifetime_recharge + ? 
      WHERE id = ?
    `).run(rechargeVal, rechargeVal, id);

    logWalletTransaction(
      Number(id),
      'recharge',
      rechargeVal,
      `Wallet Recharge Page (Add ₹${rechargeVal.toFixed(2)})`
    );

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Profile Info (Sync)
app.get('/api/user/profile/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Wallet Transactions History
app.get('/api/user/wallet-transactions/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = db.prepare(`
      SELECT * FROM wallet_transactions 
      WHERE user_id = ? 
      ORDER BY id DESC
    `).all(userId);
    res.json({ success: true, transactions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Get All Users
app.get('/api/admin/users', (req, res) => {
  try {
    const usersList = db.prepare(`
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) as sessions_count,
        (SELECT IFNULL(SUM(total_paid), 0) FROM sessions s WHERE s.user_id = u.id AND s.status = 'completed') as total_spent
      FROM users u
      ORDER BY u.id DESC
    `).all();
    res.json(usersList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Block User
app.post('/api/admin/users/block', (req, res) => {
  try {
    const { user_id } = req.body;
    db.prepare('UPDATE users SET is_blocked = 1 WHERE id = ?').run(user_id);
    res.json({ success: true, message: 'User blocked successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Unblock User
app.post('/api/admin/users/unblock', (req, res) => {
  try {
    const { user_id } = req.body;
    db.prepare('UPDATE users SET is_blocked = 0 WHERE id = ?').run(user_id);
    res.json({ success: true, message: 'User unblocked successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
io.on('connection', (socket) => {
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

// ==========================================
// VITE DEV SERVER / PRODUCTION CONFIG
// ==========================================

async function startPlatform() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SaaS Chat Platform running on http://localhost:${PORT}`);
  });
}

startPlatform();
