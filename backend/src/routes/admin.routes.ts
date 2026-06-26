import { Router } from 'express';
import {
  getAdminDashboardStats,
  getSentEmailsLog,
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
  getAdminPlansList,
  createPlanBySuperAdmin,
  updatePlanBySuperAdmin,
  deletePlanBySuperAdmin
} from '../controllers/admin.controller.js';

const router = Router();

router.get('/stats', getAdminDashboardStats);
router.get('/emails', getSentEmailsLog);
router.get('/consultants', getAdminConsultantsList);
router.put('/consultants/:id/toggle-active', toggleConsultantActiveStatus);
router.put('/consultants/:id', updateConsultantBySuperAdmin);
router.post('/settings', updateAdminCommissionRateSetting);
router.get('/sessions', getAllSessionsFinancialLogs);
router.get('/blocked', getAdminBlockedUsersList);
router.get('/users', getSuperAdminUsersList);
router.post('/users/block', blockUserBySuperAdmin);
router.post('/users/unblock', unblockUserBySuperAdmin);
router.put('/users/:id', updateUserBySuperAdmin);
router.post('/users/bulk-update', bulkUpdateUsersBySuperAdmin);
router.get('/reviews', getSuperAdminReviewsList);
router.delete('/reviews/:id', deleteReviewBySuperAdmin);

// Subscription plan management
router.get('/plans', getAdminPlansList);
router.post('/plans', createPlanBySuperAdmin);
router.put('/plans/:id', updatePlanBySuperAdmin);
router.delete('/plans/:id', deletePlanBySuperAdmin);

export default router;
