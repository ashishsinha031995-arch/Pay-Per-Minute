import { Router } from 'express';
import {
  getUserProfileInfo,
  updateUserProfile,
  rechargeUserWallet,
  createRechargeOrder,
  verifyRechargePayment,
  getUserWalletTransactions,
  getUserPastSessions,
  getActiveConsultants,
  getConsultantProfileByUsername,
  updateConsultantStatus,
  updateConsultantProfile,
  getConsultantProfileById,
  getConsultantStats,
  getConsultantReviews,
  addConsultantReview,
  blockUserByConsultant,
  unblockUserByConsultant,
  getBlockedUsersByConsultant,
  uploadPhoto,
  lockUserReferral,
  getHeroSettings,
  getClassicAvatars,
  getActiveQueuedSessionForUser,
  getConsultantSchedules,
  createConsultantSchedule,
  updateConsultantSchedule,
  deleteConsultantSchedule,
  followConsultant,
  unfollowConsultant,
  getFollowingConsultants,
  getConsultantFollowers
} from '../controllers/user.controller.js';
import {
  getClientNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/notifications.controller.js';

const router = Router();

// Public Settings
router.get('/settings/hero', getHeroSettings);
router.get('/settings/avatars', getClassicAvatars);

// User Actions
router.get('/user/profile/:id', getUserProfileInfo);
router.post('/user/update-profile', updateUserProfile);
router.post('/user/upload-photo', uploadPhoto);
router.post('/user/recharge', rechargeUserWallet);
router.post('/user/recharge/create-order', createRechargeOrder);
router.post('/user/recharge/verify', verifyRechargePayment);
router.post('/user/lock-referral', lockUserReferral);
router.get('/user/wallet-transactions/:userId', getUserWalletTransactions);
router.get('/user/sessions', getUserPastSessions);
router.get('/user/active-queued-session/:userId', getActiveQueuedSessionForUser);
router.post('/user/follow', followConsultant);
router.post('/user/unfollow', unfollowConsultant);
router.get('/user/:userId/following', getFollowingConsultants);

// Consultant Actions
router.get('/consultants', getActiveConsultants);
router.get('/consultants/profile/:username', getConsultantProfileByUsername);
router.put('/consultants/:id/status', updateConsultantStatus);
router.put('/consultants/:id/profile', updateConsultantProfile);
router.get('/consultants/:id/profile', getConsultantProfileById);
router.get('/consultants/:id/stats', getConsultantStats);
router.get('/consultants/:id/followers', getConsultantFollowers);

// Review Logs
router.get('/consultants/:id/reviews', getConsultantReviews);
router.post('/consultants/:id/reviews', addConsultantReview);

// Block management actions
router.post('/consultants/block', blockUserByConsultant);
router.post('/consultants/unblock', unblockUserByConsultant);
router.get('/consultants/:id/blocked', getBlockedUsersByConsultant);

// Consultant Schedule Actions
router.get('/consultants/:id/schedules', getConsultantSchedules);
router.post('/consultants/:id/schedules', createConsultantSchedule);
router.put('/consultants/:id/schedules/:scheduleId', updateConsultantSchedule);
router.delete('/consultants/:id/schedules/:scheduleId', deleteConsultantSchedule);

// Client Notifications (Universal)
router.get('/notifications', getClientNotifications);
router.post('/notifications/:id/read', markNotificationAsRead);
router.post('/notifications/read-all', markAllNotificationsAsRead);

export default router;
