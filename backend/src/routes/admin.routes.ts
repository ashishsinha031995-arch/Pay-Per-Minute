import { Router } from 'express';
import {
  getAdminDashboardStats,
  getSentEmailsLog,
  getAdminConsultantsList,
  toggleConsultantActiveStatus,
  updateAdminCommissionRateSetting,
  getAllSessionsFinancialLogs,
  getAdminBlockedUsersList,
  getSuperAdminUsersList,
  blockUserBySuperAdmin,
  unblockUserBySuperAdmin
} from '../controllers/admin.controller.js';

const router = Router();

router.get('/stats', getAdminDashboardStats);
router.get('/emails', getSentEmailsLog);
router.get('/consultants', getAdminConsultantsList);
router.put('/consultants/:id/toggle-active', toggleConsultantActiveStatus);
router.post('/settings', updateAdminCommissionRateSetting);
router.get('/sessions', getAllSessionsFinancialLogs);
router.get('/blocked', getAdminBlockedUsersList);
router.get('/users', getSuperAdminUsersList);
router.post('/users/block', blockUserBySuperAdmin);
router.post('/users/unblock', unblockUserBySuperAdmin);

export default router;
