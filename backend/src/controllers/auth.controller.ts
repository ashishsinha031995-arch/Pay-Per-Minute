import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database.js';
import { sendEmail, sendConsultantCredentials } from '../helpers/email.helper.js';
import { getRazorpayClient, getRazorpayErrorMessage, getCleanRazorpayKeyId, getResponseRazorpayKeyId, getCleanRazorpayKeySecret } from '../services/payment.service.js';

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
      const existingEmailInUsers = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
      const existingEmailInConsultants = db.prepare('SELECT id FROM consultants WHERE LOWER(email) = ?').get(cleanEmail);
      if (existingEmailInUsers || existingEmailInConsultants) {
        return res.status(400).json({ error: 'Yeh email address pehle se hi registered hai hamare system me. (This email is already registered in our system.)' });
      }
    }

    if (cleanPhone) {
      const existingPhoneInUsers = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
      const existingPhoneInConsultants = db.prepare('SELECT id FROM consultants WHERE phone = ?').get(cleanPhone);
      if (existingPhoneInUsers || existingPhoneInConsultants) {
        return res.status(400).json({ error: 'Yeh phone number pehle se hi registered hai, kripya login karein ya dusra number use karein. (This phone number is already registered.)' });
      }
    }

    const finalGender = (gender || 'Male').trim();
    const defaultGirlAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150';
    const defaultBoyAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
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
    const cleanPassword = password.trim();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(loginCredential, loginCredential) as any;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Check spelling or sign up!' });
    }
    if (user.password !== cleanPassword) {
      return res.status(400).json({ error: 'Incorrect password.' });
    }
    if (user.is_blocked === 1) {
      return res.status(403).json({ error: 'Aapka account block kar diya gaya hai admin dwara. (Your account has been blocked by the admin.)' });
    }

    let updatedUser = user;
    if (!user.photo_url) {
      const finalGender = (user.gender || 'Male').trim();
      const defaultPhotoUrl = finalGender.toLowerCase() === 'female' 
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' 
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
      db.prepare('UPDATE users SET photo_url = ?, gender = ? WHERE id = ?').run(defaultPhotoUrl, finalGender, user.id);
      updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }

    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const forgotPasswordCodes = new Map<string, { code: string, expiresAt: number, email: string, role: 'user' | 'consultant' }>();

export const forgotPasswordSendCode = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role (user or consultant) are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role.trim().toLowerCase();

    if (cleanRole !== 'user' && cleanRole !== 'consultant') {
      return res.status(400).json({ error: 'Invalid role. Must be user or consultant.' });
    }

    let record: any = null;
    if (cleanRole === 'consultant') {
      record = db.prepare('SELECT id, display_name FROM consultants WHERE LOWER(email) = ?').get(cleanEmail);
    } else {
      record = db.prepare('SELECT id, display_name FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    }

    if (!record) {
      return res.status(404).json({ error: 'Yeh email address registered nahi hai hamare system me. (This email is not registered in our system.)' });
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

    const key = `${cleanRole}:${cleanEmail}`;
    forgotPasswordCodes.set(key, { code, expiresAt, email: cleanEmail, role: cleanRole as 'user' | 'consultant' });

    // Send the email
    const subject = `Your Password Reset Verification Code - CallMint 🔐`;
    const textBody = `
Dear ${record.display_name || 'User'},

We received a request to reset your password on CallMint.

Your verification code is: ${code}

This code is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.

Best Regards,
The CallMint Team
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', sans-serif; color: #f8fafc;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155;">
    <tr>
      <td align="center" style="padding: 30px 20px; background-color: #10b981; border-top-left-radius: 11px; border-top-right-radius: 11px;">
        <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-weight: 800;">CallMint Password Reset</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 20px;">
        <p style="font-size: 16px; color: #cbd5e1;">Hello ${record.display_name || 'User'},</p>
        <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">We received a request to reset your account password. Use the verification code below to generate a new password:</p>
        <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 1px solid #334155;">
          <span style="font-size: 32px; font-weight: 800; color: #10b981; letter-spacing: 4px; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">This code is valid for <strong>10 minutes</strong>. If you did not make this request, please secure your account immediately or contact support.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 15px 20px; background-color: #0f172a; border-bottom-left-radius: 11px; border-bottom-right-radius: 11px; font-size: 12px; color: #64748b; text-align: center;">
        &copy; 2026 CallMint Inc. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    await sendEmail(cleanEmail, subject, textBody, htmlBody);

    res.json({ success: true, message: 'Verification code has been sent to your registered email.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const forgotPasswordVerifyAndReset = async (req: Request, res: Response) => {
  try {
    const { email, role, code, new_password } = req.body;
    if (!email || !role || !code || !new_password) {
      return res.status(400).json({ error: 'All fields are required (email, role, verification code, and new password)' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role.trim().toLowerCase();
    const cleanCode = code.trim();

    if (cleanRole !== 'user' && cleanRole !== 'consultant') {
      return res.status(400).json({ error: 'Invalid role. Must be user or consultant.' });
    }

    const key = `${cleanRole}:${cleanEmail}`;
    let record = forgotPasswordCodes.get(key);
    let foundKey = key;

    if (!record) {
      // Fallback: search by email to see if any role has requested a code
      for (const [mapKey, val] of forgotPasswordCodes.entries()) {
        if (val.email === cleanEmail) {
          record = val;
          foundKey = mapKey;
          break;
        }
      }
    }

    if (!record) {
      return res.status(400).json({ error: 'No verification code found for this email address. Please request a new code first.' });
    }

    if (record.code !== cleanCode) {
      return res.status(400).json({ error: 'Incorrect verification code. Please check again.' });
    }

    if (Date.now() > record.expiresAt) {
      forgotPasswordCodes.delete(foundKey);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Success! Update password using the correct role for this account
    const targetRole = record.role || cleanRole;
    if (targetRole === 'consultant') {
      db.prepare('UPDATE consultants SET password = ? WHERE LOWER(email) = ?').run(new_password, cleanEmail);
    } else {
      db.prepare('UPDATE users SET password = ? WHERE LOWER(email) = ?').run(new_password, cleanEmail);
    }

    // Fetch user/consultant details for the email response
    let displayName = 'User';
    if (targetRole === 'consultant') {
      const c = db.prepare('SELECT display_name FROM consultants WHERE LOWER(email) = ?').get(cleanEmail) as any;
      if (c) displayName = c.display_name;
    } else {
      const u = db.prepare('SELECT display_name FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
      if (u) displayName = u.display_name;
    }

    // Clear code from map
    forgotPasswordCodes.delete(foundKey);

    // Send confirmation email with the new password
    const subject = `Your CallMint Password Has Been Reset Successfully ✅`;
    const textBody = `
Dear ${displayName},

Your password for CallMint (${cleanRole === 'consultant' ? 'Consultant' : 'User'} Account) has been successfully reset.

Here are your updated account details:
- Registered Email: ${cleanEmail}
- New Password: ${new_password}

For security reasons, we recommend keeping this password confidential and not sharing it with anyone.

Best Regards,
The CallMint Team
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', sans-serif; color: #f8fafc;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155;">
    <tr>
      <td align="center" style="padding: 30px 20px; background-color: #10b981; border-top-left-radius: 11px; border-top-right-radius: 11px;">
        <h1 style="margin: 0; font-size: 24px; color: #0f172a; font-weight: 800;">Password Reset Successful</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 20px;">
        <p style="font-size: 16px; color: #cbd5e1;">Hello ${displayName || 'User'},</p>
        <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6;">Your CallMint password has been successfully updated. Here are your account details:</p>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border-radius: 8px; margin: 20px 0; border: 1px solid #334155; font-size: 14px;">
          <tr>
            <td style="padding: 15px; color: #cbd5e1;">
              <strong>Account Type:</strong> ${cleanRole === 'consultant' ? 'Consultant' : 'User'}<br/>
              <strong>Registered Email:</strong> ${cleanEmail}<br/>
              <strong>New Password:</strong> <span style="font-family: monospace; color: #f59e0b; font-weight: bold; font-size: 15px;">${new_password}</span>
            </td>
          </tr>
        </table>
        
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">You can now log in using these credentials. If you did not make this change, please contact CallMint Support immediately.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 15px 20px; background-color: #0f172a; border-bottom-left-radius: 11px; border-bottom-right-radius: 11px; font-size: 12px; color: #64748b; text-align: center;">
        &copy; 2026 CallMint Inc. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    await sendEmail(cleanEmail, subject, textBody, htmlBody);

    res.json({ success: true, message: 'Password reset successfully! New password has been sent to your email.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const userForgotPassword = (req: Request, res: Response) => {
  // Legacy handler fallback
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
    const cleanPassword = password.trim();
    const consultant = db.prepare('SELECT * FROM consultants WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND password = ?').get(loginCredential, loginCredential, cleanPassword) as any;
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
    let { 
      plan_id, 
      display_name, 
      initial_price_per_minute, 
      category, 
      email, 
      phone,
      order_id,
      payment_id,
      signature,
      is_mock,
      username
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
    const existingUserEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existingConsultantEmail || existingUserEmail) {
      return res.status(400).json({ error: 'Yeh email address pehle se hi registered hai hamare system me. (This email is already registered in our system.)' });
    }

    const cleanPhone = phone.trim();
    const existingConsultantPhone = db.prepare('SELECT id FROM consultants WHERE phone = ?').get(cleanPhone);
    const existingUserPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone);
    if (existingConsultantPhone || existingUserPhone) {
      return res.status(400).json({ error: 'Yeh phone number pehle se hi registered hai hamare system me. (This phone number is already registered in our system.)' });
    }

    let finalUsername = username ? username.trim().toLowerCase() : '';
    if (finalUsername) {
      const existingWithUsername = db.prepare('SELECT id FROM consultants WHERE LOWER(username) = ?').get(finalUsername);
      if (existingWithUsername) {
        return res.status(400).json({ error: 'This username is already taken. Please choose another username.' });
      }
    } else {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      finalUsername = `expert_${display_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${randomSuffix}`;
    }

    let plan: any = null;
    let price = 15.0;
    const rawRegisterPrice = initial_price_per_minute !== undefined ? initial_price_per_minute : req.body.price_per_minute;
    if (rawRegisterPrice !== undefined && rawRegisterPrice !== null && rawRegisterPrice !== '') {
      const parsed = parseFloat(rawRegisterPrice.toString());
      if (!isNaN(parsed)) {
        if (parsed < 5) {
          return res.status(400).json({ error: 'Minimum consultation fee limit is ₹5/min. Isse below price set nahi ho sakta.' });
        }
        price = parsed;
      }
    }
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
            .createHmac('sha256', getCleanRazorpayKeySecret()!)
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

    const password = Math.random().toString(36).slice(-8);

    const defaultPhoto = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300`;
    const catValue = category || 'Consultants';

    const result = db.prepare(`
      INSERT INTO consultants (
        username, email, phone, password, display_name, photo_url, bio, price_per_minute, 
        is_online, is_busy, is_active, plan_expiry, category, plan_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finalUsername,
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
    sendConsultantCredentials(cleanEmail, display_name, finalUsername, password).catch(err => {
      console.error('[Auth Controller] Error during background sendConsultantCredentials:', err);
    });

    res.json({
      success: true,
      username: finalUsername,
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
    const existingConsultantEmail = db.prepare('SELECT id FROM consultants WHERE LOWER(email) = ?').get(cleanEmail) as any;
    const existingUserEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
    
    const consultantIdParam = req.body.consultant_id;
    const isCurrentConsultantEmail = existingConsultantEmail && consultantIdParam && existingConsultantEmail.id === Number(consultantIdParam);

    if ((existingConsultantEmail && !isCurrentConsultantEmail) || existingUserEmail) {
      return res.status(400).json({ error: 'Yeh email address pehle se hi registered hai hamare system me. (This email is already registered in our system.)' });
    }

    if (phone) {
      const cleanPhone = phone.trim();
      const existingConsultantPhone = db.prepare('SELECT id FROM consultants WHERE phone = ?').get(cleanPhone) as any;
      const existingUserPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(cleanPhone) as any;
      const isCurrentConsultantPhone = existingConsultantPhone && consultantIdParam && existingConsultantPhone.id === Number(consultantIdParam);

      if ((existingConsultantPhone && !isCurrentConsultantPhone) || existingUserPhone) {
        return res.status(400).json({ error: 'Yeh phone number pehle se hi registered hai hamare system me. (This phone number is already registered in our system.)' });
      }
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

    if (!razorpayClient) {
      return res.status(400).json({ error: 'Razorpay keys are missing or invalid in backend configuration. Please ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured correctly in your environment.' });
    }

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
        key_id: getResponseRazorpayKeyId(false),
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        total_paid: totalPaid,
        base_price: basePrice,
        gst_amount: gstAmount,
        gst_rate: gstRate,
      });
    } catch (err: any) {
      console.error('[Registration] Razorpay registration order creation failed:', err);
      const errMsg = getRazorpayErrorMessage(err);
      return res.status(400).json({ error: `Razorpay registration order creation failed: ${errMsg}` });
    }
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
      is_mock,
      username,
      display_name,
      category,
      price_per_minute
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

    const cleanUsername = username ? username.trim().toLowerCase() : '';
    if (cleanUsername && cleanUsername !== consultant.username.toLowerCase()) {
      const existingWithUsername = db.prepare('SELECT id FROM consultants WHERE LOWER(username) = ? AND id != ?').get(cleanUsername, consultant_id);
      if (existingWithUsername) {
        return res.status(400).json({ error: 'This username is already taken. Please choose another username.' });
      }
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
          .createHmac('sha256', getCleanRazorpayKeySecret()!)
          .update(text)
          .digest('hex');

        if (generated_signature !== signature) {
          return res.status(400).json({ error: 'Payment signature verification failed. Transaction is invalid.' });
        }
      }
    }

    const newPassword = consultant.password || Math.random().toString(36).slice(-8);
    const updatedUsername = cleanUsername || consultant.username;
    const updatedDisplayName = display_name ? display_name.trim() : consultant.display_name;
    const updatedCategory = category || consultant.category || 'Consultants';
    let updatedPrice = consultant.price_per_minute || 15.0;
    const rawPrice = price_per_minute !== undefined ? price_per_minute : (req.body.initial_price_per_minute !== undefined ? req.body.initial_price_per_minute : undefined);
    if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
      const parsed = parseFloat(rawPrice.toString());
      if (!isNaN(parsed)) {
        if (parsed < 5) {
          return res.status(400).json({ error: 'Minimum consultation fee limit is ₹5/min. Isse below price set nahi ho sakta.' });
        }
        updatedPrice = parsed;
      }
    }

    if (plan.max_consultant_rate !== undefined && updatedPrice > plan.max_consultant_rate) {
      return res.status(400).json({ error: `Selected plan "${plan.name}" ke mutabik, maximum call rate ₹${plan.max_consultant_rate}/minute hi allow hai. Please select a lower rate.` });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration_days);

    db.prepare(`
      UPDATE consultants 
      SET plan_id = ?, 
          plan_expiry = ?, 
          is_active = 1,
          username = ?,
          password = ?,
          display_name = ?,
          category = ?,
          price_per_minute = ?
      WHERE id = ?
    `).run(
      plan.id, 
      expiryDate.toISOString(), 
      updatedUsername,
      newPassword,
      updatedDisplayName,
      updatedCategory,
      updatedPrice,
      consultant_id
    );

    // Log the plan purchase and rate update to audit_logs!
    const logId = 'AUD-' + Math.floor(100000 + Math.random() * 900000);
    const timestamp = new Date().toISOString();
    const details = `Consultant ${updatedDisplayName} (#${consultant_id}) subscribed to plan "${plan.name}". Rate configured at ₹${updatedPrice}/minute (Max plan allowance: ₹${plan.max_consultant_rate || 1000}/minute)`;
    try {
      db.prepare(`
        INSERT INTO audit_logs (id, timestamp, actor, role, action, details, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(logId, timestamp, updatedDisplayName, 'Consultant', 'Plan Subscription', details, 'Success');
    } catch (logErr) {
      console.error('Failed to write subscription audit log:', logErr);
    }

    // Send the professional credentials email asynchronously
    sendConsultantCredentials(consultant.email, updatedDisplayName, updatedUsername, newPassword).catch(err => {
      console.error('[Auth Controller] Error during background sendConsultantCredentials on buy-plan:', err);
    });

    // Fetch the updated consultant info to return
    const updatedConsultant = db.prepare('SELECT * FROM consultants WHERE id = ?').get(consultant_id);

    res.json({
      success: true,
      message: 'Subscription plan activated successfully.',
      consultant: updatedConsultant,
      credentials: {
        username: updatedUsername,
        password: newPassword,
        displayName: updatedDisplayName
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
