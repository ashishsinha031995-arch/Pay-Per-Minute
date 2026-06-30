import { Router } from 'express';
import {
  getUserProfileInfo,
  updateUserProfile,
  rechargeUserWallet,
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
  getActiveQueuedSessionForUser,
  getConsultantSchedules,
  createConsultantSchedule,
  updateConsultantSchedule,
  deleteConsultantSchedule
} from '../controllers/user.controller.js';

const router = Router();

// Public Settings
router.get('/settings/hero', getHeroSettings);

// User Actions
router.get('/user/profile/:id', getUserProfileInfo);
router.post('/user/update-profile', updateUserProfile);
router.post('/user/upload-photo', uploadPhoto);
router.post('/user/recharge', rechargeUserWallet);
router.post('/user/lock-referral', lockUserReferral);
router.get('/user/wallet-transactions/:userId', getUserWalletTransactions);
router.get('/user/sessions', getUserPastSessions);
router.get('/user/active-queued-session/:userId', getActiveQueuedSessionForUser);

// Consultant Actions
router.get('/consultants', getActiveConsultants);
router.get('/consultants/profile/:username', getConsultantProfileByUsername);
router.put('/consultants/:id/status', updateConsultantStatus);
router.put('/consultants/:id/profile', updateConsultantProfile);
router.get('/consultants/:id/profile', getConsultantProfileById);
router.get('/consultants/:id/stats', getConsultantStats);

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

export default router;
