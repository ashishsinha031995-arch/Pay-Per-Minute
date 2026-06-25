import { db } from './db.js';

export function sendEmail(toEmail: string, subject: string, body: string) {
  try {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO sent_emails (to_email, subject, body, created_at) VALUES (?, ?, ?, ?)').run(toEmail, subject, body, now);
    console.log(`\n======================================================`);
    console.log(`📧 EMAIL DISPATCH SIMULATOR`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Failed to log sent email:', err);
  }
}
