import { Request, Response } from 'express';
import { db } from '../config/database.js';

// --- ADMIN ENDPOINTS ---

// Get all notifications (Admin panel)
export const getAdminNotifications = (req: Request, res: Response) => {
  try {
    const notifications = db.prepare("SELECT * FROM admin_notifications ORDER BY created_at DESC").all();
    res.json({ success: true, notifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin notifications' });
  }
};

// Create a new notification (Admin panel)
export const createAdminNotification = (req: Request, res: Response) => {
  try {
    const { title, message, target_type } = req.body;

    if (!title || !message || !target_type) {
      return res.status(400).json({ error: 'Title, message, and target_type are required' });
    }

    if (!['user', 'consultant', 'both'].includes(target_type)) {
      return res.status(400).json({ error: 'Invalid target_type. Must be "user", "consultant", or "both"' });
    }

    const created_at = new Date().toISOString();

    db.prepare(`
      INSERT INTO admin_notifications (title, message, target_type, status, created_at)
      VALUES (?, ?, ?, 'active', ?)
    `).run(title, message, target_type, created_at);

    res.status(201).json({ success: true, message: 'Notification created and sent successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create notification' });
  }
};

// Toggle status of a notification (active/inactive)
export const toggleNotificationStatus = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notification = db.prepare("SELECT status FROM admin_notifications WHERE id = ?").get(Number(id)) as any;

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const newStatus = notification.status === 'active' ? 'inactive' : 'active';
    db.prepare("UPDATE admin_notifications SET status = ? WHERE id = ?").run(newStatus, Number(id));

    res.json({ success: true, message: `Notification status changed to ${newStatus}`, newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to toggle status' });
  }
};

// Delete a notification
export const deleteAdminNotification = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.prepare("DELETE FROM admin_notifications WHERE id = ?").run(Number(id));

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete notification' });
  }
};


// --- USER / CONSULTANT CLIENT ENDPOINTS ---

// Get active notifications matching target type ('user' or 'consultant')
// and append whether they are read or unread for the given user_id
export const getClientNotifications = (req: Request, res: Response) => {
  try {
    const { user_type, user_id } = req.query;

    if (!user_type || !user_id) {
      return res.status(400).json({ error: 'user_type and user_id query parameters are required' });
    }

    if (!['user', 'consultant'].includes(user_type as string)) {
      return res.status(400).json({ error: 'user_type must be "user" or "consultant"' });
    }

    // Fetch active notifications targeted at either this user_type or 'both'
    const notifications = db.prepare(`
      SELECT n.*, 
             CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as is_read
      FROM admin_notifications n
      LEFT JOIN notification_reads r 
        ON n.id = r.notification_id 
        AND r.user_id = ? 
        AND r.user_type = ?
      WHERE n.status = 'active' AND (n.target_type = ? OR n.target_type = 'both')
      ORDER BY n.created_at DESC
    `).all(Number(user_id), user_type, user_type) as any[];

    // Parse is_read as boolean
    const processed = notifications.map(n => ({
      ...n,
      is_read: n.is_read === 1
    }));

    res.json({ success: true, notifications: processed });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
};

// Mark a notification as read
export const markNotificationAsRead = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_type, user_id } = req.body;

    if (!user_type || !user_id) {
      return res.status(400).json({ error: 'user_type and user_id are required in request body' });
    }

    // Check if read receipt already exists
    const existing = db.prepare(`
      SELECT id FROM notification_reads 
      WHERE notification_id = ? AND user_id = ? AND user_type = ?
    `).get(Number(id), Number(user_id), user_type);

    if (!existing) {
      const read_at = new Date().toISOString();
      db.prepare(`
        INSERT INTO notification_reads (notification_id, user_id, user_type, read_at)
        VALUES (?, ?, ?, ?)
      `).run(Number(id), Number(user_id), user_type, read_at);
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read for a client
export const markAllNotificationsAsRead = (req: Request, res: Response) => {
  try {
    const { user_type, user_id } = req.body;

    if (!user_type || !user_id) {
      return res.status(400).json({ error: 'user_type and user_id are required in request body' });
    }

    // Find all active notifications for this client type that aren't read yet
    const unreadNotifications = db.prepare(`
      SELECT n.id 
      FROM admin_notifications n
      LEFT JOIN notification_reads r 
        ON n.id = r.notification_id 
        AND r.user_id = ? 
        AND r.user_type = ?
      WHERE n.status = 'active' 
        AND (n.target_type = ? OR n.target_type = 'both')
        AND r.id IS NULL
    `).all(Number(user_id), user_type, user_type) as any[];

    const read_at = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO notification_reads (notification_id, user_id, user_type, read_at)
      VALUES (?, ?, ?, ?)
    `);

    // Insert read receipts for all unread notifications
    for (const item of unreadNotifications) {
      insertStmt.run(item.id, Number(user_id), user_type, read_at);
    }

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to mark all notifications as read' });
  }
};
