import { Request, Response } from 'express';
import { db, logWalletTransaction } from '../config/database.js';

// Get All Active Consultants (Public Listings page)
export const getActiveConsultants = (req: Request, res: Response) => {
  try {
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
};

// User Wallet Recharge
export const rechargeUserWallet = (req: Request, res: Response) => {
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
