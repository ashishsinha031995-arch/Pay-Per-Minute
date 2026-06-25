import { Router } from 'express';
import {
  createRazorpayOrMockOrder,
  verifyPaymentAndInitSession,
  getSessionById,
  postSessionMessageREST,
  acceptSession,
  rejectSession,
  endSessionManually
} from '../controllers/payment.controller.js';

const router = Router();

// Order and Payment Verification routes
router.post('/payments/create-order', createRazorpayOrMockOrder);
router.post('/payments/verify', verifyPaymentAndInitSession);

// Session metadata and fallback messaging
router.get('/sessions/:id', getSessionById);
router.post('/sessions/:id/messages', postSessionMessageREST);

// Session State Actions
router.post('/sessions/:id/accept', acceptSession);
router.post('/sessions/:id/reject', rejectSession);
router.post('/sessions/:id/end', endSessionManually);

export default router;
