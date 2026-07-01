import nodemailer from 'nodemailer';
import { db } from '../config/database.js';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const host = env.SMTP_HOST;
    const port = env.SMTP_PORT;
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;

    if (!user || !pass) {
      console.warn('[Email Helper] SMTP credentials not fully configured. Email sending will fall back to local logging.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587 or other ports
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

export async function sendEmail(toEmail: string, subject: string, body: string, html?: string) {
  try {
    const now = new Date().toISOString();
    
    // Save to local SQLite database for history/audit
    try {
      db.prepare('INSERT INTO sent_emails (to_email, subject, body, created_at) VALUES (?, ?, ?, ?)').run(toEmail, subject, body, now);
    } catch (dbErr) {
      console.error('[Email Helper] Failed to log email to sent_emails table:', dbErr);
    }

    console.log(`\n======================================================`);
    console.log(`📧 EMAIL DISPATCH SYSTEM`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log(`======================================================\n`);

    const client = getTransporter();
    if (client) {
      await client.sendMail({
        from: env.EMAIL_FROM || '"CallMint Support" <emarketingadda@gmail.com>',
        to: toEmail,
        subject,
        text: body,
        html: html || body,
      });
      console.log(`[Email Helper] Email successfully sent to ${toEmail} via SMTP.`);
    } else {
      console.log(`[Email Helper] SMTP not configured. Simulating delivery to ${toEmail}.`);
    }
  } catch (err) {
    console.error(`[Email Helper] Error sending email to ${toEmail}:`, err);
  }
}

export async function sendConsultantCredentials(email: string, name: string, username: string, password: string) {
  const appUrl = process.env.APP_URL || 'https://ais-pre-bqm225xn46njdhc7zu5jy4-250956930606.asia-east1.run.app';
  const loginUrl = `${appUrl}`; // The main page/dashboard URL where consultants can log in.

  const subject = `Welcome to CallMint! Your Consultant Credentials Inside 🚀`;

  const textBody = `
Dear ${name},

Welcome to CallMint! We are absolutely thrilled to have you join our expert network.

Your professional consultant profile has been successfully deployed and is ready to accept client connections.

Here are your login credentials to access your financial and communication command center:

- Login Portal: ${loginUrl}
- Username / Registered Email: ${username}
- Temporary Password: ${password}

Please log in to your account and complete your profile setup:
1. Update your bio, credentials, and tags so clients can find you easily.
2. Customize your availability and custom price-per-minute rate.
3. Access real-time earnings tracking, salary forecasts, and support desks.

If you have any questions or require priority setup assistance, please do not hesitate to contact our dedicated consultant support team.

Best Regards,
The CallMint Team
  `.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to CallMint</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #f8fafc;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-collapse: collapse; border-radius: 12px; overflow: hidden; margin-top: 40px; margin-bottom: 40px; border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
    
    <!-- Header -->
    <tr>
      <td align="center" style="padding: 40px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
        <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.025em;">CallMint</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600; color: #1f2937; opacity: 0.9;">Expert Consultant Command Center</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #10b981;">Welcome, ${name}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-bottom: 25px;">
          We are thrilled to have you join our premier network of elite professional consultants. Your bio page and consulting workspace have been successfully created and deployed.
        </p>

        <!-- Credentials Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; border-radius: 8px; margin-bottom: 30px; border: 1px solid #334155;">
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700;">Your Login Credentials</h3>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; width: 35%;">Username / Email:</td>
                  <td style="padding: 6px 0; color: #f8fafc; font-weight: 600; font-family: monospace; font-size: 15px;">${username}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Temporary Pass:</td>
                  <td style="padding: 6px 0; color: #f59e0b; font-weight: 600; font-family: monospace; font-size: 15px;">${password}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Call To Action Button -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 14px 30px; background-color: #10b981; color: #0f172a; font-weight: 800; font-size: 14px; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.05em; transition: background-color 0.2s ease;">
                Access Your Dashboard
              </a>
            </td>
          </tr>
        </table>

        <hr style="border: 0; border-top: 1px solid #334155; margin-bottom: 30px;">

        <!-- Tips Section -->
        <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Getting Started Checklist:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          <li style="margin-bottom: 8px;"><strong>Complete Profile Details:</strong> Upload your professional photo, select specific expertise tags, and describe your credentials.</li>
          <li style="margin-bottom: 8px;"><strong>Set Rates:</strong> Configure your desired pay-per-minute pricing dynamically from your settings.</li>
          <li style="margin-bottom: 8px;"><strong>Define Schedule:</strong> Keep your availability toggle on when you are online and ready to consulting.</li>
          <li style="margin-bottom: 8px;"><strong>Track Finances:</strong> View real-time accrued consultation fees and check upcoming salary cycle cutoff forecasts.</li>
        </ul>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 20px 30px; background-color: #0f172a; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5;">
        <p style="margin: 0 0 8px 0;">This is an automated system dispatch containing secure account credentials. Please do not reply directly to this email.</p>
        <p style="margin: 0;">&copy; 2026 CallMint Inc. All rights reserved. Secured with state-of-the-art Razorpay-verified registrations.</p>
      </td>
    </tr>

  </table>
</body>
</html>
  `.trim();

  await sendEmail(email, subject, textBody, htmlBody);
}
