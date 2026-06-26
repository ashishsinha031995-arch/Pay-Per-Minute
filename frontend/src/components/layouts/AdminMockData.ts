// High-fidelity mock data for the 18 Super Admin Subsystems

export interface RevenueData {
  name: string;
  revenue: number;
  commission: number;
  payouts: number;
}

export interface GrowthData {
  name: string;
  users: number;
  consultants: number;
  sessions: number;
}

export interface PackageSalesData {
  name: string;
  basic: number;
  gold: number;
  platinum: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
  status: 'Success' | 'Failed' | 'Warning';
}

export interface SupportTicket {
  id: string;
  user: string;
  role: 'User' | 'Consultant';
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved';
  assignedTo: string;
  createdAt: string;
}

export interface Coupon {
  code: string;
  discountType: 'Percentage' | 'Flat';
  value: number;
  minOrder: number;
  expiry: string;
  active: boolean;
}

export interface BlogPage {
  id: string;
  title: string;
  slug: string;
  author: string;
  status: 'Draft' | 'Published';
  createdAt: string;
}

export const revenueTrendData: RevenueData[] = [
  { name: 'Jan', revenue: 45000, commission: 9000, payouts: 36000 },
  { name: 'Feb', revenue: 52000, commission: 10400, payouts: 41600 },
  { name: 'Mar', revenue: 61000, commission: 12200, payouts: 48800 },
  { name: 'Apr', revenue: 58000, commission: 11600, payouts: 46400 },
  { name: 'May', revenue: 73000, commission: 14600, payouts: 58400 },
  { name: 'Jun', revenue: 89000, commission: 17800, payouts: 71200 },
];

export const growthTrendData: GrowthData[] = [
  { name: 'Jan', users: 120, consultants: 15, sessions: 280 },
  { name: 'Feb', users: 150, consultants: 18, sessions: 320 },
  { name: 'Mar', users: 210, consultants: 22, sessions: 410 },
  { name: 'Apr', users: 280, consultants: 24, sessions: 380 },
  { name: 'May', users: 390, consultants: 30, sessions: 520 },
  { name: 'Jun', users: 510, consultants: 36, sessions: 690 },
];

export const packageSalesData: PackageSalesData[] = [
  { name: 'Jan', basic: 10, gold: 4, platinum: 1 },
  { name: 'Feb', basic: 12, gold: 5, platinum: 1 },
  { name: 'Mar', basic: 18, gold: 8, platinum: 2 },
  { name: 'Apr', basic: 14, gold: 7, platinum: 3 },
  { name: 'May', basic: 22, gold: 11, platinum: 4 },
  { name: 'Jun', basic: 30, gold: 15, platinum: 6 },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'AUD-001', timestamp: '2026-06-25T01:10:00Z', actor: 'Super Admin', role: 'Super Admin', action: 'Login Success', details: 'IP: 192.168.1.1, User Agent: Chrome', status: 'Success' },
  { id: 'AUD-002', timestamp: '2026-06-25T00:45:00Z', actor: 'Finance Admin', role: 'Finance Admin', action: 'Approve Payout', details: 'Approved ₹2,880.00 withdrawal for Coach Rahul (#2)', status: 'Success' },
  { id: 'AUD-003', timestamp: '2026-06-24T22:15:00Z', actor: 'Support Admin', role: 'Support Admin', action: 'Resolve Ticket', details: 'Closed ticket #TKT-492 (Refund requested)', status: 'Success' },
  { id: 'AUD-004', timestamp: '2026-06-24T18:30:00Z', actor: 'System Daemon', role: 'System', action: 'Database Backup', details: 'Auto-backup completed, size 24.5 MB', status: 'Success' },
  { id: 'AUD-005', timestamp: '2026-06-24T14:10:00Z', actor: 'Marketing Admin', role: 'Marketing Admin', action: 'Create Coupon', details: 'Created coupon code WELCOME50 (50% flat discount)', status: 'Success' },
  { id: 'AUD-006', timestamp: '2026-06-24T11:05:00Z', actor: 'Operations Admin', role: 'Operations Admin', action: 'Edit Consultant Profile', details: 'Updated rate for Astro Pandit (#1) to ₹25.00/min', status: 'Success' },
  { id: 'AUD-007', timestamp: '2026-06-24T09:12:00Z', actor: 'Anonymous Dev', role: 'Developer', action: 'Failed Admin Access', details: 'IP: 203.0.113.12, Invalid password attempt', status: 'Failed' },
];

export const mockSupportTickets: SupportTicket[] = [
  { id: 'TKT-001', user: 'Aman Kumar', role: 'User', subject: 'Refund on Astro session', description: 'Chat disconnected unexpectedly, balance was deducted for 10 minutes instead of 2 minutes.', priority: 'High', status: 'Open', assignedTo: 'Support Admin', createdAt: '2026-06-25T00:15:00Z' },
  { id: 'TKT-002', user: 'tarot_reema', role: 'Consultant', subject: 'Profile photo upload fail', description: 'Getting 500 error when uploading my 4K high-res picture.', priority: 'Medium', status: 'In Progress', assignedTo: 'Operations Admin', createdAt: '2026-06-24T19:40:00Z' },
  { id: 'TKT-003', user: 'Sanya Mehta', role: 'User', subject: 'Wallet recharge failure', description: 'Amount deducted from bank but did not reflect in platform wallet balance.', priority: 'Critical', status: 'Open', assignedTo: 'Finance Admin', createdAt: '2026-06-24T23:50:00Z' },
  { id: 'TKT-004', user: 'coach_rahul', role: 'Consultant', subject: 'Commission structure query', description: 'Is my gold tier commission discount applied?', priority: 'Low', status: 'Resolved', assignedTo: 'Support Admin', createdAt: '2026-06-23T10:15:00Z' },
];

export const initialCoupons: Coupon[] = [
  { code: 'CHATHUB50', discountType: 'Percentage', value: 50, minOrder: 100, expiry: '2026-12-31', active: true },
  { code: 'FLAT100', discountType: 'Flat', value: 100, minOrder: 500, expiry: '2026-08-31', active: true },
  { code: 'FESTIVE30', discountType: 'Percentage', value: 30, minOrder: 200, expiry: '2026-10-31', active: false },
];

export const mockBlogPages: BlogPage[] = [
  { id: 'BLOG-001', title: 'Top 10 Mindfulness Habits for Busy Entrepreneurs', slug: 'top-10-mindfulness-habits', author: 'Coach Rahul', status: 'Published', createdAt: '2026-06-20' },
  { id: 'BLOG-002', title: 'Vedic Astrology: Exploring Your True Life Purpose', slug: 'exploring-vedic-astrology', author: 'Astro Pandit', status: 'Published', createdAt: '2026-06-18' },
  { id: 'BLOG-003', title: 'Why Having a Creator Mentor Accelerates Your Career', slug: 'creator-mentorship-accelerates', author: 'Karan Johar', status: 'Draft', createdAt: '2026-06-24' },
];

export const systemRolesList = [
  { name: 'Super Admin', desc: 'Full core capabilities, financial approvals, settings management, and logs tracking.', color: 'emerald' },
  { name: 'Finance Admin', desc: 'Access to revenue reports, payment audits, payout approvals, and ledger records.', color: 'cyan' },
  { name: 'Support Admin', desc: 'Manage tickets, resolve user grievances, process session refunds, and view transcripts.', color: 'purple' },
  { name: 'Marketing Admin', desc: 'Create and distribute coupons, launch email/push campaign triggers, and track referrals.', color: 'amber' },
  { name: 'Operations Admin', desc: 'Modify consultant verification levels, reset passwords, suspend users, and edit CMS.', color: 'rose' },
];

export interface DailyRevenueData {
  date: string;
  revenue: number;
  commission: number;
  payouts: number;
  transactionsCount: number;
}

export interface WeeklyRevenueData {
  week: string;
  revenue: number;
  commission: number;
  payouts: number;
  transactionsCount: number;
}

export interface DailySubscriptionSalesData {
  date: string;
  subscriptionsSold: number;
  silverSold: number;
  goldSold: number;
  platinumSold: number;
  subscriptionRevenue: number;
}

// 14 days of realistic daily revenue and commissions
export const dailyRevenueTrendData: DailyRevenueData[] = [
  { date: '2026-06-12', revenue: 2100, commission: 420, payouts: 1680, transactionsCount: 12 },
  { date: '2026-06-13', revenue: 2450, commission: 490, payouts: 1960, transactionsCount: 15 },
  { date: '2026-06-14', revenue: 3100, commission: 620, payouts: 2480, transactionsCount: 18 },
  { date: '2026-06-15', revenue: 1900, commission: 380, payouts: 1520, transactionsCount: 11 },
  { date: '2026-06-16', revenue: 2200, commission: 440, payouts: 1760, transactionsCount: 14 },
  { date: '2026-06-17', revenue: 2800, commission: 560, payouts: 2240, transactionsCount: 16 },
  { date: '2026-06-18', revenue: 2600, commission: 520, payouts: 2080, transactionsCount: 15 },
  { date: '2026-06-19', revenue: 3400, commission: 680, payouts: 2720, transactionsCount: 21 },
  { date: '2026-06-20', revenue: 4100, commission: 820, payouts: 3280, transactionsCount: 25 },
  { date: '2026-06-21', revenue: 4800, commission: 960, payouts: 3840, transactionsCount: 30 },
  { date: '2026-06-22', revenue: 3000, commission: 600, payouts: 2400, transactionsCount: 19 },
  { date: '2026-06-23', revenue: 3200, commission: 640, payouts: 2560, transactionsCount: 20 },
  { date: '2026-06-24', revenue: 3900, commission: 780, payouts: 3120, transactionsCount: 24 },
  { date: '2026-06-25', revenue: 4500, commission: 900, payouts: 3600, transactionsCount: 28 },
];

// 8 weeks of weekly revenue and commissions
export const weeklyRevenueTrendData: WeeklyRevenueData[] = [
  { week: 'W1 (May 01 - May 07)', revenue: 12500, commission: 2500, payouts: 10000, transactionsCount: 74 },
  { week: 'W2 (May 08 - May 14)', revenue: 14200, commission: 2840, payouts: 11360, transactionsCount: 88 },
  { week: 'W3 (May 15 - May 21)', revenue: 15800, commission: 3160, payouts: 12640, transactionsCount: 95 },
  { week: 'W4 (May 22 - May 28)', revenue: 17100, commission: 3420, payouts: 13680, transactionsCount: 104 },
  { week: 'W5 (May 29 - Jun 04)', revenue: 18900, commission: 3780, payouts: 15120, transactionsCount: 112 },
  { week: 'W6 (Jun 05 - Jun 11)', revenue: 20500, commission: 4100, payouts: 16400, transactionsCount: 125 },
  { week: 'W7 (Jun 12 - Jun 18)', revenue: 17650, commission: 3530, payouts: 14120, transactionsCount: 101 },
  { week: 'W8 (Jun 19 - Jun 25)', revenue: 26900, commission: 5380, payouts: 21520, transactionsCount: 147 },
];

// 14 days of subscription sales & revenue
export const dailySubscriptionSalesData: DailySubscriptionSalesData[] = [
  { date: '2026-06-12', subscriptionsSold: 3, silverSold: 2, goldSold: 1, platinumSold: 0, subscriptionRevenue: 2497 },
  { date: '2026-06-13', subscriptionsSold: 4, silverSold: 2, goldSold: 1, platinumSold: 1, subscriptionRevenue: 4496 },
  { date: '2026-06-14', subscriptionsSold: 6, silverSold: 3, goldSold: 2, platinumSold: 1, subscriptionRevenue: 6494 },
  { date: '2026-06-15', subscriptionsSold: 2, silverSold: 1, goldSold: 1, platinumSold: 0, subscriptionRevenue: 1498 },
  { date: '2026-06-16', subscriptionsSold: 3, silverSold: 2, goldSold: 1, platinumSold: 0, subscriptionRevenue: 2497 },
  { date: '2026-06-17', subscriptionsSold: 5, silverSold: 3, goldSold: 1, platinumSold: 1, subscriptionRevenue: 4995 },
  { date: '2026-06-18', subscriptionsSold: 4, silverSold: 2, goldSold: 2, platinumSold: 0, subscriptionRevenue: 3996 },
  { date: '2026-06-19', subscriptionsSold: 7, silverSold: 4, goldSold: 2, platinumSold: 1, subscriptionRevenue: 7493 },
  { date: '2026-06-20', subscriptionsSold: 8, silverSold: 4, goldSold: 3, platinumSold: 1, subscriptionRevenue: 8992 },
  { date: '2026-06-21', subscriptionsSold: 10, silverSold: 5, goldSold: 3, platinumSold: 2, subscriptionRevenue: 11990 },
  { date: '2026-06-22', subscriptionsSold: 5, silverSold: 3, goldSold: 1, platinumSold: 1, subscriptionRevenue: 4995 },
  { date: '2026-06-23', subscriptionsSold: 6, silverSold: 3, goldSold: 2, platinumSold: 1, subscriptionRevenue: 6494 },
  { date: '2026-06-24', subscriptionsSold: 9, silverSold: 5, goldSold: 3, platinumSold: 1, subscriptionRevenue: 9991 },
  { date: '2026-06-25', subscriptionsSold: 11, silverSold: 6, goldSold: 4, platinumSold: 1, subscriptionRevenue: 12489 },
];

