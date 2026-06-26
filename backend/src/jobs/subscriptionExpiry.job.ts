import { db } from '../config/database.js';

export function startSubscriptionExpiryJob() {
  // Periodically check consultant subscription plan expiry times, and log alerts or clean up active statuses
  setInterval(() => {
    try {
      const now = new Date().toISOString();
      const expiredConsultants = db.prepare("SELECT id, username, plan_expiry FROM consultants WHERE plan_expiry IS NOT NULL AND plan_expiry < ?").all(now) as any[];
      
      for (const cons of expiredConsultants) {
        console.log(`[Subscription Engine] Consultant ${cons.username}'s plan expired at ${cons.plan_expiry}. Initiating graceful downgrade notification.`);
        // For premium listing downgrades, we can update status or log transaction details.
      }
    } catch (err) {
      console.error('Error in Subscription Expiry Job:', err);
    }
  }, 1000 * 60 * 60); // Run checks hourly
}
