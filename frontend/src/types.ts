/**
 * Shared Type Definitions for SaaS Pay-Per-Minute Chat Platform
 */

export interface Plan {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  description: string;
  max_consultant_rate?: number;
  support_hours?: string;
  commission_rate?: number;
}

export interface Consultant {
  id: number;
  username: string;
  email?: string;
  display_name: string;
  photo_url: string;
  bio: string;
  price_per_minute: number;
  is_online: number; // 0 or 1
  is_busy: number; // 0 or 1
  is_active: number; // 0 or 1
  wallet_today: number;
  wallet_monthly: number;
  wallet_total: number;
  wallet_withdrawable: number;
  plan_expiry: string | null;
  plan_id?: number | null;
  plan_name?: string;
  aadhaar_number?: string;
  aadhaar_photo_url?: string;
  pan_number?: string;
  pan_photo_url?: string;
  kyc_status?: string;
  kyc_reject_reason?: string;
  bank_account_holder_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_name?: string;
  bank_status?: string;
  bank_reject_reason?: string;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  display_name: string;
  photo_url?: string | null;
  dob?: string | null;
  gender?: string | null;
  wallet_balance?: number;
  lifetime_recharge?: number;
  is_active: number; // 0 or 1
  is_blocked?: number; // 0 or 1
  location?: string | null;
  languages?: string | null;
  phone?: string | null;
}

export interface Session {
  id: string;
  consultant_id: number;
  user_id: number | null;
  user_name: string;
  duration_minutes: number;
  price_per_minute: number;
  total_paid: number;
  commission_rate: number;
  consultant_earnings: number;
  commission_amount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  payment_id: string | null;
  order_id: string | null;
  created_at: string;
  started_at: string | null;
  expires_at: string | null;
  transcript: string | null;
  refunded_minutes?: number;
  refunded_amount?: number;
  user_photo?: string | null;
  consultant_photo?: string | null;
}

export interface Message {
  id: number | string;
  session_id: string;
  sender_type: 'user' | 'consultant';
  sender_name: string;
  text: string;
  created_at: string;
  is_read: number; // 0 or 1
  is_offline?: boolean;
  reply_to_id?: number | string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
}

export interface Review {
  id: number;
  consultant_id: number;
  user_name: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface AdminStats {
  totalRevenue: number;
  totalSessions: number;
  totalConsultants: number;
  totalCommission: number;
  totalRefunded?: number;
  commissionRate: number;
  salaryCutoffDay?: number;
  salaryPayoutDay?: number;
  plansStats?: any[];
  is_mongodb_connected?: boolean;
  mongodb_status_message?: string;
}
