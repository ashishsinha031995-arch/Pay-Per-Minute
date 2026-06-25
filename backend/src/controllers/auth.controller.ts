import { Request, Response } from 'express';
import { db } from '../config/database.js';
import { sendEmail } from '../helpers/email.helper.js';

export const userSignUp = (req: Request, res: Response) => {
  try {
    const { username, email, password, display_name } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'Username, password and display name are required' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    
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
    
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const userLogin = (req: Request, res: Response) => {
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
};

export const userForgotPassword = (req: Request, res: Response) => {
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
};

export const consultantLogin = (req: Request, res: Response) => {
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
};

export const consultantRegister = (req: Request, res: Response) => {
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

    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `expert_${display_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${randomSuffix}`;
    const password = Math.random().toString(36).slice(-8);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration_days);

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
};
