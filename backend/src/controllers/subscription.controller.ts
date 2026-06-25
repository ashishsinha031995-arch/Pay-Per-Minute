import { Request, Response } from 'express';
import { db } from '../config/database.js';

export const getSubscriptionPlansList = (req: Request, res: Response) => {
  try {
    const plans = db.prepare('SELECT * FROM plans').all();
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
