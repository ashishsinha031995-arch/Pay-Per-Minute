import { Server } from 'socket.io';
import { startChatExpiryJob } from '../jobs/chatExpiry.job.js';
import { startSubscriptionExpiryJob } from '../jobs/subscriptionExpiry.job.js';

export function initializeSystemTimers(io: Server) {
  console.log('Initializing Server-Authoritative Session & Subscription Timers...');
  startChatExpiryJob(io);
  startSubscriptionExpiryJob();
}
