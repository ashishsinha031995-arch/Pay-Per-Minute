import { Request, Response } from 'express';
import { db, logWalletTransaction } from '../config/database.js';
import fs from 'fs';
import path from 'path';

// Get All Active Consultants (Public Listings page)
export const getActiveConsultants = (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    let lockedConsultantId: number | null = null;
    let adminAllowOthers = 0;

    if (userId) {
      const user = db.prepare('SELECT locked_consultant_id, admin_allow_others FROM users WHERE id = ?').get(userId) as any;
      if (user) {
        lockedConsultantId = user.locked_consultant_id;
        adminAllowOthers = user.admin_allow_others;
      }
    }

    if (lockedConsultantId && adminAllowOthers === 0) {
      const consultants = db.prepare(`
        SELECT id, username, display_name, photo_url, bio, price_per_minute, is_online, is_busy, category 
        FROM consultants 
        WHERE is_active = 1 AND id = ?
      `).all(lockedConsultantId);
      return res.json(consultants);
    }

    const consultants = db.prepare('SELECT id, username, display_name, photo_url, bio, price_per_minute, is_online, is_busy, category FROM consultants WHERE is_active = 1').all();
    res.json(consultants);
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
    }

    const updated = db.prepare('SELECT id, is_online, is_busy FROM consultants WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update Consultant Profile Settings
export const updateConsultantProfile = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { photo_url, bio, price_per_minute, display_name, email, password } = req.body;

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
    if (display_name !== undefined) {
      db.prepare('UPDATE consultants SET display_name = ? WHERE id = ?').run(display_name, id);
    }
    if (email !== undefined) {
      db.prepare('UPDATE consultants SET email = ? WHERE id = ?').run(email, id);
    }
    if (password !== undefined && password !== '') {
      db.prepare('UPDATE consultants SET password = ? WHERE id = ?').run(password, id);
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
};

// Get Reviews for Consultant
export const getConsultantReviews = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reviews = db.prepare('SELECT id, user_name, rating, text, created_at FROM reviews WHERE consultant_id = ? ORDER BY id DESC').all(id);
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Add Review for Consultant
export const addConsultantReview = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_name, rating, text } = req.body;

    if (!user_name || !rating) {
      return res.status(400).json({ error: 'User name and Rating are required' });
    }

    const now = new Date().toISOString();
    db.prepare('INSERT INTO reviews (consultant_id, user_name, rating, text, created_at) VALUES (?, ?, ?, ?, ?)').run(id, user_name, rating, text || '', now);

    const ratingRow = db.prepare('SELECT AVG(rating) as avgRating FROM reviews WHERE consultant_id = ?').get(id) as { avgRating: number | null };
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
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// User Update Profile
export const updateUserProfile = (req: Request, res: Response) => {
  try {
    const { id, display_name, photo_url, dob, gender } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const cleanDisplayName = (display_name || '').trim();
    if (!cleanDisplayName) {
      return res.status(400).json({ error: 'Display Name is required' });
    }

    db.prepare(`
      UPDATE users 
      SET display_name = ?, photo_url = ?, dob = ?, gender = ?
      WHERE id = ?
    `).run(cleanDisplayName, photo_url || null, dob || null, gender || null, id);

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
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid Base64 image format' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Make sure it is actually an image mime type
    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // Map MIME type to file extension
    let extension = 'png';
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      extension = 'jpg';
    } else if (mimeType === 'image/gif') {
      extension = 'gif';
    } else if (mimeType === 'image/webp') {
      extension = 'webp';
    } else if (mimeType === 'image/svg+xml') {
      extension = 'svg';
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

// Lock User Referral to a specific consultant
export const lockUserReferral = (req: Request, res: Response) => {
  try {
    const { userId, consultantUsername } = req.body;
    if (!userId || !consultantUsername) {
      return res.status(400).json({ error: 'User ID and Consultant Username are required' });
    }

    // Find consultant by username
    const consultant = db.prepare('SELECT id FROM consultants WHERE LOWER(username) = ?').get(String(consultantUsername).toLowerCase().trim()) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    db.prepare('UPDATE users SET locked_consultant_id = ? WHERE id = ?').run(consultant.id, userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

