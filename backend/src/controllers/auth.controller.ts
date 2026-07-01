import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database.js';
import { sendEmail, sendConsultantCredentials } from '../helpers/email.helper.js';
import { getRazorpayClient, getRazorpayErrorMessage, getCleanRazorpayKeyId } from '../services/payment.service.js';

export const userSignUp = (req: Request, res: Response) => {
  try {
    const { username, email, password, display_name, gender, phone } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'Username, password and display name are required' });
    }
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPhone = phone ? phone.trim() : null;
    
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

    const finalGender = (gender || 'Male').trim();
    const defaultGirlAvatar = 'https://i.giphy.com/OdG9tyVfD9NPM.gif';
    const defaultBoyAvatar = 'https://i.giphy.com/W7Xq86ali939u.gif';
    const defaultPhotoUrl = finalGender.toLowerCase() === 'female' ? defaultGirlAvatar : defaultBoyAvatar;

    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, display_name, wallet_balance, lifetime_recharge, is_blocked, gender, photo_url, phone)
      VALUES (?, ?, ?, ?, 0.0, 0.0, 0, ?, ?, ?)
    `);
    const result = stmt.run(cleanUsername, cleanEmail, password, display_name.trim(), finalGender, defaultPhotoUrl, cleanPhone);
    
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

    let updatedUser = user;
    if (!user.photo_url) {
      const finalGender = (user.gender || 'Male').trim();
      const defaultPhotoUrl = finalGender.toLowerCase() === 'female' ? 'https://i.giphy.com/OdG9tyVfD9NPM.gif' : 'https://i.giphy.com/W7Xq86ali939u.gif';
      db.prepare('UPDATE users SET photo_url = ?, gender = ? WHERE id = ?').run(defaultPhotoUrl, finalGender, user.id);
      updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    res.json({ success: true, user: updatedUser });
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
    const { 
      plan_id, 
      display_name, 
      initial_price_per_minute, 
      category, 
      email, 
      phone,
      order_id,
      payment_id,
      signature,
      is_mock
    } = req.body;

    if (!display_name) {
      return res.status(400).json({ error: 'Display Name is required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email address is required so login credentials can be sent to you.' });
    }
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingConsultantEmail = db.prepare('SELECT id FROM consultants WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingConsultantEmail) {
      return res.status(400).json({ error: 'This email is already registered as a consultant. Please choose another.' });
    }

    let plan: any = null;
    let price = initial_price_per_minute ? parseFloat(initial_price_per_minute) : 15.0;
    let expiryDate: Date | null = null;

    if (plan_id) {
      plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
      if (!plan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }

      if (plan.max_consultant_rate !== undefined && price > plan.max_consultant_rate) {
        return res.status(400).json({ error: `Selected plan "${plan.name}" ke mutabik, maximum call rate ₹${plan.max_consultant_rate}/minute hi allow hai. Please select a lower rate.` });
      }

      // Razorpay checkout verification for paid plans
      const basePrice = parseFloat(plan.price);
      if (basePrice > 0) {
        const razorpayClient = getRazorpayClient();
        if (!is_mock && razorpayClient) {
          if (!order_id || !payment_id || !signature) {
            return res.status(400).json({ error: 'Payment verification details are missing for this subscription plan.' });
          }
          const text = order_id + "|" + payment_id;
          const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(text)
            .digest('hex');

          if (generated_signature !== signature) {
            return res.status(400).json({ error: 'Payment signature verification failed. Transaction is invalid.' });
          }
        }
      }

      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.duration_days);
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `expert_${display_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${randomSuffix}`;
    const password = Math.random().toString(36).slice(-8);

    const defaultPhoto = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300`;
    const catValue = category || 'Consultants';

    const result = db.prepare(`
      INSERT INTO consultants (
        username, email, phone, password, display_name, photo_url, bio, price_per_minute, 
        is_online, is_busy, is_active, plan_expiry, category, plan_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,
      cleanEmail,
      phone.trim(),
      password,
      display_name,
      defaultPhoto,
      `Hello! I am ${display_name}, a seasoned professional. Let's start mapping your growth paths together.`,
      price,
      1, // online
      0, // not busy
      1, // active
      expiryDate ? expiryDate.toISOString() : null,
      catValue,
      plan ? plan.id : null
    );

    // Dispatch credentials email asynchronously using the professional Gmail dispatch system
    sendConsultantCredentials(cleanEmail, display_name, username, password).catch(err => {
      console.error('[Auth Controller] Error during background sendConsultantCredentials:', err);
    });

    res.json({
      success: true,
      username,
      password,
      display_name,
      email: cleanEmail,
      phone: phone.trim(),
      plan_name: plan ? plan.name : null,
      plan_expiry: expiryDate ? expiryDate.toLocaleDateString() : null,
      consultant_id: result.lastInsertRowid,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const consultantRegisterCreateOrder = async (req: Request, res: Response) => {
  try {
    const { plan_id, email, phone } = req.body;
    if (!plan_id) {
      return res.status(400).json({ error: 'Subscription plan ID is required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingConsultantEmail = db.prepare('SELECT id FROM consultants WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingConsultantEmail) {
      return res.status(400).json({ error: 'This email is already registered as a consultant. Please choose another or login.' });
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const basePrice = parseFloat(plan.price);
    if (basePrice === 0) {
      return res.json({
        success: true,
        is_free: true,
        total_paid: 0,
      });
    }

    const gstRate = 18.0;
    const gstAmount = parseFloat((basePrice * 0.18).toFixed(2));
    const totalPaid = parseFloat((basePrice + gstAmount).toFixed(2));
    const amount_in_paise = Math.round(totalPaid * 100);

    const razorpayClient = getRazorpayClient();

    if (razorpayClient) {
      try {
        const order = await razorpayClient.orders.create({
          amount: amount_in_paise,
          currency: 'INR',
          receipt: `receipt_sub_${Date.now()}`,
          notes: {
            plan_id: plan_id.toString(),
            plan_name: plan.name,
            total_paid: totalPaid.toString(),
          },
        });

        return res.json({
          success: true,
          is_free: false,
          is_mock: false,
          key_id: getCleanRazorpayKeyId(),
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          total_paid: totalPaid,
          base_price: basePrice,
          gst_amount: gstAmount,
          gst_rate: gstRate,
        });
      } catch (err: any) {
        console.log('[Registration] Initializing sandbox fallback checkout.');
      }
    }

    // Fallback Mock Order
    const mock_order_id = `order_sub_mock_${Math.random().toString(36).slice(2, 11)}`;
    res.json({
      success: true,
      is_free: false,
      is_mock: true,
      key_id: getCleanRazorpayKeyId() || 'rzp_test_U5XqYtZ1w2v3u4',
      order_id: mock_order_id,
      amount: amount_in_paise,
      currency: 'INR',
      total_paid: totalPaid,
      base_price: basePrice,
      gst_amount: gstAmount,
      gst_rate: gstRate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const consultantBuyPlan = async (req: Request, res: Response) => {
  try {
    const { 
      consultant_id,
      plan_id, 
      order_id,
      payment_id,
      signature,
      is_mock
    } = req.body;

    if (!consultant_id || !plan_id) {
      return res.status(400).json({ error: 'Consultant ID and Plan ID are required.' });
    }

    const consultant = db.prepare('SELECT * FROM consultants WHERE id = ?').get(consultant_id) as any;
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found.' });
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan_id) as any;
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }

    // Razorpay checkout verification for paid plans
    const basePrice = parseFloat(plan.price);
    if (basePrice > 0) {
      const razorpayClient = getRazorpayClient();
      if (!is_mock && razorpayClient) {
        if (!order_id || !payment_id || !signature) {
          return res.status(400).json({ error: 'Payment verification details are missing for this subscription plan.' });
        }
        const text = order_id + "|" + payment_id;
        const generated_signature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
          .update(text)
          .digest('hex');

        if (generated_signature !== signature) {
          return res.status(400).json({ error: 'Payment signature verification failed. Transaction is invalid.' });
        }
      }
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration_days);

    db.prepare(`
      UPDATE consultants 
      SET plan_id = ?, plan_expiry = ?, is_active = 1
      WHERE id = ?
    `).run(plan.id, expiryDate.toISOString(), consultant_id);

    // Fetch the updated consultant info to return
    const updatedConsultant = db.prepare('SELECT * FROM consultants WHERE id = ?').get(consultant_id);

    res.json({
      success: true,
      message: 'Subscription plan activated successfully.',
      consultant: updatedConsultant,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
