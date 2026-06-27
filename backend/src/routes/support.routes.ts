import { Router } from 'express';
import { createTicket, getTickets, replyToTicket, closeTicket, resolveTicket } from '../controllers/support.controller.js';

const router = Router();

router.post('/tickets', createTicket);
router.get('/tickets', getTickets);
router.post('/tickets/:id/reply', replyToTicket);
router.post('/tickets/:id/close', closeTicket);
router.post('/tickets/:id/resolve', resolveTicket);

export default router;
