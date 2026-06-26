import { Request, Response } from 'express';
import { db, logWalletTransaction } from '../config/database.js';

export const getAdminDashboardStats = (req: Request, res: Response) => {
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
    const consultants = db.prepare('SELECT * FROM consultants ORDER BY id DESC').all();
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

export const updateAdminCommissionRateSetting = (req: Request, res: Response) => {
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

    const placeholders = userIds.map(() => '?').join(',');

    if (category !== undefined && category !== '') {
      db.prepare(`UPDATE users SET category = ? WHERE id IN (${placeholders})`).run(category, ...userIds);
    }

    if (locked_consultant_id !== undefined) {
      const val = (locked_consultant_id === 'null' || locked_consultant_id === null || locked_consultant_id === '') ? null : parseInt(locked_consultant_id);
      db.prepare(`UPDATE users SET locked_consultant_id = ? WHERE id IN (${placeholders})`).run(val, ...userIds);
    }

    if (admin_allow_others !== undefined) {
      const val = parseInt(admin_allow_others) || 0;
      db.prepare(`UPDATE users SET admin_allow_others = ? WHERE id IN (${placeholders})`).run(val, ...userIds);
    }

    if (wallet_add_amount !== undefined && !isNaN(parseFloat(wallet_add_amount)) && parseFloat(wallet_add_amount) !== 0) {
      const addAmount = parseFloat(wallet_add_amount);
      db.prepare(`UPDATE users SET wallet_balance = wallet_balance + ? WHERE id IN (${placeholders})`).run(addAmount, ...userIds);
      
      // Log wallet transaction for each bulk-updated user
      for (const userId of userIds) {
        logWalletTransaction(
          Number(userId),
          'recharge',
          addAmount,
          `Bulk admin adjustment of ₹${addAmount.toFixed(2)}`
        );
      }
    }

    res.json({ success: true, message: `Successfully updated ${userIds.length} users in bulk.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

