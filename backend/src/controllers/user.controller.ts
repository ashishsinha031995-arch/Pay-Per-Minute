import { Request, Response } from 'express';
import { db, logWalletTransaction } from '../config/database.js';
import { getSalaryCycleInfo, checkAndResetMonthlyWallets } from '../utils/salary.js';
import { processNextInQueue } from './payment.controller.js';
import { getRazorpayClient, getRazorpayErrorMessage, getCleanRazorpayKeyId, getResponseRazorpayKeyId, getCleanRazorpayKeySecret } from '../services/payment.service.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Get All Active Consultants (Public Listings page)
export const getActiveConsultants = (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    let lockedConsultantIds: number[] = [];
    let adminAllowOthers = 0;

    if (userId) {
      const user = db.prepare('SELECT locked_consultant_id, admin_allow_others FROM users WHERE id = ?').get(userId) as any;
      if (user) {
        adminAllowOthers = user.admin_allow_others;
        const lockedStr = user.locked_consultant_id;
        if (lockedStr !== null && lockedStr !== undefined && String(lockedStr).trim() !== '') {
          lockedConsultantIds = String(lockedStr)
            .split(',')
            .map(s => s.trim())
            .filter(s => s !== '')
            .map(s => parseInt(s, 10))
            .filter(n => !isNaN(n));
        }
      }
    }

    const allConsultants = db.prepare('SELECT id, username, display_name, photo_url, bio, price_per_minute, is_online, is_busy, category, plan_id FROM consultants WHERE is_active = 1').all();

    if (adminAllowOthers === 0 && lockedConsultantIds.length > 0) {
      const filtered = allConsultants.filter((c: any) => lockedConsultantIds.includes(c.id));
      return res.json(filtered);
    }

    res.json(allConsultants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get Public Consultant Profile by Username
export const getConsultantProfileByUsername = (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const consultant = db.prepare('SELECT id, username, display_name, photo_url, bio, price_per_minute, is_online, is_busy, category, experience, languages, specializations, average_rating FROM consultants WHERE username = ? AND is_active = 1').get(username);
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found or inactive' });
    }
    const reviews = db.prepare('SELECT id, user_name, rating, text, created_at FROM reviews WHERE consultant_id = ? ORDER BY id DESC').all((consultant as any).id);
    res.json({ consultant, reviews });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update Consultant Status (Online/Offline, Busy Toggles)
export const updateConsultantStatus = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_online, is_busy } = req.body;

    if (is_online !== undefined) {
      db.prepare('UPDATE consultants SET is_online = ? WHERE id = ?').run(is_online ? 1 : 0, id);
    }
    if (is_busy !== undefined) {
      db.prepare('UPDATE consultants SET is_busy = ? WHERE id = ?').run(is_busy ? 1 : 0, id);
      
      // If the consultant marked themselves as free (not busy), check if there are users in queue after a 3-second delay
      if (!is_busy) {
        const io = req.app.get('io');
        setTimeout(() => {
          try {
            processNextInQueue(Number(id), io);
          } catch (e) {
            console.error("Error running delayed processNextInQueue:", e);
          }
        }, 3000);
      }
    }

    const updated = db.prepare('SELECT id, is_online, is_busy FROM consultants WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get Consultant Profile Details (for logged in consultant dashboard)
export const getConsultantProfileById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const consultant = db.prepare('SELECT * FROM consultants WHERE id = ?').get(id);
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }
    res.json(consultant);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update Consultant Profile Settings
export const updateConsultantProfile = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { photo_url, bio, price_per_minute, display_name, email, password, phone } = req.body;

    if (photo_url !== undefined) {
      db.prepare('UPDATE consultants SET photo_url = ? WHERE id = ?').run(photo_url, id);
    }
    if (phone !== undefined) {
      db.prepare('UPDATE consultants SET phone = ? WHERE id = ?').run(phone, id);
    }
    if (bio !== undefined) {
      db.prepare('UPDATE consultants SET bio = ? WHERE id = ?').run(bio, id);
    }
    if (price_per_minute !== undefined) {
      const priceVal = parseFloat(price_per_minute);
      if (!isNaN(priceVal) && priceVal > 0) {
        // Enforce plan-based price rate cap
        const consultant = db.prepare('SELECT plan_id, display_name, price_per_minute FROM consultants WHERE id = ?').get(id) as { plan_id: number | null, display_name: string, price_per_minute: number } | undefined;
        let maxRate = 1000.0; // fallback default
        if (consultant) {
          let planId = consultant.plan_id;
          if (!planId) {
            // Default to lowest priced plan (Free / Starter)
            const defaultPlan = db.prepare('SELECT id, max_consultant_rate FROM plans ORDER BY price ASC LIMIT 1').get() as { id: number, max_consultant_rate: number } | undefined;
            if (defaultPlan) {
              planId = defaultPlan.id;
              db.prepare('UPDATE consultants SET plan_id = ? WHERE id = ?').run(planId, id);
              maxRate = defaultPlan.max_consultant_rate;
            }
          } else {
            const plan = db.prepare('SELECT max_consultant_rate FROM plans WHERE id = ?').get(planId) as { max_consultant_rate: number } | undefined;
            if (plan) {
              maxRate = plan.max_consultant_rate;
            }
          }
        }
        
        if (priceVal > maxRate) {
          return res.status(400).json({ error: `Aapke current plan ke mutabik aap maximum ₹${maxRate}/min set kar sakte hain. Iss limit ko badhane ke liye superior plan subscribe karein.` });
        }

        const oldPrice = consultant ? consultant.price_per_minute : 0;
        db.prepare('UPDATE consultants SET price_per_minute = ? WHERE id = ?').run(priceVal, id);

        // If the price changed, log it to audit_logs!
        if (consultant && oldPrice !== priceVal) {
          const logId = 'AUD-' + Math.floor(100000 + Math.random() * 900000);
          const timestamp = new Date().toISOString();
          const details = `Rate for Consultant ${consultant.display_name} (#${id}) changed from ₹${oldPrice}/min to ₹${priceVal}/min`;
          try {
            db.prepare(`
              INSERT INTO audit_logs (id, timestamp, actor, role, action, details, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(logId, timestamp, consultant.display_name, 'Consultant', 'Rate Limit Change', details, 'Success');
          } catch (logErr) {
            console.error('Failed to write audit log:', logErr);
          }
        }
      }
    }
    if (display_name !== undefined) {
      db.prepare('UPDATE consultants SET display_name = ? WHERE id = ?').run(display_name, id);
    }
    if (email !== undefined) {
      db.prepare('UPDATE consultants SET email = ? WHERE id = ?').run(email, id);
    }
    if (password !== undefined && password !== '') {
      db.prepare('UPDATE consultants SET password = ? WHERE id = ?').run(password, id);
    }

    // New KYC and Bank Details support
    const { 
      aadhaar_number, aadhaar_photo_url, pan_number, pan_photo_url, kyc_status, kyc_reject_reason,
      bank_account_holder_name, bank_account_number, bank_ifsc_code, bank_name, bank_status, bank_reject_reason
    } = req.body;

    if (aadhaar_number !== undefined) {
      db.prepare('UPDATE consultants SET aadhaar_number = ? WHERE id = ?').run(aadhaar_number, id);
    }
    if (aadhaar_photo_url !== undefined) {
      db.prepare('UPDATE consultants SET aadhaar_photo_url = ? WHERE id = ?').run(aadhaar_photo_url, id);
    }
    if (pan_number !== undefined) {
      db.prepare('UPDATE consultants SET pan_number = ? WHERE id = ?').run(pan_number, id);
    }
    if (pan_photo_url !== undefined) {
      db.prepare('UPDATE consultants SET pan_photo_url = ? WHERE id = ?').run(pan_photo_url, id);
    }
    if (kyc_status !== undefined) {
      db.prepare('UPDATE consultants SET kyc_status = ? WHERE id = ?').run(kyc_status, id);
    }
    if (kyc_reject_reason !== undefined) {
      db.prepare('UPDATE consultants SET kyc_reject_reason = ? WHERE id = ?').run(kyc_reject_reason, id);
    }
    if (bank_account_holder_name !== undefined) {
      db.prepare('UPDATE consultants SET bank_account_holder_name = ? WHERE id = ?').run(bank_account_holder_name, id);
    }
    if (bank_account_number !== undefined) {
      db.prepare('UPDATE consultants SET bank_account_number = ? WHERE id = ?').run(bank_account_number, id);
    }
    if (bank_ifsc_code !== undefined) {
      db.prepare('UPDATE consultants SET bank_ifsc_code = ? WHERE id = ?').run(bank_ifsc_code, id);
    }
    if (bank_name !== undefined) {
      db.prepare('UPDATE consultants SET bank_name = ? WHERE id = ?').run(bank_name, id);
    }
    if (bank_status !== undefined) {
      db.prepare('UPDATE consultants SET bank_status = ? WHERE id = ?').run(bank_status, id);
    }
    if (bank_reject_reason !== undefined) {
      db.prepare('UPDATE consultants SET bank_reject_reason = ? WHERE id = ?').run(bank_reject_reason, id);
    }

    const updated = db.prepare('SELECT * FROM consultants WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get Consultant wallet stats and session history
export const getConsultantStats = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check and trigger monthly wallet reset if crossed cutoff day
    checkAndResetMonthlyWallets();

    const consultant = db.prepare('SELECT wallet_today, wallet_monthly, wallet_total, wallet_withdrawable, plan_expiry, plan_id FROM consultants WHERE id = ?').get(id) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    const sessions = db.prepare(`
      SELECT s.*, r.rating, r.text as review_text, r.is_hidden as review_is_hidden
      FROM sessions s
      LEFT JOIN reviews r ON s.id = r.session_id
      WHERE s.consultant_id = ?
      ORDER BY s.created_at DESC
    `).all(id);
    const salaryInfo = getSalaryCycleInfo(Number(id));
    const manualAdjustments = db.prepare("SELECT * FROM manual_wallet_adjustments WHERE target_type = 'consultant' AND target_id = ? ORDER BY id DESC").all(id);

    res.json({
      wallet: consultant,
      sessions,
      salaryInfo,
      manualAdjustments,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get Reviews for Consultant
export const getConsultantReviews = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, viewer_id } = req.query;

    // If it's the consultant themselves viewing, allow showing hidden ones. Otherwise hide them.
    const isRecipient = (role === 'consultant' && String(viewer_id) === String(id));

    let reviews;
    if (isRecipient) {
      reviews = db.prepare('SELECT id, user_name, rating, text, created_at, is_hidden, session_id FROM reviews WHERE consultant_id = ? ORDER BY id DESC').all(id);
    } else {
      reviews = db.prepare('SELECT id, user_name, rating, text, created_at, is_hidden, session_id FROM reviews WHERE consultant_id = ? AND (is_hidden IS NULL OR is_hidden = 0) ORDER BY id DESC').all(id);
    }
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Add Review for Consultant
export const addConsultantReview = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_name, rating, text, session_id } = req.body;

    if (!user_name || !rating) {
      return res.status(400).json({ error: 'User name and Rating are required' });
    }

    const reviewTextString = text || '';
    const wordCount = reviewTextString.trim() === '' ? 0 : reviewTextString.trim().split(/\s+/).length;
    if (wordCount > 30) {
      return res.status(400).json({ error: 'Review text cannot exceed 30 words.' });
    }

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required to submit a review' });
    }

    // Check if session exists
    const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND consultant_id = ?').get(session_id, id);
    if (!session) {
      return res.status(403).json({ error: 'You must have a valid session with this consultant to leave a review.' });
    }

    // Check if already reviewed for this session
    const existing = db.prepare('SELECT id FROM reviews WHERE session_id = ?').get(session_id);
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted a review for this session.' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO reviews (consultant_id, user_name, rating, text, created_at, session_id, is_hidden) VALUES (?, ?, ?, ?, ?, ?, 0)').run(id, user_name, rating, text || '', now, session_id);

    const ratingRow = db.prepare('SELECT AVG(rating) as avgRating FROM reviews WHERE consultant_id = ? AND (is_hidden IS NULL OR is_hidden = 0)').get(id) as { avgRating: number | null };
    if (ratingRow && ratingRow.avgRating !== null) {
      db.prepare('UPDATE consultants SET average_rating = ? WHERE id = ?').run(parseFloat(ratingRow.avgRating.toFixed(1)), id);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Block a User
export const blockUserByConsultant = (req: Request, res: Response) => {
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
};

// Unblock a User
export const unblockUserByConsultant = (req: Request, res: Response) => {
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
};

// Get Blocked Users list for a consultant
export const getBlockedUsersByConsultant = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const blocked = db.prepare('SELECT id, user_name, created_at FROM blocked_users WHERE consultant_id = ? ORDER BY id DESC').all(id);
    res.json(blocked);
  } catch (err: any) {
    console.error('Error fetching blocked list:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get User Profile Info (Sync)
export const getUserProfileInfo = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let finalUser = user;
    if (!user.photo_url) {
      const finalGender = (user.gender || 'Male').trim();
      const defaultPhotoUrl = finalGender.toLowerCase() === 'female' ? 'https://i.giphy.com/OdG9tyVfD9NPM.gif' : 'https://i.giphy.com/W7Xq86ali939u.gif';
      db.prepare('UPDATE users SET photo_url = ?, gender = ? WHERE id = ?').run(defaultPhotoUrl, finalGender, user.id);
      finalUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    res.json({ success: true, user: finalUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// User Update Profile
export const updateUserProfile = (req: Request, res: Response) => {
  try {
    const { id, display_name, photo_url, dob, gender, location, languages, phone } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const cleanDisplayName = (display_name || '').trim();
    if (!cleanDisplayName) {
      return res.status(400).json({ error: 'Display Name is required' });
    }

    db.prepare(`
      UPDATE users 
      SET display_name = ?, photo_url = ?, dob = ?, gender = ?, location = ?, languages = ?, phone = ?
      WHERE id = ?
    `).run(cleanDisplayName, photo_url || null, dob || null, gender || null, location || null, languages || null, phone || null, id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// User Wallet Recharge
export const rechargeUserWallet = (req: Request, res: Response) => {
  try {
    const { id, amount } = req.body;
    if (!id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid ID or recharge amount' });
    }
    const rechargeVal = parseFloat(amount);
    const gstRate = 18.0; // 18% GST
    const gstAmount = parseFloat((rechargeVal * 0.18).toFixed(2));
    const totalPaid = parseFloat((rechargeVal + gstAmount).toFixed(2));

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
      `Wallet Recharge of ₹${rechargeVal.toFixed(2)} (Paid ₹${totalPaid.toFixed(2)} incl. 18% GST)`,
      gstRate,
      gstAmount,
      totalPaid
    );

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: updatedUser, gst_rate: gstRate, gst_amount: gstAmount, total_paid: totalPaid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Create Razorpay Order for Wallet Recharge
export const createRechargeOrder = async (req: Request, res: Response) => {
  try {
    const { id, amount } = req.body;
    if (!id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid user ID or recharge amount' });
    }

    const user = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rechargeVal = parseFloat(amount);
    const gstRate = 18.0; // 18% GST
    const gstAmount = parseFloat((rechargeVal * 0.18).toFixed(2));
    const totalPaid = parseFloat((rechargeVal + gstAmount).toFixed(2));
    const amount_in_paise = Math.round(totalPaid * 100);

    const razorpayClient = getRazorpayClient();

    if (!razorpayClient) {
      return res.status(400).json({ error: 'Razorpay keys are missing or invalid in backend configuration. Please ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured correctly in your environment.' });
    }

    try {
      const order = await razorpayClient.orders.create({
        amount: amount_in_paise,
        currency: 'INR',
        receipt: `receipt_recharge_${Date.now()}`,
        notes: {
          user_id: id.toString(),
          recharge_amount: rechargeVal.toString(),
          total_paid: totalPaid.toString(),
        },
      });

      return res.json({
        success: true,
        is_mock: false,
        key_id: getResponseRazorpayKeyId(false),
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        total_paid: totalPaid,
        recharge_amount: rechargeVal,
        gst_amount: gstAmount,
        gst_rate: gstRate,
      });
    } catch (err: any) {
      console.error('[Recharge] Razorpay recharge order creation failed:', err);
      const errMsg = getRazorpayErrorMessage(err);
      return res.status(400).json({ error: `Razorpay recharge order creation failed: ${errMsg}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Verify Razorpay Recharge Payment and credit wallet
export const verifyRechargePayment = async (req: Request, res: Response) => {
  try {
    const {
      id,
      amount,
      order_id,
      payment_id,
      signature,
      is_mock
    } = req.body;

    if (!id || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Missing required validation fields' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const rechargeVal = parseFloat(amount);
    const gstRate = 18.0;
    const gstAmount = parseFloat((rechargeVal * 0.18).toFixed(2));
    const totalPaid = parseFloat((rechargeVal + gstAmount).toFixed(2));

    const razorpayClient = getRazorpayClient();

    if (!is_mock && razorpayClient) {
      if (!order_id || !payment_id || !signature) {
        return res.status(400).json({ error: 'Payment verification details are missing.' });
      }

      // Verify the Razorpay signature
      const text = order_id + "|" + payment_id;
      const generated_signature = crypto
        .createHmac('sha256', getCleanRazorpayKeySecret()!)
        .update(text)
        .digest('hex');

      if (generated_signature !== signature) {
        return res.status(400).json({ error: 'Payment signature verification failed. Transaction is invalid.' });
      }
    }

    // Update user balance
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
      `Wallet Recharge of ₹${rechargeVal.toFixed(2)} (Paid ₹${totalPaid.toFixed(2)} incl. 18% GST via Razorpay)`,
      gstRate,
      gstAmount,
      totalPaid
    );

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    res.json({
      success: true,
      user: updatedUser,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      total_paid: totalPaid,
      payment_id: payment_id || `mock_pay_${Math.random().toString(36).slice(2, 10)}`
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get User Wallet Transactions History
export const getUserWalletTransactions = (req: Request, res: Response) => {
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
};

// Get User Past Consultation History
export const getUserPastSessions = (req: Request, res: Response) => {
  try {
    const { user_name, ids } = req.query;
    let sessionsList: any[] = [];

    if (user_name) {
      sessionsList = db.prepare(`
        SELECT s.*, c.display_name as consultant_name, r.rating, r.text as review_text, r.is_hidden as review_is_hidden
        FROM sessions s
        LEFT JOIN consultants c ON s.consultant_id = c.id
        LEFT JOIN reviews r ON s.id = r.session_id
        WHERE LOWER(s.user_name) = LOWER(?)
        ORDER BY s.id DESC
      `).all(String(user_name).trim());
    } else if (ids) {
      const idArr = String(ids).split(',').map(x => x.trim()).filter(Boolean);
      if (idArr.length > 0) {
        const placeholders = idArr.map(() => '?').join(',');
        sessionsList = db.prepare(`
          SELECT s.*, c.display_name as consultant_name, r.rating, r.text as review_text, r.is_hidden as review_is_hidden
          FROM sessions s
          LEFT JOIN consultants c ON s.consultant_id = c.id
          LEFT JOIN reviews r ON s.id = r.session_id
          WHERE s.id IN (${placeholders})
          ORDER BY s.id DESC
        `).all(...idArr);
      }
    } else {
      return res.json([]);
    }

    res.json(sessionsList);
  } catch (err: any) {
    console.error('Error fetching user past sessions:', err);
    res.status(500).json({ error: err.message });
  }
};

// Handle profile photo upload (receives a Base64 data URL string)
export const uploadPhoto = (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Expecting "data:image/png;base64,iVBOR..."
    if (!image.includes(';base64,')) {
      return res.status(400).json({ error: 'Invalid image format, must be base64 data URL' });
    }
    const parts = image.split(';base64,');
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'Invalid Base64 image format' });
    }

    const header = parts[0];
    const base64Data = parts[1].replace(/\s/g, ''); // strip any newlines or spaces
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size limit is 5MB. Kripya 5MB se choti file select karein.' });
    }

    if (!header.startsWith('data:')) {
      return res.status(400).json({ error: 'Invalid image prefix' });
    }
    const mimeType = header.substring(5);

    // Map MIME type to file extension, allow only png, jpg, jpeg
    let extension = '';
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      extension = 'jpg';
    } else if (mimeType === 'image/png') {
      extension = 'png';
    } else {
      return res.status(400).json({ error: 'Only PNG and JPG/JPEG files are allowed. (Sirf PNG aur JPG/JPEG format support hota hai.)' });
    }

    // Define uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${extension}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, buffer);

    res.json({
      success: true,
      photo_url: `/uploads/${filename}`
    });
  } catch (err: any) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ error: err.message });
  }
};

// Lock User Referral to a specific consultant (or multiple)
export const lockUserReferral = (req: Request, res: Response) => {
  try {
    const { userId, consultantUsername, usernames } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Support either a list of usernames (bulk) or a single username
    let targetUsernames: string[] = [];
    if (usernames && Array.isArray(usernames)) {
      targetUsernames = usernames.map(u => String(u).trim().toLowerCase()).filter(Boolean);
    } else if (consultantUsername) {
      targetUsernames = [String(consultantUsername).trim().toLowerCase()];
    }

    if (targetUsernames.length === 0) {
      return res.status(400).json({ error: 'No usernames specified' });
    }

    // Find all matching consultant IDs
    const placeholders = targetUsernames.map(() => '?').join(',');
    const consultants = db.prepare(`SELECT id FROM consultants WHERE LOWER(username) IN (${placeholders})`).all(...targetUsernames) as any[];

    if (consultants.length === 0) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      return res.json({ success: true, user });
    }

    const consultantIdsToLock = consultants.map(c => c.id);

    // Get current locked IDs
    const user = db.prepare('SELECT locked_consultant_id FROM users WHERE id = ?').get(userId) as any;
    const existingIds = (user && user.locked_consultant_id !== null && user.locked_consultant_id !== undefined && String(user.locked_consultant_id).trim() !== '')
      ? String(user.locked_consultant_id)
          .split(',')
          .map(s => s.trim())
          .filter(s => s !== '')
          .map(s => parseInt(s, 10))
          .filter(n => !isNaN(n))
      : [];

    consultantIdsToLock.forEach(id => {
      if (!existingIds.includes(id)) {
        existingIds.push(id);
      }
    });

    const newLockedStr = existingIds.join(',');
    db.prepare('UPDATE users SET locked_consultant_id = ? WHERE id = ?').run(newLockedStr, userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get Global & Category-specific Hero settings
export const getHeroSettings = (req: Request, res: Response) => {
  try {
    const row = db.prepare("SELECT value FROM admin_settings WHERE key = 'hero_settings'").get() as { value: string } | undefined;
    if (row) {
      return res.json(JSON.parse(row.value));
    }
    return res.status(404).json({ error: 'Hero settings not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getActiveQueuedSessionForUser = (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Check if there is a session for this user that is queued, active, or pending
    const sess = db.prepare(`
      SELECT s.*, c.display_name as consultant_name 
      FROM sessions s
      LEFT JOIN consultants c ON s.consultant_id = c.id
      WHERE s.user_id = ? AND s.status IN ('queued', 'pending', 'active')
      LIMIT 1
    `).get(userId) as any;

    if (!sess) {
      return res.json({ session: null });
    }

    // If it's queued, let's find the position in the queue
    let position = 0;
    let total_wait_time_seconds = 0;
    if (sess.status === 'queued') {
      const queuedList = db.prepare(`
        SELECT id, duration_minutes FROM sessions
        WHERE consultant_id = ? AND status = 'queued'
        ORDER BY created_at ASC
      `).all(sess.consultant_id) as any[];

      const index = queuedList.findIndex(q => q.id === sess.id);
      position = index !== -1 ? index + 1 : 0;

      // Calculate total wait time:
      // 1. Check if there's currently an active or pending session
      const currentActiveOrPending = db.prepare(`
        SELECT * FROM sessions
        WHERE consultant_id = ? AND status IN ('active', 'pending')
        LIMIT 1
      `).get(sess.consultant_id) as any;

      let currentRemainingSecs = 0;
      if (currentActiveOrPending) {
        const now = new Date();
        if (currentActiveOrPending.status === 'active' && currentActiveOrPending.expires_at) {
          const expiryTime = new Date(currentActiveOrPending.expires_at);
          currentRemainingSecs = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000));
        } else if (currentActiveOrPending.status === 'pending') {
          const createdTime = new Date(currentActiveOrPending.created_at);
          currentRemainingSecs = Math.max(0, Math.floor((createdTime.getTime() + 60 * 1000 - now.getTime()) / 1000));
        }
      }

      total_wait_time_seconds = currentRemainingSecs;
      // Add wait time for all users ahead of us in the queue
      if (index !== -1) {
        for (let i = 0; i < index; i++) {
          total_wait_time_seconds += queuedList[i].duration_minutes * 60;
        }
      }
    } else if (sess.status === 'pending' || sess.status === 'active') {
      const now = new Date();
      if (sess.status === 'active' && sess.expires_at) {
        const expiryTime = new Date(sess.expires_at);
        total_wait_time_seconds = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000));
      } else if (sess.status === 'pending') {
        const createdTime = new Date(sess.created_at);
        total_wait_time_seconds = Math.max(0, Math.floor((createdTime.getTime() + 60 * 1000 - now.getTime()) / 1000));
      }
    }

    res.json({
      session: {
        id: sess.id,
        consultant_id: sess.consultant_id,
        consultant_name: sess.consultant_name,
        status: sess.status,
        position,
        total_wait_time_seconds
      }
    });
  } catch (err: any) {
    console.error('Error fetching active/queued session for user:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get schedules for a specific consultant
export const getConsultantSchedules = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const schedules = db.prepare('SELECT * FROM consultant_schedules WHERE consultant_id = ? ORDER BY date ASC, from_time ASC').all(id);
    res.json(schedules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Create a schedule for a consultant
export const createConsultantSchedule = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, day, from_time, to_time } = req.body;

    if (!from_time || !to_time) {
      return res.status(400).json({ error: 'From Time and To Time are required.' });
    }

    const result = db.prepare(`
      INSERT INTO consultant_schedules (consultant_id, date, day, from_time, to_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, date || null, day || null, from_time, to_time, new Date().toISOString());

    const newSchedule = db.prepare('SELECT * FROM consultant_schedules WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newSchedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update a schedule for a consultant
export const updateConsultantSchedule = (req: Request, res: Response) => {
  try {
    const { id, scheduleId } = req.params;
    const { date, day, from_time, to_time } = req.body;

    const schedule = db.prepare('SELECT * FROM consultant_schedules WHERE id = ? AND consultant_id = ?').get(scheduleId, id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    db.prepare(`
      UPDATE consultant_schedules
      SET date = ?, day = ?, from_time = ?, to_time = ?
      WHERE id = ? AND consultant_id = ?
    `).run(date || null, day || null, from_time, to_time, scheduleId, id);

    const updatedSchedule = db.prepare('SELECT * FROM consultant_schedules WHERE id = ?').get(scheduleId);
    res.json(updatedSchedule);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a schedule
export const deleteConsultantSchedule = (req: Request, res: Response) => {
  try {
    const { id, scheduleId } = req.params;
    const schedule = db.prepare('SELECT * FROM consultant_schedules WHERE id = ? AND consultant_id = ?').get(scheduleId, id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    db.prepare('DELETE FROM consultant_schedules WHERE id = ? AND consultant_id = ?').run(scheduleId, id);
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};



