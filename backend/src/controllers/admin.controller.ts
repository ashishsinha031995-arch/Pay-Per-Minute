import { Request, Response } from 'express';
import { db, logWalletTransaction, calculateConsultantLoginHours } from '../config/database.js';
import { getSalaryCycleInfo } from '../utils/salary.js';

export const getAdminDashboardStats = (req: Request, res: Response) => {
  try {
    const totalRevRow = db.prepare("SELECT SUM(total_paid) as total FROM sessions WHERE status = 'completed'").get() as { total: number | null };
    const totalSessionsRow = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
    const totalConsRow = db.prepare('SELECT COUNT(*) as count FROM consultants').get() as { count: number };
    const totalCommissionRow = db.prepare("SELECT SUM(commission_amount) as total FROM sessions WHERE status = 'completed'").get() as { total: number | null };
    const commRateRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'commission_percentage'").get() as { value: string };
    
    const cutoffDayRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'salary_cutoff_day'").get() as { value: string } | undefined;
    const payoutDayRow = db.prepare("SELECT value FROM admin_settings WHERE key = 'salary_payout_day'").get() as { value: string } | undefined;

    const totalRefundedRow = db.prepare("SELECT SUM(refunded_amount) as total FROM sessions").get() as { total: number | null };

    // Fetch all plans dynamically and calculate enrolment + earnings metrics
    const plansList = db.prepare('SELECT * FROM plans').all() as any[];
    const plansWithStats = plansList.map((plan: any) => {
      const enrolledCount = db.prepare('SELECT COUNT(*) as count FROM consultants WHERE plan_id = ?').get(plan.id) as { count: number };
      const sessionStats = db.prepare(`
        SELECT SUM(s.total_paid) as total_rev, SUM(s.commission_amount) as total_comm 
        FROM sessions s 
        JOIN consultants c ON s.consultant_id = c.id
        WHERE c.plan_id = ? AND s.status = 'completed'
      `).get(plan.id) as { total_rev: number | null, total_comm: number | null };
      
      return {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        max_consultant_rate: plan.max_consultant_rate,
        commission_rate: plan.commission_rate,
        support_hours: plan.support_hours,
        description: plan.description,
        enrolledCount: enrolledCount.count,
        totalRevenue: sessionStats.total_rev || 0,
        totalCommission: sessionStats.total_comm || 0
      };
    });

    res.json({
      totalRevenue: totalRevRow.total || 0,
      totalSessions: totalSessionsRow.count,
      totalConsultants: totalConsRow.count,
      totalCommission: totalCommissionRow.total || 0,
      totalRefunded: totalRefundedRow.total || 0,
      commissionRate: parseFloat(commRateRow.value || '20'),
      salaryCutoffDay: cutoffDayRow ? parseInt(cutoffDayRow.value) : 25,
      salaryPayoutDay: payoutDayRow ? parseInt(payoutDayRow.value) : 7,
      plansStats: plansWithStats
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSentEmailsLog = (req: Request, res: Response) => {
  try {
    const emails = db.prepare('SELECT * FROM sent_emails ORDER BY id DESC LIMIT 50').all();
    res.json(emails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAdminAuditLogs = (req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000').all();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAdminConsultantsList = (req: Request, res: Response) => {
  try {
    const consultants = db.prepare(`
      SELECT c.*, p.name AS plan_name,
             ((SELECT COUNT(*) FROM consultant_followers f WHERE f.consultant_id = c.id) + c.manual_followers_count) AS followers_count
      FROM consultants c 
      LEFT JOIN plans p ON c.plan_id = p.id 
      ORDER BY c.id DESC
    `).all() as any[];
    
    // Attach detailed salary calculations and login hours for each consultant
    for (const cons of consultants) {
      cons.salary_info = getSalaryCycleInfo(cons.id);
      cons.login_hours = calculateConsultantLoginHours(cons.id);
    }
    
    res.json(consultants);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleConsultantActiveStatus = (req: Request, res: Response) => {
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
};

export const updateConsultantBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      display_name,
      email,
      phone,
      bio,
      price_per_minute,
      category,
      experience,
      languages,
      specializations,
      plan_id,
      plan_expiry,
      wallet_withdrawable,
      wallet_total,
      aadhaar_number,
      aadhaar_photo_url,
      pan_number,
      pan_photo_url,
      kyc_status,
      kyc_reject_reason,
      bank_account_holder_name,
      bank_account_number,
      bank_ifsc_code,
      bank_name,
      bank_status,
      bank_reject_reason
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Consultant ID is required' });
    }

    const consultant = db.prepare('SELECT id FROM consultants WHERE id = ?').get(id);
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' });
    }

    if (display_name !== undefined) {
      db.prepare('UPDATE consultants SET display_name = ? WHERE id = ?').run(display_name.trim(), id);
    }
    if (email !== undefined) {
      db.prepare('UPDATE consultants SET email = ? WHERE id = ?').run(email, id);
    }
    if (phone !== undefined) {
      db.prepare('UPDATE consultants SET phone = ? WHERE id = ?').run(phone, id);
    }
    if (bio !== undefined) {
      db.prepare('UPDATE consultants SET bio = ? WHERE id = ?').run(bio, id);
    }
    if (price_per_minute !== undefined) {
      db.prepare('UPDATE consultants SET price_per_minute = ? WHERE id = ?').run(parseFloat(price_per_minute) || 0, id);
    }
    if (category !== undefined) {
      db.prepare('UPDATE consultants SET category = ? WHERE id = ?').run(category, id);
    }
    if (experience !== undefined) {
      db.prepare('UPDATE consultants SET experience = ? WHERE id = ?').run(parseInt(experience) || 0, id);
    }
    if (languages !== undefined) {
      db.prepare('UPDATE consultants SET languages = ? WHERE id = ?').run(languages, id);
    }
    if (specializations !== undefined) {
      db.prepare('UPDATE consultants SET specializations = ? WHERE id = ?').run(specializations, id);
    }
    if (plan_id !== undefined) {
      db.prepare('UPDATE consultants SET plan_id = ? WHERE id = ?').run(plan_id ? parseInt(plan_id) : null, id);
    }
    if (plan_expiry !== undefined) {
      db.prepare('UPDATE consultants SET plan_expiry = ? WHERE id = ?').run(plan_expiry || null, id);
    }
    if (wallet_withdrawable !== undefined) {
      db.prepare('UPDATE consultants SET wallet_withdrawable = ? WHERE id = ?').run(parseFloat(wallet_withdrawable) || 0, id);
    }
    if (wallet_total !== undefined) {
      db.prepare('UPDATE consultants SET wallet_total = ? WHERE id = ?').run(parseFloat(wallet_total) || 0, id);
    }
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
    res.json({ success: true, consultant: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateAdminCommissionRateSetting = (req: Request, res: Response) => {
  try {
    const { commission_percentage, salary_cutoff_day, salary_payout_day } = req.body;
    
    if (commission_percentage !== undefined) {
      if (isNaN(parseFloat(commission_percentage))) {
        return res.status(400).json({ error: 'Invalid commission percentage' });
      }
      db.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').run('commission_percentage', commission_percentage.toString());
    }

    if (salary_cutoff_day !== undefined) {
      const day = parseInt(salary_cutoff_day);
      if (isNaN(day) || day < 1 || day > 31) {
        return res.status(400).json({ error: 'Salary Cutoff Day must be between 1 and 31' });
      }
      db.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').run('salary_cutoff_day', day.toString());
    }

    if (salary_payout_day !== undefined) {
      const day = parseInt(salary_payout_day);
      if (isNaN(day) || day < 1 || day > 31) {
        return res.status(400).json({ error: 'Salary Payout Day must be between 1 and 31' });
      }
      db.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').run('salary_payout_day', day.toString());
    }

    res.json({ 
      success: true, 
      commission_percentage, 
      salary_cutoff_day, 
      salary_payout_day 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllSessionsFinancialLogs = (req: Request, res: Response) => {
  try {
    const sessions = db.prepare(`
      SELECT s.*, c.display_name as consultant_name 
      FROM sessions s 
      LEFT JOIN consultants c ON s.consultant_id = c.id 
      ORDER BY s.created_at DESC
    `).all();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAdminBlockedUsersList = (req: Request, res: Response) => {
  try {
    const blocked = db.prepare(`
      SELECT b.id, b.user_name, b.created_at, b.consultant_id, c.display_name as consultant_name,
             (SELECT u.id FROM users u WHERE LOWER(u.display_name) = LOWER(b.user_name) LIMIT 1) as user_id
      FROM blocked_users b
      JOIN consultants c ON b.consultant_id = c.id
      ORDER BY b.id DESC
    `).all();
    res.json(blocked);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteBlockedUserRecordByAdmin = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM blocked_users WHERE id = ?').run(Number(id));
    res.json({ success: true, message: 'Block list entry removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSuperAdminUsersList = (req: Request, res: Response) => {
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
};

export const blockUserBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    db.prepare('UPDATE users SET is_blocked = 1 WHERE id = ?').run(user_id);
    res.json({ success: true, message: 'User blocked successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const unblockUserBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    db.prepare('UPDATE users SET is_blocked = 0 WHERE id = ?').run(user_id);
    res.json({ success: true, message: 'User unblocked successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUserBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      display_name, 
      email, 
      photo_url, 
      dob, 
      gender, 
      wallet_balance,
      locked_consultant_id,
      admin_allow_others,
      category,
      location,
      languages,
      phone
    } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cleanDisplayName = (display_name || '').trim();
    if (!cleanDisplayName) {
      return res.status(400).json({ error: 'Display Name is required' });
    }

    // Keep the current photo_url if the updated one is not a valid non-empty string
    const finalPhotoUrl = (photo_url && typeof photo_url === 'string' && photo_url.trim() !== '')
      ? photo_url.trim()
      : (existingUser.photo_url || null);

    db.prepare(`
      UPDATE users 
      SET display_name = ?, email = ?, photo_url = ?, dob = ?, gender = ?, wallet_balance = ?,
          locked_consultant_id = ?, admin_allow_others = ?, category = ?, location = ?, languages = ?, phone = ?
      WHERE id = ?
    `).run(
      cleanDisplayName,
      email || null,
      finalPhotoUrl,
      dob || null,
      gender || null,
      parseFloat(wallet_balance) || 0,
      (locked_consultant_id !== undefined && locked_consultant_id !== '' && locked_consultant_id !== null) ? String(locked_consultant_id) : null,
      admin_allow_others !== undefined ? parseInt(admin_allow_others) : 0,
      category || 'General',
      location || null,
      languages || null,
      phone || null,
      id
    );

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Bulk Update Users
export const bulkUpdateUsersBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { userIds, category, locked_consultant_id, admin_allow_others, wallet_add_amount } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one user for bulk update.' });
    }

    const cleanUserIds = userIds.map((id: any) => Number(id));
    const placeholders = cleanUserIds.map(() => '?').join(',');

    if (category !== undefined && category !== '') {
      db.prepare(`UPDATE users SET category = ? WHERE id IN (${placeholders})`).run(category, ...cleanUserIds);
    }

    if (locked_consultant_id !== undefined) {
      const val = (locked_consultant_id === 'null' || locked_consultant_id === null || locked_consultant_id === '') ? null : String(locked_consultant_id);
      db.prepare(`UPDATE users SET locked_consultant_id = ? WHERE id IN (${placeholders})`).run(val, ...cleanUserIds);
    }

    if (admin_allow_others !== undefined) {
      const val = parseInt(admin_allow_others) || 0;
      db.prepare(`UPDATE users SET admin_allow_others = ? WHERE id IN (${placeholders})`).run(val, ...cleanUserIds);
    }

    if (wallet_add_amount !== undefined && !isNaN(parseFloat(wallet_add_amount)) && parseFloat(wallet_add_amount) !== 0) {
      const addAmount = parseFloat(wallet_add_amount);
      db.prepare(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id IN (${placeholders})`).run(addAmount, ...cleanUserIds);
      
      // Log wallet transaction for each bulk-updated user
      for (const userId of cleanUserIds) {
        logWalletTransaction(
          Number(userId),
          'recharge',
          addAmount,
          `Bulk admin adjustment of ₹${addAmount.toFixed(2)}`
        );
      }
    }

    res.json({ success: true, message: `Successfully updated ${cleanUserIds.length} users in bulk.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get all reviews for super admin moderation
export const getSuperAdminReviewsList = (req: Request, res: Response) => {
  try {
    const reviewsList = db.prepare(`
      SELECT 
        r.*,
        c.display_name as consultant_name,
        c.username as consultant_username
      FROM reviews r
      LEFT JOIN consultants c ON r.consultant_id = c.id
      ORDER BY r.id DESC
    `).all();
    res.json(reviewsList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Delete feedback / review
export const deleteReviewBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get consultant id first to recalculate rating
    const review = db.prepare('SELECT consultant_id FROM reviews WHERE id = ?').get(id) as { consultant_id: number } | undefined;
    
    db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
    
    if (review) {
      const ratingRow = db.prepare('SELECT AVG(rating) as avgRating FROM reviews WHERE consultant_id = ?').get(review.consultant_id) as { avgRating: number | null };
      const avg = ratingRow.avgRating ? Math.round(ratingRow.avgRating * 10) / 10 : 0;
      db.prepare('UPDATE consultants SET rating = ? WHERE id = ?').run(avg, review.consultant_id);
    }

    res.json({ success: true, message: 'Review deleted and average rating recalculated.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle Hidden status for reviews
export const toggleReviewHiddenStatusBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const review = db.prepare('SELECT is_hidden, consultant_id FROM reviews WHERE id = ?').get(id) as { is_hidden: number; consultant_id: number } | undefined;
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    const newHidden = review.is_hidden === 1 ? 0 : 1;
    db.prepare('UPDATE reviews SET is_hidden = ? WHERE id = ?').run(newHidden, id);

    // Recalculate average rating of the consultant based on non-hidden reviews
    const ratingRow = db.prepare('SELECT AVG(rating) as avgRating FROM reviews WHERE consultant_id = ? AND (is_hidden IS NULL OR is_hidden = 0)').get(review.consultant_id) as { avgRating: number | null };
    const avg = ratingRow.avgRating ? Math.round(ratingRow.avgRating * 10) / 10 : 0;
    db.prepare('UPDATE consultants SET average_rating = ? WHERE id = ?').run(avg, review.consultant_id);

    res.json({ success: true, is_hidden: newHidden, message: `Review visibility toggled. Consultant average rating recalculated to ${avg}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get all subscription plans for super admin panel
export const getAdminPlansList = (req: Request, res: Response) => {
  try {
    const plans = db.prepare('SELECT * FROM plans ORDER BY id ASC').all();
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new subscription plan
export const createPlanBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { name, price, duration_days, description, max_consultant_rate, support_hours, commission_rate } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Plan name is required.' });
    }
    
    const parsedPrice = parseFloat(price) || 0.0;
    const parsedDuration = parseInt(duration_days) || 30;
    const parsedMaxRate = parseFloat(max_consultant_rate) || 1000.0;
    const parsedCommission = parseFloat(commission_rate) || 20.0;
    const supportText = support_hours || '72 Hours';

    const result = db.prepare(`
      INSERT INTO plans (name, price, duration_days, description, max_consultant_rate, support_hours, commission_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      parsedPrice,
      parsedDuration,
      description || '',
      parsedMaxRate,
      supportText,
      parsedCommission
    );

    res.json({
      success: true,
      message: 'Subscription plan created successfully.',
      planId: result.lastInsertRowid
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update an existing subscription plan
export const updatePlanBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, duration_days, description, max_consultant_rate, support_hours, commission_rate } = req.body;

    const existing = db.prepare('SELECT id FROM plans WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Plan name is required.' });
    }

    const parsedPrice = parseFloat(price) || 0.0;
    const parsedDuration = parseInt(duration_days) || 30;
    const parsedMaxRate = parseFloat(max_consultant_rate) || 1000.0;
    const parsedCommission = parseFloat(commission_rate) || 20.0;
    const supportText = support_hours || '72 Hours';

    db.prepare(`
      UPDATE plans 
      SET name = ?,
          price = ?,
          duration_days = ?,
          description = ?,
          max_consultant_rate = ?,
          support_hours = ?,
          commission_rate = ?
      WHERE id = ?
    `).run(
      name,
      parsedPrice,
      parsedDuration,
      description || '',
      parsedMaxRate,
      supportText,
      parsedCommission,
      id
    );

    res.json({
      success: true,
      message: 'Subscription plan updated successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a subscription plan
export const deletePlanBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = db.prepare('SELECT id FROM plans WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    db.prepare('DELETE FROM plans WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Subscription plan deleted successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update Global & Category-specific Hero settings
export const updateHeroSettings = (req: Request, res: Response) => {
  try {
    const { hero_settings } = req.body;
    if (!hero_settings) {
      return res.status(400).json({ error: 'Hero settings are required' });
    }
    db.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').run('hero_settings', JSON.stringify(hero_settings));
    res.json({ success: true, hero_settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Refund session by super admin
export const refundSessionBySuperAdmin = (req: Request, res: Response) => {
  try {
    const { id: session_id } = req.params;
    const { minutes } = req.body;

    const parsedMinutes = parseInt(minutes, 10);
    if (isNaN(parsedMinutes) || parsedMinutes <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive number of minutes to refund.' });
    }

    const result = db.transaction(() => {
      const sess = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session_id) as any;
      if (!sess) {
        throw new Error('Session not found.');
      }

      if (sess.status !== 'completed' && sess.status !== 'active') {
        throw new Error('Can only refund completed or active sessions.');
      }

      const refunded_minutes = sess.refunded_minutes || 0;

      if (refunded_minutes + parsedMinutes > sess.duration_minutes) {
        throw new Error(`Cannot refund ${parsedMinutes} minutes. Only ${sess.duration_minutes - refunded_minutes} remaining minutes are eligible for refund.`);
      }

      const refund_amount = parsedMinutes * sess.price_per_minute;

      // Update Session
      db.prepare(`
        UPDATE sessions 
        SET refunded_minutes = refunded_minutes + ?,
            refunded_amount = refunded_amount + ?,
            consultant_earnings = MAX(0.0, consultant_earnings - ?)
        WHERE id = ?
      `).run(parsedMinutes, refund_amount, refund_amount, session_id);

      // Refund User Wallet
      if (sess.user_id) {
        db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(refund_amount, sess.user_id);
        logWalletTransaction(
          Number(sess.user_id),
          'refund',
          refund_amount,
          `Refund: ${parsedMinutes} mins for Chat Session #${session_id}`
        );
      }

      // Deduct from Consultant Wallet
      db.prepare(`
        UPDATE consultants 
        SET wallet_today = wallet_today - ?,
            wallet_monthly = wallet_monthly - ?,
            wallet_total = wallet_total - ?,
            wallet_withdrawable = wallet_withdrawable - ?
        WHERE id = ?
      `).run(refund_amount, refund_amount, refund_amount, refund_amount, sess.consultant_id);

      return { refund_amount, parsedMinutes, user_id: sess.user_id, consultant_id: sess.consultant_id };
    })();

    const io = req.app.get('io');
    if (io) {
      io.emit('wallet:updated', { 
        userId: result.user_id, 
        consultantId: result.consultant_id,
        refundAmount: result.refund_amount,
        sessionId: session_id 
      });
    }

    res.json({
      success: true,
      message: `Successfully refunded ${result.parsedMinutes} minutes (₹${result.refund_amount.toFixed(2)}) to the user's wallet.`,
      refund_amount: result.refund_amount,
      refunded_minutes: result.parsedMinutes
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Manually Add Money to User or Consultant Wallet
export const addMoneyToWallet = (req: Request, res: Response) => {
  try {
    const { target_type, target_id, amount, reason } = req.body;

    if (!target_type || !['user', 'consultant'].includes(target_type)) {
      return res.status(400).json({ error: 'Invalid target type. Must be user or consultant.' });
    }

    const numId = Number(target_id);
    const numAmount = parseFloat(amount);

    if (isNaN(numId) || numId <= 0) {
      return res.status(400).json({ error: 'Invalid target ID.' });
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required for manual adjustments.' });
    }

    const trimmedReason = reason.trim();
    const now = new Date().toISOString();

    let targetName = '';

    if (target_type === 'user') {
      const user = db.prepare('SELECT display_name, id FROM users WHERE id = ?').get(numId) as any;
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      targetName = user.display_name;

      // Update User Wallet
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(numAmount, numId);

      // Insert transaction into wallet_transactions for user dashboard ledger
      db.prepare(`
        INSERT INTO wallet_transactions (user_id, type, amount, description, gst_rate, gst_amount, total_paid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(numId, 'admin_credit', numAmount, `Special Admin Credit: ${trimmedReason}`, 0, 0, numAmount, now);

    } else {
      const consultant = db.prepare('SELECT display_name, id FROM consultants WHERE id = ?').get(numId) as any;
      if (!consultant) {
        return res.status(404).json({ error: 'Consultant not found.' });
      }
      targetName = consultant.display_name;

      // Update Consultant Wallet
      db.prepare(`
        UPDATE consultants 
        SET wallet_withdrawable = wallet_withdrawable + ?,
            wallet_total = wallet_total + ?,
            wallet_monthly = wallet_monthly + ?
        WHERE id = ?
      `).run(numAmount, numAmount, numAmount, numId);
    }

    // Insert into manual adjustments log table
    db.prepare(`
      INSERT INTO manual_wallet_adjustments (target_type, target_id, target_name, amount, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(target_type, numId, targetName, numAmount, trimmedReason, now);

    // Emit live update
    const io = req.app.get('io');
    if (io) {
      if (target_type === 'user') {
        io.emit('wallet:updated', { userId: numId, amount: numAmount });
      } else {
        io.emit('wallet:updated', { consultantId: numId, amount: numAmount });
      }
    }

    res.json({
      success: true,
      message: `Successfully credited ₹${numAmount.toFixed(2)} to ${target_type === 'user' ? 'Client' : 'Expert'} "${targetName}" wallet.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch list of all Manual Wallet Adjustments with summary counts
export const getManualWalletAdjustments = (req: Request, res: Response) => {
  try {
    const adjustments = db.prepare('SELECT * FROM manual_wallet_adjustments ORDER BY id DESC').all() as any[];
    
    const userSumResult = db.prepare("SELECT SUM(amount) as total FROM manual_wallet_adjustments WHERE target_type = 'user'").get() as { total: number | null };
    const consultantSumResult = db.prepare("SELECT SUM(amount) as total FROM manual_wallet_adjustments WHERE target_type = 'consultant'").get() as { total: number | null };

    res.json({
      success: true,
      adjustments,
      totalAddedToUsers: userSumResult?.total || 0,
      totalAddedToConsultants: consultantSumResult?.total || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch all live queues for Super Admin Panel
export const getAdminLiveQueues = (req: Request, res: Response) => {
  try {
    const consultants = db.prepare('SELECT id, display_name, username, is_busy FROM consultants').all() as any[];
    const now = new Date();

    const liveQueues = consultants.map(cons => {
      // 1. Get current active session
      const activeSession = db.prepare(`
        SELECT id, user_id, user_name, duration_minutes, expires_at, status 
        FROM sessions 
        WHERE consultant_id = ? AND status = 'active'
        LIMIT 1
      `).get(cons.id) as any;

      // 2. Get current pending session (60s ring timeout)
      const pendingSession = db.prepare(`
        SELECT id, user_id, user_name, duration_minutes, created_at, status 
        FROM sessions 
        WHERE consultant_id = ? AND status = 'pending'
        LIMIT 1
      `).get(cons.id) as any;

      let remainingSeconds = 0;
      let activeSessionInfo = null;

      if (activeSession) {
        activeSessionInfo = { 
          id: activeSession.id, 
          status: 'active',
          user_id: activeSession.user_id,
          user_name: activeSession.user_name,
          duration_minutes: activeSession.duration_minutes
        };
        if (activeSession.expires_at) {
          const expiryTime = new Date(activeSession.expires_at);
          remainingSeconds = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000));
        }
      } else if (pendingSession) {
        activeSessionInfo = { 
          id: pendingSession.id, 
          status: 'pending',
          user_id: pendingSession.user_id,
          user_name: pendingSession.user_name,
          duration_minutes: pendingSession.duration_minutes
        };
        const createdTime = new Date(pendingSession.created_at);
        remainingSeconds = Math.max(0, Math.floor((createdTime.getTime() + 60 * 1000 - now.getTime()) / 1000));
      }

      // 3. Get all queued sessions
      const queuedSessions = db.prepare(`
        SELECT id, user_id, user_name, duration_minutes, created_at 
        FROM sessions 
        WHERE consultant_id = ? AND status = 'queued'
        ORDER BY created_at ASC
      `).all(cons.id) as any[];

      // Calculate sequential wait times
      let runningWaitTime = remainingSeconds;
      const queueSequence = queuedSessions.map((q, idx) => {
        const userWait = runningWaitTime;
        runningWaitTime += q.duration_minutes * 60;
        return {
          session_id: q.id,
          user_id: q.user_id,
          user_name: q.user_name,
          duration_minutes: q.duration_minutes,
          position: idx + 1,
          wait_time_seconds: userWait,
          created_at: q.created_at
        };
      });

      return {
        consultant_id: cons.id,
        display_name: cons.display_name,
        username: cons.username,
        is_busy: cons.is_busy,
        active_session: activeSessionInfo,
        active_session_remaining_seconds: remainingSeconds,
        queue_count: queuedSessions.length,
        queue: queueSequence
      };
    });

    res.json({ success: true, liveQueues });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getConsultantsLoginLogsByAdmin = (req: Request, res: Response) => {
  res.json([]);
};

// Set manual followers count for a consultant
export const updateConsultantManualFollowers = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { manual_followers_count } = req.body;
    
    if (manual_followers_count === undefined || isNaN(parseInt(manual_followers_count, 10))) {
      return res.status(400).json({ error: 'Valid manual followers count is required' });
    }
    
    db.prepare('UPDATE consultants SET manual_followers_count = ? WHERE id = ?').run(parseInt(manual_followers_count, 10), id);
    
    // Log to audit logs
    const logId = 'AUD-' + Math.floor(100000 + Math.random() * 900000);
    const timestamp = new Date().toISOString();
    const details = `Super Admin updated manual followers count for Consultant ID #${id} to ${manual_followers_count}`;
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, actor, role, action, details, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(logId, timestamp, 'Super Admin', 'Admin', 'Follower Count Adjustment', details, 'Success');
    } catch (_) {}
    
    res.json({ success: true, manual_followers_count: parseInt(manual_followers_count, 10) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get consultants followers leaderboard (descending order)
export const getConsultantFollowersLeaderboard = (req: Request, res: Response) => {
  try {
    const leaderboard = db.prepare(`
      SELECT c.id, c.username, c.display_name, c.photo_url, c.category, c.manual_followers_count,
             (SELECT COUNT(*) FROM consultant_followers f WHERE f.consultant_id = c.id) AS organic_followers_count,
             ((SELECT COUNT(*) FROM consultant_followers f WHERE f.consultant_id = c.id) + c.manual_followers_count) AS followers_count
      FROM consultants c
      ORDER BY followers_count DESC
    `).all();
    res.json(leaderboard);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get top 20 consultants by revenue leaderboard
export const getConsultantRevenueLeaderboard = (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    let query = `
      SELECT c.id, c.username, c.display_name, c.photo_url, c.category,
             COALESCE(SUM(s.total_paid), 0) AS total_revenue,
             COALESCE(SUM(s.commission_amount), 0) AS total_commission,
             COUNT(s.id) AS total_sessions
      FROM consultants c
      LEFT JOIN sessions s ON c.id = s.consultant_id AND s.status = 'completed'
    `;
    const params: any[] = [];
    if (category && category !== 'all' && category !== 'All') {
      query += ` WHERE LOWER(c.category) = ? `;
      params.push(String(category).toLowerCase());
    }
    query += `
      GROUP BY c.id
      ORDER BY total_revenue DESC
      LIMIT 20
    `;
    const leaderboard = db.prepare(query).all(...params);
    res.json(leaderboard);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Get top 20 users by spending leaderboard
export const getUserSpendsLeaderboard = (req: Request, res: Response) => {
  try {
    const { month } = req.query; // 'all' or 'YYYY-MM'
    
    // 1. Fetch distinct months that have completed sessions
    const monthsResult = db.prepare(`
      SELECT DISTINCT SUBSTR(created_at, 1, 7) AS month
      FROM sessions
      WHERE status = 'completed' AND created_at IS NOT NULL AND created_at != ''
      ORDER BY month DESC
    `).all() as { month: string }[];
    const availableMonths = monthsResult.map(m => m.month);

    // 2. Fetch users and their total spend
    let query = `
      SELECT u.id, u.username, u.display_name, u.photo_url, u.email, u.phone,
             COALESCE(SUM(s.total_paid), 0) AS total_spend,
             COUNT(s.id) AS total_sessions,
             COALESCE(SUM(s.duration_minutes), 0) AS total_duration_minutes
      FROM users u
      INNER JOIN sessions s ON u.id = s.user_id AND s.status = 'completed'
    `;
    const params: any[] = [];
    if (month && month !== 'all' && month !== 'All') {
      query += ` WHERE SUBSTR(s.created_at, 1, 7) = ? `;
      params.push(String(month));
    }
    query += `
      GROUP BY u.id
      ORDER BY total_spend DESC
      LIMIT 20
    `;
    const usersLeaderboard = db.prepare(query).all(...params) as any[];

    // 3. For each user, fetch their most-talked-to consultant
    const richLeaderboard = usersLeaderboard.map((user) => {
      let favoriteQuery = `
        SELECT c.id AS consultant_id, c.display_name AS consultant_display_name,
               c.username AS consultant_username, c.photo_url AS consultant_photo_url,
               COUNT(s.id) AS sessions_with_consultant,
               COALESCE(SUM(s.duration_minutes), 0) AS duration_with_consultant,
               COALESCE(SUM(s.total_paid), 0) AS spend_with_consultant
        FROM sessions s
        INNER JOIN consultants c ON s.consultant_id = c.id
        WHERE s.user_id = ? AND s.status = 'completed'
      `;
      const favParams: any[] = [user.id];
      if (month && month !== 'all' && month !== 'All') {
        favoriteQuery += ` AND SUBSTR(s.created_at, 1, 7) = ? `;
        favParams.push(String(month));
      }
      favoriteQuery += `
        GROUP BY c.id
        ORDER BY sessions_with_consultant DESC, spend_with_consultant DESC
        LIMIT 1
      `;
      const topConsultant = db.prepare(favoriteQuery).get(...favParams) as any | undefined;
      return {
        ...user,
        top_consultant: topConsultant || null
      };
    });

    res.json({
      available_months: availableMonths,
      leaderboard: richLeaderboard
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Update list of classic avatars by admin
export const updateClassicAvatarsByAdmin = (req: Request, res: Response) => {
  try {
    const { avatars } = req.body;
    if (!Array.isArray(avatars)) {
      return res.status(400).json({ error: 'Avatars must be an array of image URL strings.' });
    }
    const cleanAvatars = avatars.map(url => String(url).trim()).filter(url => url.length > 0);
    db.prepare('INSERT OR REPLACE INTO admin_settings (key, value) VALUES (?, ?)').run('classic_avatars', JSON.stringify(cleanAvatars));
    res.json({ success: true, avatars: cleanAvatars });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};




