import { db } from '../config/database.js';

export function startSubscriptionExpiryJob() {
  // Periodically check consultant subscription plan expiry times, and log alerts or clean up active statuses
  setInterval(() => {
    try {
      const now = new Date().toISOString();
      const expiredConsultants = db.prepare("SELECT id, username, plan_expiry FROM consultants WHERE plan_expiry IS NOT NULL AND plan_expiry < ?").all(now) as any[];
      
      if (expiredConsultants.length > 0) {
        // Get the default free plan (the cheapest plan)
        const defaultPlan = db.prepare("SELECT id FROM plans ORDER BY price ASC LIMIT 1").get() as { id: number } | undefined;
        
        if (defaultPlan) {
          for (const cons of expiredConsultants) {
            console.log(`[Subscription Engine] Consultant ${cons.username}'s plan expired at ${cons.plan_expiry}. Downgrading to starter free plan ID: ${defaultPlan.id}.`);
            
            // Execute actual downgrade in database
            db.prepare("UPDATE consultants SET plan_id = ?, plan_expiry = NULL WHERE id = ?").run(defaultPlan.id, cons.id);
          }
        }
      }
    } catch (err) {
      console.error('Error in Subscription Expiry Job:', err);
    }
  }, 1000 * 60 * 60); // Run checks hourly
}
