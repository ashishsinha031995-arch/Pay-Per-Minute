import { Router } from 'express';
import { getSubscriptionPlansList } from '../controllers/subscription.controller.js';

const router = Router();

router.get('/plans', getSubscriptionPlansList);

export default router;
