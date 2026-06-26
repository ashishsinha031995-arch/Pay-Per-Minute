import { Request, Response } from 'express';
import { db, logWalletTransaction } from '../config/database.js';
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

export const getAdminConsultantsList = (req: Request, res: Response) => {
  try {
    const consultants = db.prepare('SELECT * FROM consultants ORDER BY id DESC').all() as any[];
    
    // Attach detailed salary calculations for each consultant
    for (const cons of consultants) {
      cons.salary_info = getSalaryCycleInfo(cons.id);
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
      JOIN consultants c ON s.consultant_id = c.id 
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
      SELECT b.id, b.user_name, b.created_at, b.consultant_id, c.display_name as consultant_name
      FROM blocked_users b
      JOIN consultants c ON b.consultant_id = c.id
      ORDER BY b.id DESC
    `).all();
    res.json(blocked);
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
      category
    } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const cleanDisplayName = (display_name || '').trim();
    if (!cleanDisplayName) {
      return res.status(400).json({ error: 'Display Name is required' });
    }

    db.prepare(`
      UPDATE users 
      SET display_name = ?, email = ?, photo_url = ?, dob = ?, gender = ?, wallet_balance = ?,
          locked_consultant_id = ?, admin_allow_others = ?, category = ?
      WHERE id = ?
    `).run(
      cleanDisplayName,
      email || null,
      photo_url || null,
      dob || null,
      gender || null,
      parseFloat(wallet_balance) || 0,
      (locked_consultant_id !== undefined && locked_consultant_id !== '' && locked_consultant_id !== null) ? parseInt(locked_consultant_id) : null,
      admin_allow_others !== undefined ? parseInt(admin_allow_others) : 0,
      category || 'General',
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
      const val = (locked_consultant_id === 'null' || locked_consultant_id === null || locked_consultant_id === '') ? null : parseInt(locked_consultant_id);
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


