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
  lockUserReferral
} from '../controllers/user.controller.js';

const router = Router();

// User Actions
router.get('/user/profile/:id', getUserProfileInfo);
router.post('/user/update-profile', updateUserProfile);
router.post('/user/upload-photo', uploadPhoto);
router.post('/user/recharge', rechargeUserWallet);
router.post('/user/lock-referral', lockUserReferral);
router.get('/user/wallet-transactions/:userId', getUserWalletTransactions);
router.get('/user/sessions', getUserPastSessions);

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

export default router;
