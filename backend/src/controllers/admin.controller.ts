import { Request, Response } from 'express';
import { db } from '../config/database.js';

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
