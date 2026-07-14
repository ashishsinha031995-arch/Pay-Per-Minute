import { Router, Request, Response } from 'express';
import { db } from '../config/database.js';
import { getVapidPublicKey } from '../helpers/push.helper.js';

const router = Router();

router.get('/push/vapid-public-key', (req: Request, res: Response) => {
  try {
    const key = getVapidPublicKey();
    res.json({ publicKey: key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/push/subscribe', (req: Request, res: Response) => {
  try {
    const { consultant_id, subscription } = req.body;
    if (!consultant_id || !subscription) {
      return res.status(400).json({ error: 'Missing consultant_id or subscription object' });
    }

    const subString = JSON.stringify(subscription);

    // Check if the exact subscription already exists for this consultant to avoid duplicates
    const existing = db.prepare("SELECT id FROM push_subscriptions WHERE consultant_id = ? AND subscription_json = ?").get(consultant_id, subString);

    if (!existing) {
      db.prepare("INSERT INTO push_subscriptions (consultant_id, subscription_json, created_at) VALUES (?, ?, ?)").run(
        consultant_id,
        subString,
        new Date().toISOString()
      );
    }

    res.json({ success: true, message: 'Subscription saved successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
