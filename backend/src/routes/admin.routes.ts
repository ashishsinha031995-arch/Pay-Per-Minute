import { Router } from 'express';
import {
  getAdminDashboardStats,
  getSentEmailsLog,
  getAdminAuditLogs,
  getAdminConsultantsList,
  toggleConsultantActiveStatus,
  updateConsultantBySuperAdmin,
  updateAdminCommissionRateSetting,
  getAllSessionsFinancialLogs,
  getAdminBlockedUsersList,
  getSuperAdminUsersList,
  blockUserBySuperAdmin,
  unblockUserBySuperAdmin,
  updateUserBySuperAdmin,
  bulkUpdateUsersBySuperAdmin,
  getSuperAdminReviewsList,
  deleteReviewBySuperAdmin,
  toggleReviewHiddenStatusBySuperAdmin,
  getAdminPlansList,
  createPlanBySuperAdmin,
  updatePlanBySuperAdmin,
  deletePlanBySuperAdmin,
  updateHeroSettings,
  refundSessionBySuperAdmin,
  addMoneyToWallet,
  getManualWalletAdjustments,
  getAdminLiveQueues
} from '../controllers/admin.controller.js';

const router = Router();

router.get('/queues', getAdminLiveQueues);

router.get('/stats', getAdminDashboardStats);
router.put('/settings/hero', updateHeroSettings);
router.get('/emails', getSentEmailsLog);
router.get('/audit-logs', getAdminAuditLogs);
router.get('/consultants', getAdminConsultantsList);
router.put('/consultants/:id/toggle-active', toggleConsultantActiveStatus);
router.put('/consultants/:id', updateConsultantBySuperAdmin);
router.post('/settings', updateAdminCommissionRateSetting);
router.get('/sessions', getAllSessionsFinancialLogs);
router.post('/sessions/:id/refund', refundSessionBySuperAdmin);
router.get('/blocked', getAdminBlockedUsersList);
router.get('/users', getSuperAdminUsersList);
router.post('/users/block', blockUserBySuperAdmin);
router.post('/users/unblock', unblockUserBySuperAdmin);
router.put('/users/:id', updateUserBySuperAdmin);
router.post('/users/bulk-update', bulkUpdateUsersBySuperAdmin);
router.get('/reviews', getSuperAdminReviewsList);
router.put('/reviews/:id/toggle-hidden', toggleReviewHiddenStatusBySuperAdmin);
router.delete('/reviews/:id', deleteReviewBySuperAdmin);

// Subscription plan management
router.get('/plans', getAdminPlansList);
router.post('/plans', createPlanBySuperAdmin);
router.put('/plans/:id', updatePlanBySuperAdmin);
router.delete('/plans/:id', deletePlanBySuperAdmin);

// Manual wallet adjustments
router.post('/wallet/add-money', addMoneyToWallet);
router.get('/wallet/adjustments', getManualWalletAdjustments);

export default router;
