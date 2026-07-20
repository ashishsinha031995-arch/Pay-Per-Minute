import webpush from 'web-push';
import { db } from '../config/database.js';

let vapidKeysInitialized = false;

export function initializeVapidKeys() {
  if (vapidKeysInitialized) return;

  // 1. Check if VAPID keys exist in environment variables
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;

  // 2. If not in env, check in database admin_settings
  if (!publicKey || !privateKey) {
    try {
      const dbPubKey = db.prepare("SELECT value FROM admin_settings WHERE key = 'vapid_public_key'").get() as { value: string } | undefined;
      const dbPrivKey = db.prepare("SELECT value FROM admin_settings WHERE key = 'vapid_private_key'").get() as { value: string } | undefined;

      if (dbPubKey && dbPrivKey) {
        publicKey = dbPubKey.value;
        privateKey = dbPrivKey.value;
      }
    } catch (err) {
      console.error('[Push Helper] Error reading VAPID keys from database:', err);
    }
  }

  // 3. If still not found, generate new VAPID keys and save them to the database
  if (!publicKey || !privateKey) {
    console.log('[Push Helper] VAPID keys not found. Generating a new key pair...');
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;

    try {
      db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('vapid_public_key', ?)").run(publicKey);
      db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('vapid_private_key', ?)").run(privateKey);
      console.log('[Push Helper] Successfully generated and stored new persistent VAPID keys.');
    } catch (err) {
      console.error('[Push Helper] Error saving newly generated VAPID keys to database:', err);
    }
  }

  // 4. Configure web-push with the keys
  webpush.setVapidDetails(
    'mailto:support@callmint.com', // fallback contact email
    publicKey,
    privateKey
  );

  vapidKeysInitialized = true;
  console.log('[Push Helper] Web Push VAPID keys successfully initialized.');
}

export function getVapidPublicKey(): string {
  initializeVapidKeys();
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (publicKey) return publicKey;

  const dbPubKey = db.prepare("SELECT value FROM admin_settings WHERE key = 'vapid_public_key'").get() as { value: string } | undefined;
  return dbPubKey?.value || '';
}

export async function sendWebPushNotification(consultantId: number, payload: any) {
  initializeVapidKeys();

  try {
    // Find all active subscriptions for this consultant
    const subscriptions = db.prepare("SELECT id, subscription_json FROM push_subscriptions WHERE consultant_id = ?").all(consultantId) as any[];
    
    if (subscriptions.length === 0) {
      console.log(`[Push Helper] No active web push subscriptions found for consultant ${consultantId}`);
      return;
    }

    console.log(`[Push Helper] Sending Web Push Notification to ${subscriptions.length} subscription(s) for consultant ${consultantId}`);

    const payloadString = JSON.stringify(payload);

    for (const subRow of subscriptions) {
      try {
        const subscription = JSON.parse(subRow.subscription_json);
        await webpush.sendNotification(subscription, payloadString);
        console.log(`[Push Helper] Sent push notification successfully to sub ID ${subRow.id}`);
      } catch (err: any) {
        console.error(`[Push Helper] Failed to send push to subscription ID ${subRow.id}:`, err);
        
        // If the subscription is expired or no longer valid (status 4xx), delete it from database
        if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
          console.log(`[Push Helper] Subscription ${subRow.id} is invalid or expired (status ${err.statusCode}). Deleting from database.`);
          db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(subRow.id);
        }
      }
    }
  } catch (err) {
    console.error('[Push Helper] Error fetching subscriptions or sending notifications:', err);
  }
}
