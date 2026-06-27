import { Request, Response } from 'express';
import { db } from '../config/database.js';

export const createTicket = (req: Request, res: Response) => {
  try {
    const { sender_type, sender_id, sender_name, session_id, subject, message } = req.body;

    if (!sender_type || !sender_id || !sender_name || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const created_at = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_tickets (sender_type, sender_id, sender_name, session_id, subject, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'open', ?)
    `).run(sender_type, Number(sender_id), sender_name, session_id || null, subject, message, created_at);

    res.status(201).json({ success: true, message: 'Ticket raised successfully!' });
  } catch (err: any) {
    console.error('Error creating support ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

export const getTickets = (req: Request, res: Response) => {
  try {
    const { sender_type, sender_id } = req.query;

    let tickets: any[];
    if (sender_type && sender_id) {
      tickets = db.prepare('SELECT * FROM support_tickets WHERE sender_type = ? AND sender_id = ? ORDER BY id DESC')
        .all(sender_type, Number(sender_id)) as any[];
    } else {
      // Super Admin - fetch all
      tickets = db.prepare('SELECT * FROM support_tickets ORDER BY id DESC').all() as any[];
    }

    // Attach replies to each ticket
    const ticketsWithReplies = tickets.map(ticket => {
      const replies = db.prepare('SELECT * FROM support_ticket_replies WHERE ticket_id = ? ORDER BY id ASC')
        .all(ticket.id);
      return { ...ticket, replies: replies || [] };
    });

    res.json({ success: true, tickets: ticketsWithReplies });
  } catch (err: any) {
    console.error('Error getting support tickets:', err);
    res.status(500).json({ error: err.message });
  }
};

export const replyToTicket = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_reply, sender_type, sender_id, sender_name, message } = req.body;

    // Determine who is replying
    const resolvedSenderType = sender_type || 'admin';
    const resolvedSenderId = sender_id ? Number(sender_id) : 0;
    const resolvedSenderName = sender_name || 'Admin';
    const resolvedMessage = message || admin_reply;

    if (!resolvedMessage) {
      return res.status(400).json({ error: 'Reply message is required.' });
    }

    const created_at = new Date().toISOString();

    // Check if ticket is closed
    const ticket = db.prepare('SELECT status FROM support_tickets WHERE id = ?').get(Number(id)) as { status: string } | undefined;
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot reply to a closed ticket.' });
    }

    // Insert reply into support_ticket_replies
    db.prepare(`
      INSERT INTO support_ticket_replies (ticket_id, sender_type, sender_id, sender_name, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(Number(id), resolvedSenderType, resolvedSenderId, resolvedSenderName, resolvedMessage, created_at);

    // Update ticket state based on who replied
    if (resolvedSenderType === 'admin') {
      db.prepare(`
        UPDATE support_tickets 
        SET admin_reply = ?, replied_at = ?
        WHERE id = ?
      `).run(resolvedMessage, created_at, Number(id));
    } else {
      // User or Consultant replied -> set status back to 'open' (needs admin response)
      db.prepare(`
        UPDATE support_tickets 
        SET status = 'open'
        WHERE id = ?
      `).run(Number(id));
    }

    res.json({ success: true, message: 'Reply submitted successfully!' });
  } catch (err: any) {
    console.error('Error replying to ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

export const closeTicket = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.prepare("UPDATE support_tickets SET status = 'closed' WHERE id = ?").run(Number(id));
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    res.json({ success: true, message: 'Ticket closed successfully!' });
  } catch (err: any) {
    console.error('Error closing ticket:', err);
    res.status(500).json({ error: err.message });
  }
};

export const resolveTicket = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = db.prepare("UPDATE support_tickets SET status = 'resolved' WHERE id = ?").run(Number(id));
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    res.json({ success: true, message: 'Ticket resolved successfully!' });
  } catch (err: any) {
    console.error('Error resolving ticket:', err);
    res.status(500).json({ error: err.message });
  }
};
