import React, { useState, useEffect } from 'react';
import { 
  DollarSign, ShieldAlert, Sparkles, Plus, Settings, Users, Percent, ListCollapse, 
  ToggleLeft, ToggleRight, MessageSquare, Search, UserCheck, X, Calendar, BookOpen, 
  Award, CreditCard, Wallet, Landmark, BarChart3, Star, Megaphone, Bell, FileText, 
  LifeBuoy, Scroll, ShieldCheck, Check, Trash2, Edit3, Key, Mail, RefreshCw, Send, Zap, Menu, LayoutDashboard
} from 'lucide-react';
import { Plan, Consultant, Session, AdminStats } from '../../types';
import { 
  DashboardGraphs, MarketingModulePanel, CmsModulePanel, 
  SupportTicketsPanel, AuditLogsPanel, RoleManagementPanel, SettingsPanel 
} from './AdminSubSections';
import { downloadInvoice } from '../../utils/invoiceHelper';

export function AdminPanel() {
  const [stats, setStats] = useState<AdminStats>({
    totalRevenue: 0,
    totalSessions: 0,
    totalConsultants: 0,
    totalCommission: 0,
    commissionRate: 20,
  });
  
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [blockedLogs, setBlockedLogs] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  
  // Navigation states (18 sections)
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Create / Edit Consultant form states
  const [showConsultantModal, setShowConsultantModal] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
  const [consName, setConsName] = useState('');
  const [consEmail, setConsEmail] = useState('');
  const [consUsername, setConsUsername] = useState('');
  const [consPassword, setConsPassword] = useState('');
  const [consBio, setConsBio] = useState('');
  const [consRate, setConsRate] = useState('20');
  const [consCategory, setConsCategory] = useState('Astrologers');
  const [consExp, setConsExp] = useState('5');
  const [consLanguages, setConsLanguages] = useState('English, Hindi');
  const [consSpec, setConsSpec] = useState('General Consulting');

  // Plan Creator Form State
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDuration, setPlanDuration] = useState('');
  const [planDesc, setPlanDesc] = useState('');

  // User Editing Form States
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [usrDisplayName, setUsrDisplayName] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrPhotoUrl, setUsrPhotoUrl] = useState('');
  const [usrDob, setUsrDob] = useState('');
  const [usrGender, setUsrGender] = useState('Male');
  const [usrWalletBalance, setUsrWalletBalance] = useState('0');
  const [usrCategory, setUsrCategory] = useState('General');
  const [usrLockedConsultantId, setUsrLockedConsultantId] = useState('');
  const [usrAdminAllowOthers, setUsrAdminAllowOthers] = useState(0);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Global settings input states
  const [commissionRateInput, setCommissionRateInput] = useState<string>('20');
  
  // Broadcast Broadcaster states
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'users' | 'consultants'>('all');
  const [broadcastChannel, setBroadcastChannel] = useState<'in_app' | 'push' | 'email' | 'sms'>('in_app');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  
  // Common UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transcript monitoring overlay states
  const [viewingPastSessionMessages, setViewingPastSessionMessages] = useState<any[] | null>(null);
  const [viewingPastSessionInfo, setViewingPastSessionInfo] = useState<any | null>(null);

  // Search & Filter state for Consultants ledger
  const [searchCons, setSearchCons] = useState('');
  const [filterConsCat, setFilterConsCat] = useState('all');
  const [filterConsStatus, setFilterConsStatus] = useState('all');
  const [filterConsRate, setFilterConsRate] = useState('all');

  // Search & Filter state for Users ledger
  const [searchUsr, setSearchUsr] = useState('');
  const [filterUsrStatus, setFilterUsrStatus] = useState('all');
  const [filterUsrSpend, setFilterUsrSpend] = useState('all');
  const [filterUsrGender, setFilterUsrGender] = useState('all');

  // Search & Filter state for Sessions ledger
  const [searchSess, setSearchSess] = useState('');
  const [filterSessStatus, setFilterSessStatus] = useState('all');
  const [filterSessRate, setFilterSessRate] = useState('all');
  const [filterSessDur, setFilterSessDur] = useState('all');

  // Search & Filter state for Payments ledger
  const [searchPay, setSearchPay] = useState('');
  const [filterPayStatus, setFilterPayStatus] = useState('all');
  const [filterPayAmt, setFilterPayAmt] = useState('all');
  const [filterPayGateway, setFilterPayGateway] = useState('all');

  // State to track manual refresh spinner animation
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load backend datasets
  const loadAdminData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const [statsRes, consRes, sessRes, plansRes, blockedRes, usersRes, emailsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/consultants'),
        fetch('/api/admin/sessions'),
        fetch('/api/plans'),
        fetch('/api/admin/blocked'),
        fetch('/api/admin/users'),
        fetch('/api/admin/emails')
      ]);

      if (!statsRes.ok || !consRes.ok || !sessRes.ok || !plansRes.ok || !blockedRes.ok || !usersRes.ok || !emailsRes.ok) {
        throw new Error('Failed to load admin dataset');
      }

      const statsData = await statsRes.json();
      const consData = await consRes.json();
      const sessData = await sessRes.json();
      const plansData = await plansRes.json();
      const blockedData = await blockedRes.json();
      const usersData = await usersRes.json();
      const emailsData = await emailsRes.json();

      setStats(statsData);
      setCommissionRateInput(statsData.commissionRate.toString());
      setConsultants(consData);
      setSessions(sessData);
      setPlans(plansData);
      setBlockedLogs(blockedData);
      setAdminUsers(usersData);
      setSentEmails(emailsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Real-time background polling (updates Super Admin Panel in real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      loadAdminData(true); // silent refresh (doesn't trigger full screen spinner)
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Manual ledger refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadAdminData(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Update Global Commission Setting
  const handleUpdateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_percentage: commissionRateInput }),
      });
      if (!res.ok) throw new Error('Could not update commission setting');
      setSuccessMsg('Platform commission rate updated successfully!');
      loadAdminData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create or Update Plan
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || !planPrice || !planDuration) {
      setError('Please fill in all required plan fields');
      return;
    }
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planName,
          price: parseFloat(planPrice),
          duration_days: parseInt(planDuration),
          description: planDesc,
        }),
      });
      if (!res.ok) throw new Error('Failed to create new subscription plan');
      setSuccessMsg(`Plan "${planName}" created successfully!`);
      setPlanName('');
      setPlanPrice('');
      setPlanDuration('');
      setPlanDesc('');
      loadAdminData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Save Consultant (Create or Edit)
  const handleSaveConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consName || !consUsername || (!editingConsultant && (!consPassword || !consEmail))) {
      setError('Please complete all required consultant registration parameters, including display name, username, password, and email.');
      return;
    }
    try {
      const payload = {
        display_name: consName,
        username: consUsername,
        email: consEmail,
        password: consPassword || undefined,
        bio: consBio,
        price_per_minute: parseFloat(consRate),
        category: consCategory,
        experience: parseInt(consExp),
        languages: consLanguages,
        specializations: consSpec,
      };

      let endpoint = '/api/consultants/register';
      let method = 'POST';

      if (editingConsultant) {
        endpoint = `/api/consultants/${editingConsultant.id}/profile`;
        method = 'PUT';
      }

      // If creating, we need a subscription plan assigned. We can default to plan 1.
      const planToAssign = plans[0]?.id || 1;
      const finalPayload = method === 'POST' ? { ...payload, plan_id: planToAssign, initial_price_per_minute: parseFloat(consRate) } : payload;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to persist consultant record.');
      }

      setSuccessMsg(editingConsultant ? 'Consultant profile updated successfully!' : 'New consultant created successfully!');
      setShowConsultantModal(false);
      setEditingConsultant(null);
      setConsName('');
      setConsEmail('');
      setConsUsername('');
      setConsPassword('');
      setConsBio('');
      setConsRate('20');
      setConsCategory('Astrologers');
      loadAdminData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle Consultant active/suspended
  const handleToggleConsultant = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/consultants/${id}/toggle-active`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to toggle active status of advisor.');
      setSuccessMsg('Advisor listing status altered.');
      loadAdminData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Reset password / generate credentials
  const handleResetPassword = async (cons: Consultant) => {
    const newPass = Math.random().toString(36).slice(-8);
    if (confirm(`Generate and assign a new security credential for advisor "${cons.display_name}"? New plaintext will be: ${newPass}`)) {
      try {
        const res = await fetch(`/api/consultants/${cons.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPass }),
        });
        if (!res.ok) throw new Error('Credential reset failed.');
        setSuccessMsg(`Advisor credentials updated successfully! Plaintext: ${newPass}`);
        loadAdminData();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  // Toggle client user block status
  const handleToggleBlockUser = async (userId: number, currentBlocked: boolean) => {
    try {
      const endpoint = currentBlocked ? '/api/admin/users/unblock' : '/api/admin/users/block';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) throw new Error('Failed to update client user status');
      setSuccessMsg(currentBlocked ? 'Client unblocked successfully.' : 'Client administratively blocked from portal.');
      loadAdminData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setUsrDisplayName(user.display_name || '');
    setUsrEmail(user.email || '');
    setUsrPhotoUrl(user.photo_url || '');
    
    let formattedDob = '';
    if (user.dob) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(user.dob)) {
        formattedDob = user.dob;
      } else {
        try {
          const d = new Date(user.dob);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            formattedDob = `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    setUsrDob(formattedDob);
    setUsrGender(user.gender || 'Male');
    setUsrWalletBalance(String(user.wallet_balance || 0));
    setUsrCategory(user.category || 'General');
    setUsrLockedConsultantId(user.locked_consultant_id ? String(user.locked_consultant_id) : '');
    setUsrAdminAllowOthers(user.admin_allow_others ? 1 : 0);
    setShowUserModal(true);
  };

  const handleUserPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size is too big. Kripya 5MB se choti image upload karein.');
      return;
    }

    setUploadingPhoto(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const res = await fetch('/api/user/upload-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64String })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
          
          setUsrPhotoUrl(data.photo_url);
          setSuccessMsg('Photo successfully uploaded!');
          setTimeout(() => setSuccessMsg(null), 3000);
        } catch (uploadErr: any) {
          setError(uploadErr.message);
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.onerror = () => {
        setError('Error reading file.');
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message);
      setUploadingPhoto(false);
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!usrDisplayName.trim()) {
      setError('Display Name is required.');
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: usrDisplayName,
          email: usrEmail,
          photo_url: usrPhotoUrl,
          dob: usrDob || null,
          gender: usrGender,
          wallet_balance: parseFloat(usrWalletBalance) || 0,
          category: usrCategory,
          locked_consultant_id: usrLockedConsultantId || null,
          admin_allow_others: usrAdminAllowOthers
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save user changes');

      setSuccessMsg('User profile updated successfully in real-time!');
      setShowUserModal(false);
      setEditingUser(null);
      
      // Reload admin data immediately for real-time reflection
      loadAdminData();
      
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Broadcaster tool simulation
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    setSuccessMsg(`Broadcast message trigger fired to ${broadcastTarget} via ${broadcastChannel.toUpperCase()} channel!`);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // --- Consultants Filtering & Search ---
  const filteredConsultants = consultants.filter(c => {
    const sTerm = searchCons.toLowerCase().trim();
    const nameMatch = c.display_name.toLowerCase().includes(sTerm);
    const userMatch = c.username.toLowerCase().includes(sTerm);
    const emailMatch = (c.email || '').toLowerCase().includes(sTerm);
    const idMatch = String(c.id).toLowerCase().includes(sTerm);
    if (sTerm && !nameMatch && !userMatch && !emailMatch && !idMatch) return false;

    if (filterConsCat !== 'all' && (c as any).category !== filterConsCat) return false;

    if (filterConsStatus !== 'all') {
      const activeVal = filterConsStatus === 'active' ? 1 : 0;
      if (c.is_active !== activeVal) return false;
    }

    if (filterConsRate !== 'all') {
      const r = c.price_per_minute;
      if (filterConsRate === 'budget' && r > 20) return false;
      if (filterConsRate === 'medium' && (r <= 20 || r > 50)) return false;
      if (filterConsRate === 'premium' && r <= 50) return false;
    }

    return true;
  });

  // --- Users Filtering & Search ---
  const filteredUsers = adminUsers.filter(u => {
    const sTerm = searchUsr.toLowerCase().trim();
    const nameMatch = u.display_name.toLowerCase().includes(sTerm);
    const userMatch = u.username.toLowerCase().includes(sTerm);
    const idMatch = String(u.id).toLowerCase().includes(sTerm);
    if (sTerm && !nameMatch && !userMatch && !idMatch) return false;

    if (filterUsrStatus !== 'all') {
      const blockedVal = filterUsrStatus === 'blocked' ? 1 : 0;
      if (u.is_blocked !== blockedVal) return false;
    }

    if (filterUsrSpend !== 'all') {
      const sp = parseFloat(u.lifetime_recharge || 0);
      if (filterUsrSpend === 'low' && sp > 500) return false;
      if (filterUsrSpend === 'mid' && (sp <= 500 || sp > 2000)) return false;
      if (filterUsrSpend === 'high' && sp <= 2000) return false;
    }

    if (filterUsrGender !== 'all' && (u.gender || '').toLowerCase() !== filterUsrGender.toLowerCase()) return false;

    return true;
  });

  // --- Sessions Filtering & Search ---
  const filteredSessions = sessions.filter(s => {
    const sTerm = searchSess.toLowerCase().trim();
    const idMatch = String(s.id).toLowerCase().includes(sTerm);
    const userMatch = s.user_name.toLowerCase().includes(sTerm);
    const consMatch = ((s as any).consultant_name || '').toLowerCase().includes(sTerm);
    const userIdMatch = s.user_id ? String(s.user_id).toLowerCase().includes(sTerm) : false;
    const consIdMatch = s.consultant_id ? String(s.consultant_id).toLowerCase().includes(sTerm) : false;
    if (sTerm && !idMatch && !userMatch && !consMatch && !userIdMatch && !consIdMatch) return false;

    if (filterSessStatus !== 'all' && s.status !== filterSessStatus) return false;

    if (filterSessRate !== 'all') {
      const r = s.commission_rate;
      if (filterSessRate === '15' && r !== 15) return false;
      if (filterSessRate === '20' && r !== 20) return false;
      if (filterSessRate === '25' && r !== 25) return false;
    }

    if (filterSessDur !== 'all') {
      const d = s.duration_minutes;
      if (filterSessDur === 'short' && d >= 5) return false;
      if (filterSessDur === 'medium' && (d < 5 || d > 15)) return false;
      if (filterSessDur === 'long' && d <= 15) return false;
    }

    return true;
  });

  // --- Dynamic Payments Ledger Data ---
  const getDynamicPaymentLogs = () => {
    const baseLogs = [
      { id: 'order_K8dJws92', user_id: 10001, user_name: 'Aman Kumar', amount: 500, gateway: 'Razorpay', created_at: '2026-06-25 00:05', status: 'Captured' },
      { id: 'order_G3vKw812', user_id: 10002, user_name: 'Sanya Mehta', amount: 1000, gateway: 'Razorpay', created_at: '2026-06-24 18:30', status: 'Failed' },
      { id: 'order_B3iLw294', user_id: 10003, user_name: 'Rahul Sharma', amount: 250, gateway: 'Razorpay', created_at: '2026-06-23 12:15', status: 'Captured' },
    ];
    
    adminUsers.forEach((u, idx) => {
      const recharge = parseFloat(u.lifetime_recharge || 0);
      if (recharge > 0) {
        baseLogs.push({
          id: `order_user_${u.id}_${idx}`,
          user_id: u.id,
          user_name: u.display_name,
          amount: recharge,
          gateway: 'Razorpay',
          created_at: new Date(u.created_at || Date.now()).toISOString().replace('T', ' ').slice(0, 16),
          status: 'Captured'
        });
      }
    });

    return baseLogs;
  };

  const paymentLogs = getDynamicPaymentLogs();

  const filteredPayments = paymentLogs.filter(p => {
    const sTerm = searchPay.toLowerCase().trim();
    const idMatch = p.id.toLowerCase().includes(sTerm);
    const userMatch = p.user_name.toLowerCase().includes(sTerm);
    const userIdMatch = (p as any).user_id ? String((p as any).user_id).toLowerCase().includes(sTerm) : false;
    if (sTerm && !idMatch && !userMatch && !userIdMatch) return false;

    if (filterPayStatus !== 'all' && p.status.toLowerCase() !== filterPayStatus.toLowerCase()) return false;

    if (filterPayAmt !== 'all') {
      const amt = p.amount;
      if (filterPayAmt === 'budget' && amt >= 500) return false;
      if (filterPayAmt === 'standard' && (amt < 500 || amt > 1000)) return false;
      if (filterPayAmt === 'high' && amt <= 1000) return false;
    }

    if (filterPayGateway !== 'all' && p.gateway.toLowerCase() !== filterPayGateway.toLowerCase()) return false;

    return true;
  });

  // --- Today's & Yesterday's Consultation Report Calculation ---
  const getDailyConsultationReport = () => {
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    const todaySessions = sessions.filter(s => {
      const d = new Date(s.created_at);
      return d >= startOfToday;
    });

    const yesterdaySessions = sessions.filter(s => {
      const d = new Date(s.created_at);
      return d >= startOfYesterday && d < startOfToday;
    });

    const calculateStats = (sessList: Session[]) => {
      const count = sessList.length;
      const completedList = sessList.filter(s => s.status === 'completed');
      const completed = completedList.length;
      const missed = sessList.filter(s => (s.status as string) === 'cancelled' || (s.status as string) === 'missed').length;
      const active = sessList.filter(s => s.status === 'active').length;
      const rejected = sessList.filter(s => (s.status as string) === 'cancelled' || (s.status as string) === 'rejected').length;
      
      const totalPaid = sessList.reduce((acc, s) => acc + (s.total_paid || 0), 0);
      const commission = sessList.reduce((acc, s) => acc + (s.commission_amount || 0), 0);
      const consultantEarnings = sessList.reduce((acc, s) => acc + (s.consultant_earnings || 0), 0);
      const duration = sessList.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

      return {
        count,
        completed,
        missed,
        active,
        rejected,
        totalPaid,
        commission,
        consultantEarnings,
        duration
      };
    };

    return {
      today: calculateStats(todaySessions),
      todaySessions,
      yesterday: calculateStats(yesterdaySessions),
      yesterdaySessions
    };
  };

  const reportData = getDailyConsultationReport();

  if (loading && adminUsers.length === 0) {
    return (
      <div className="flex justify-center items-center py-24 bg-slate-950 min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-xs text-slate-400 font-mono tracking-wider">Syncing Super Admin Ledger...</span>
        </div>
      </div>
    );
  }

  // Categories of sub-menus (18 features)
  const sidebarMenus = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'consultants', label: 'Consultants Manager', icon: Users, badge: consultants.length },
    { id: 'subscriptions', label: 'Subscription Plans', icon: Award, badge: plans.length },
    { id: 'users', label: 'User Accounts', icon: UserCheck, badge: adminUsers.length },
    { id: 'sessions', label: 'Chat Sessions', icon: MessageSquare, badge: sessions.length },
    { id: 'payments', label: 'Payment Logs', icon: CreditCard },
    { id: 'wallets', label: 'Wallet Management', icon: Wallet },
    { id: 'commissions', label: 'Commission Settings', icon: Percent },
    { id: 'payouts', label: 'Payout Management', icon: Landmark, badge: 1 },
    { id: 'analytics', label: 'Analytics Module', icon: BarChart3 },
    { id: 'ratings', label: 'Ratings & Reviews', icon: Star },
    { id: 'marketing', label: 'Marketing Module', icon: Megaphone },
    { id: 'notifications', label: 'Broadcaster tool', icon: Bell },
    { id: 'cms', label: 'CMS Content Pages', icon: FileText },
    { id: 'support', label: 'Support Module', icon: LifeBuoy, badge: 3 },
    { id: 'audit', label: 'System Audit Logs', icon: Scroll },
    { id: 'roles', label: 'Admin Access Roles', icon: ShieldCheck },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans text-left relative overflow-hidden">
      
      {/* 1. LEFT SIDEBAR MENU */}
      <div className={`fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-40 ${
        isSidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-16 md:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-850 flex items-center justify-between">
          <div className={`flex items-center space-x-2 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
            <Landmark className="w-5 h-5 text-emerald-400" />
            <span className="font-extrabold text-sm tracking-tight text-slate-100 whitespace-nowrap">Super Admin Portal</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Vertical list of features */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarMenus.map(menu => {
            const Icon = menu.icon;
            const isActive = activeTab === menu.id;
            return (
              <button
                key={menu.id}
                onClick={() => setActiveTab(menu.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/5' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
                title={menu.label}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span className={`truncate ${isSidebarOpen ? 'inline' : 'hidden md:hidden'}`}>{menu.label}</span>
                </div>
                {isSidebarOpen && menu.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {menu.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN WORKING AREA */}
      <div className={`flex-1 min-w-0 transition-all duration-300 min-h-screen ${
        isSidebarOpen ? 'pl-0 md:pl-64' : 'pl-0 md:pl-16'
      }`}>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Top header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-400 md:hidden"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-100 flex items-center space-x-2">
                  <span>Central Operations Hub</span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                    Super Admin
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Current System Mode: Standard Active Ledger Mode</p>
              </div>
            </div>
            <button
              onClick={loadAdminData}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition-all font-mono self-start sm:self-auto shrink-0 flex items-center space-x-2"
            >
              <span>🔄 Refresh Ledger Logs</span>
            </button>
          </div>

          {/* Feedback banners */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-2xl text-rose-200 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400 animate-pulse" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-2xl text-emerald-200 text-xs flex items-center space-x-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.1 TAB: OVERVIEW / DASHBOARD OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Total Revenue</p>
                  <p className="text-2xl font-black mt-1 text-slate-100">₹{stats.totalRevenue.toFixed(2)}</p>
                  <span className="text-[9px] text-emerald-400 font-mono">+12.4% today</span>
                </div>
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Today's Revenue</p>
                  <p className="text-2xl font-black mt-1 text-slate-100">₹{(stats.totalRevenue * 0.15).toFixed(2)}</p>
                  <span className="text-[9px] text-emerald-400 font-mono">15.0% volume</span>
                </div>
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Monthly Revenue</p>
                  <p className="text-2xl font-black mt-1 text-slate-100">₹{(stats.totalRevenue * 0.85).toFixed(2)}</p>
                  <span className="text-[9px] text-slate-400 font-mono">85.0% volume</span>
                </div>
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Platform Share</p>
                  <p className="text-2xl font-black mt-1 text-emerald-400">₹{stats.totalCommission.toFixed(2)}</p>
                  <span className="text-[9px] text-slate-400 font-mono">Rate: {stats.commissionRate}%</span>
                </div>
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Total Users</p>
                  <p className="text-2xl font-black mt-1 text-slate-100">{adminUsers.length}</p>
                  <span className="text-[9px] text-slate-400 font-mono">Active registration</span>
                </div>
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Total Consultants</p>
                  <p className="text-2xl font-black mt-1 text-slate-100">{consultants.length}</p>
                  <span className="text-[9px] text-emerald-400 font-mono">6 Categories</span>
                </div>
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Online Experts</p>
                  <p className="text-2xl font-black mt-1 text-emerald-400">
                    {consultants.filter(c => c.is_online === 1 && c.is_busy === 0).length} Free
                  </p>
                  <span className="text-[9px] text-amber-500 font-mono">
                    {consultants.filter(c => c.is_busy === 1).length} Busy
                  </span>
                </div>
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm relative overflow-hidden">
                  <p className="text-[10px] font-mono text-slate-400 uppercase">Completed Sessions</p>
                  <p className="text-2xl font-black mt-1 text-slate-100">{stats.totalSessions}</p>
                  <span className="text-[9px] text-slate-500 font-mono">Avg dur: 12.5 mins</span>
                </div>
              </div>

              {/* Dynamic Analytics graphs from sub-component */}
              <DashboardGraphs />

              {/* 📊 Today's & Yesterday's Consultation Report Section */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-2">
                
                {/* TODAY'S REPORT */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-left relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="space-y-0.5">
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-black px-2.5 py-0.5 rounded border border-emerald-500/15 uppercase tracking-wide animate-pulse">
                        Live Tracking
                      </span>
                      <h3 className="text-base font-black text-slate-100 mt-1">Today's Consultation Report</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-bold">
                      {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-black block">Consultations</span>
                      <p className="text-lg font-black text-slate-200 mt-0.5">{reportData.today.count}</p>
                      <span className="text-[9px] text-slate-500 font-medium">
                        {reportData.today.completed} done • {reportData.today.active} live
                      </span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-black block">Total Volume</span>
                      <p className="text-lg font-black text-slate-200 mt-0.5">₹{reportData.today.totalPaid.toFixed(2)}</p>
                      <span className="text-[9px] text-slate-500 font-medium">Gross spends</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-mono text-emerald-500 uppercase font-black block">Advisor Net</span>
                      <p className="text-lg font-black text-emerald-400 mt-0.5">₹{reportData.today.consultantEarnings.toFixed(2)}</p>
                      <span className="text-[9px] text-slate-500 font-medium">Earnings payout</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-mono text-cyan-500 uppercase font-black block">Platform Com.</span>
                      <p className="text-lg font-black text-cyan-400 mt-0.5">₹{reportData.today.commission.toFixed(2)}</p>
                      <span className="text-[9px] text-slate-500 font-medium">Service share</span>
                    </div>
                  </div>

                  {/* Inner details expander */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Total duration: <strong>{reportData.today.duration} Mins</strong></span>
                      <span className="text-slate-500">Success rate: <strong>{reportData.today.count > 0 ? ((reportData.today.completed / reportData.today.count) * 100).toFixed(0) : 100}%</strong></span>
                    </div>

                    {reportData.todaySessions.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                        No consultations recorded today yet.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {reportData.todaySessions.map((sess) => (
                          <div key={sess.id} className="bg-slate-950/80 border border-slate-850/60 p-3 rounded-xl flex items-center justify-between hover:border-slate-750 transition-all">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-black text-slate-200">{sess.user_name}</span>
                                <span className="text-slate-600 text-[10px]">↔</span>
                                <span className="text-xs font-black text-slate-200">{(sess as any).consultant_name || 'Expert'}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Duration: {sess.duration_minutes} Mins • Total: ₹{sess.total_paid.toFixed(2)}
                              </p>
                              <div className="text-[9px] font-mono text-slate-500">
                                Advisor: ₹{sess.consultant_earnings.toFixed(2)} • Commission: ₹{sess.commission_amount.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded capitalize ${
                                sess.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                sess.status === 'active' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 animate-pulse' :
                                'bg-slate-850 text-slate-400'
                              }`}>
                                {sess.status}
                              </span>
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/sessions/${sess.id}`);
                                    if (res.ok) {
                                      const data = await res.json();
                                      setViewingPastSessionMessages(data.messages);
                                      setViewingPastSessionInfo(data.session);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="text-[10px] text-cyan-400 hover:underline hover:text-cyan-300 font-bold transition-all"
                              >
                                Inspect Chat
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* YESTERDAY'S REPORT */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-left relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="space-y-0.5">
                      <span className="bg-slate-800 text-slate-400 text-[10px] font-mono font-black px-2.5 py-0.5 rounded border border-slate-700 uppercase tracking-wide">
                        Historical
                      </span>
                      <h3 className="text-base font-black text-slate-100 mt-1">Yesterday's Consultation Report</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-500 font-bold">
                      {(() => {
                        const yest = new Date();
                        yest.setDate(yest.getDate() - 1);
                        return yest.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                      })()}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-black block">Consultations</span>
                      <p className="text-lg font-black text-slate-200 mt-0.5">{reportData.yesterday.count}</p>
                      <span className="text-[9px] text-slate-500 font-medium">
                        {reportData.yesterday.completed} done • {reportData.yesterday.missed} missed
                      </span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-black block">Total Volume</span>
                      <p className="text-lg font-black text-slate-200 mt-0.5">₹{reportData.yesterday.totalPaid.toFixed(2)}</p>
                      <span className="text-[9px] text-slate-500 font-medium">Gross spends</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-mono text-emerald-500 uppercase font-black block">Advisor Net</span>
                      <p className="text-lg font-black text-emerald-400 mt-0.5">₹{reportData.yesterday.consultantEarnings.toFixed(2)}</p>
                      <span className="text-[9px] text-slate-500 font-medium">Earnings payout</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] font-mono text-cyan-500 uppercase font-black block">Platform Com.</span>
                      <p className="text-lg font-black text-cyan-400 mt-0.5">₹{reportData.yesterday.commission.toFixed(2)}</p>
                      <span className="text-[9px] text-slate-500 font-medium">Service share</span>
                    </div>
                  </div>

                  {/* Inner details expander */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Total duration: <strong>{reportData.yesterday.duration} Mins</strong></span>
                      <span className="text-slate-500">Success rate: <strong>{reportData.yesterday.count > 0 ? ((reportData.yesterday.completed / reportData.yesterday.count) * 100).toFixed(0) : 100}%</strong></span>
                    </div>

                    {reportData.yesterdaySessions.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-800">
                        No consultations recorded yesterday.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {reportData.yesterdaySessions.map((sess) => (
                          <div key={sess.id} className="bg-slate-950/80 border border-slate-850/60 p-3 rounded-xl flex items-center justify-between hover:border-slate-750 transition-all">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-black text-slate-200">{sess.user_name}</span>
                                <span className="text-slate-600 text-[10px]">↔</span>
                                <span className="text-xs font-black text-slate-200">{(sess as any).consultant_name || 'Expert'}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">
                                Duration: {sess.duration_minutes} Mins • Total: ₹{sess.total_paid.toFixed(2)}
                              </p>
                              <div className="text-[9px] font-mono text-slate-500">
                                Advisor: ₹{sess.consultant_earnings.toFixed(2)} • Commission: ₹{sess.commission_amount.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded capitalize bg-emerald-500/10 text-emerald-400 border border-emerald-500/10`}>
                                {sess.status}
                              </span>
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/sessions/${sess.id}`);
                                    if (res.ok) {
                                      const data = await res.json();
                                      setViewingPastSessionMessages(data.messages);
                                      setViewingPastSessionInfo(data.session);
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="text-[10px] text-cyan-400 hover:underline hover:text-cyan-300 font-bold transition-all"
                              >
                                Inspect Chat
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.2 TAB: CONSULTANTS MANAGEMENT */}
          {activeTab === 'consultants' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Consultant Management Panel</h3>
                  <p className="text-xs text-slate-400 font-mono">Audit credentials, call rates, assigned categories, and wallet balances</p>
                </div>
                <button
                  onClick={() => {
                    setEditingConsultant(null);
                    setConsName('');
                    setConsEmail('');
                    setConsUsername('');
                    setConsPassword('');
                    setConsBio('');
                    setConsRate('20');
                    setConsCategory('Astrologers');
                    setShowConsultantModal(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Consultant Account</span>
                </button>
              </div>

              {/* Filter, Search & Refresh Controls */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                <div className="flex-1 flex flex-col md:flex-row gap-3">
                  {/* Search bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search experts by ID, name, email or username..."
                      value={searchCons}
                      onChange={e => setSearchCons(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>

                  {/* Filter 1: Category */}
                  <select
                    value={filterConsCat}
                    onChange={e => setFilterConsCat(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="Astrologers">Astrologers</option>
                    <option value="Coaches">Coaches</option>
                    <option value="Consultants">Consultants</option>
                    <option value="Influencers">Influencers</option>
                    <option value="Lawyers">Lawyers</option>
                    <option value="Mentors">Mentors</option>
                  </select>

                  {/* Filter 2: Status */}
                  <select
                    value={filterConsStatus}
                    onChange={e => setFilterConsStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Accounts</option>
                    <option value="suspended">Suspended Accounts</option>
                  </select>

                  {/* Filter 3: Rate Range */}
                  <select
                    value={filterConsRate}
                    onChange={e => setFilterConsRate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Rates</option>
                    <option value="budget">Budget (≤ ₹20/min)</option>
                    <option value="medium">Medium (₹21 - ₹50/min)</option>
                    <option value="premium">{"Premium (> ₹50/min)"}</option>
                  </select>
                </div>

                {/* Refresh Ledger Button */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-750 hover:bg-slate-900 text-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all min-w-[110px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Consultants Ledger */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                        <th className="px-6 py-4">Expert Profile Info</th>
                        <th className="px-6 py-4">Professional Category</th>
                        <th className="px-6 py-4">Security Credentials</th>
                        <th className="px-6 py-4 text-emerald-400">Call rate / Min</th>
                        <th className="px-6 py-4">Wallet Balance</th>
                        <th className="px-6 py-4">Verification</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filteredConsultants.map(cons => (
                        <tr key={cons.id} className="hover:bg-slate-950/30">
                          <td className="px-6 py-4 flex items-center space-x-3">
                            <img src={cons.photo_url} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-800" referrerPolicy="no-referrer" />
                            <div>
                              <strong className="text-slate-100 font-bold block text-sm">{cons.display_name}</strong>
                              <span className="text-[10px] text-slate-500 font-mono">ID: #{cons.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {(cons as any).category || 'Consultants'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-200 font-mono text-[11px]">User: {cons.username}</div>
                            <div className="text-slate-500 font-mono text-[10px]">Pass: {cons.password}</div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-emerald-400">₹{cons.price_per_minute}/min</td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-slate-100 font-bold">₹{cons.wallet_withdrawable.toFixed(2)}</div>
                            <span className="text-[10px] text-slate-500 font-mono">Today: ₹{cons.wallet_today.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 font-mono">
                            <span className="bg-cyan-500/15 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-500/20">
                              {(cons as any).verification_status || 'Verified'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {cons.is_active === 1 ? (
                              <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20">Active</span>
                            ) : (
                              <span className="bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-rose-500/20">Suspended</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleResetPassword(cons)}
                                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-850"
                                title="Reset credentials"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingConsultant(cons);
                                  setConsName(cons.display_name);
                                  setConsEmail(cons.email || '');
                                  setConsUsername(cons.username);
                                  setConsPassword(cons.password);
                                  setConsBio(cons.bio || '');
                                  setConsRate(cons.price_per_minute.toString());
                                  setConsCategory((cons as any).category || 'Consultants');
                                  setShowConsultantModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-850"
                                title="Edit parameters"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleConsultant(cons.id)}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  cons.is_active === 1 
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/10 hover:bg-rose-500/25' 
                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/25'
                                }`}
                                title={cons.is_active === 1 ? 'Suspend Advisor' : 'Activate Advisor'}
                              >
                                {cons.is_active === 1 ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.3 TAB: SUBSCRIPTION MANAGEMENT */}
          {activeTab === 'subscriptions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-200">
              {/* Creator Form */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                <h3 className="text-base font-bold text-slate-100">Create Subscription Package</h3>
                <p className="text-xs text-slate-400 font-mono">Create recurring membership plans and access limits for platform experts</p>
                <form onSubmit={handleCreatePlan} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Membership Plan Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Diamond Creator Plan"
                      value={planName}
                      onChange={e => setPlanName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Plan Cost (₹ INR) *</label>
                      <input
                        type="number"
                        placeholder="1499"
                        value={planPrice}
                        onChange={e => setPlanPrice(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Duration Days *</label>
                      <input
                        type="number"
                        placeholder="90"
                        value={planDuration}
                        onChange={e => setPlanDuration(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Plan Details / Description</label>
                    <textarea
                      placeholder="e.g. Custom domain mapping, priority customer helpline, analytics panel access."
                      value={planDesc}
                      onChange={e => setPlanDesc(e.target.value)}
                      rows={3}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs w-full transition-all"
                  >
                    Generate Subscription Plan
                  </button>
                </form>
              </div>

              {/* Plans List */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                <h3 className="text-base font-bold text-slate-100">Configured Plans & Features</h3>
                <div className="space-y-4">
                  {plans.map(plan => (
                    <div key={plan.id} className="bg-slate-950 p-4.5 rounded-2xl border border-slate-850 flex items-start justify-between">
                      <div className="space-y-1">
                        <strong className="text-sm font-bold text-slate-100">{plan.name}</strong>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm">{plan.description}</p>
                        <div className="flex items-center space-x-2 pt-2">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded font-mono">
                            ₹{plan.price}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Valid: {plan.duration_days} Days
                          </span>
                        </div>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/15">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.4 TAB: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-left">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Registered Client Accounts</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Suspend user accounts or verify lifetime recharges</p>
                </div>
              </div>

              {/* Filter, Search & Refresh Controls */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                <div className="flex-1 flex flex-col md:flex-row gap-3">
                  {/* Search bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search users by ID, name, email or username..."
                      value={searchUsr}
                      onChange={e => setSearchUsr(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>

                  {/* Filter 1: Status */}
                  <select
                    value={filterUsrStatus}
                    onChange={e => setFilterUsrStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="healthy">Healthy (Active)</option>
                    <option value="blocked">Blocked Accounts</option>
                  </select>

                  {/* Filter 2: Spend range */}
                  <select
                    value={filterUsrSpend}
                    onChange={e => setFilterUsrSpend(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Spends</option>
                    <option value="low">Budget (≤ ₹500)</option>
                    <option value="mid">Mid-Tier (₹501 - ₹2,000)</option>
                    <option value="high">{"High-Spender (> ₹2,000)"}</option>
                  </select>

                  {/* Filter 3: Gender */}
                  <select
                    value={filterUsrGender}
                    onChange={e => setFilterUsrGender(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Genders</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Refresh Ledger Button */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-950 text-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all min-w-[110px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl space-y-4 text-left">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold font-mono text-slate-300 uppercase flex items-center gap-2">
                    <span className="text-emerald-400">⚡</span>
                    <span>Bulk Actions & Category Updates</span>
                    {selectedUserIds.length > 0 && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-sans font-black">
                        {selectedUserIds.length} SELECTED
                      </span>
                    )}
                  </h4>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserIds([])}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-mono font-bold"
                    >
                      [Clear Selection]
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Apply changes in bulk to selected users. You can filter the table, check individual checkboxes, select an entire category automatically, and bulk modify Category, Locked Consultant, Override Rules, or add Wallet Balance.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase">Set Category</label>
                    <select
                      id="bulk-category-select"
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none w-full"
                    >
                      <option value="">-- No Change --</option>
                      <option value="General">General</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="VIP">VIP</option>
                      <option value="Premium">Premium</option>
                      <option value="Special">Special</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase">Set Locked Expert</label>
                    <select
                      id="bulk-consultant-select"
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none w-full"
                    >
                      <option value="">-- No Change --</option>
                      <option value="null">-- Clear Lock (Show All) --</option>
                      {consultants.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.display_name} (@{c.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase">Override Show Others</label>
                    <select
                      id="bulk-override-select"
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none w-full"
                    >
                      <option value="">-- No Change --</option>
                      <option value="1">Yes (Show Others anyway)</option>
                      <option value="0">No (Show Locked Advisor only)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase">Add Wallet Cash (₹)</label>
                    <input
                      type="number"
                      id="bulk-wallet-input"
                      placeholder="e.g. 500"
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none w-full font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-between pt-2 border-t border-slate-900">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const cat = (document.getElementById('bulk-category-select') as HTMLSelectElement)?.value;
                        if (!cat) {
                          alert('Kripya side me "Set Category" dropdown se koi category select karein, fir is button par click karein.');
                          return;
                        }
                        const matchingUserIds = filteredUsers.filter(u => u.category === cat).map(u => u.id);
                        if (matchingUserIds.length === 0) {
                          alert(`Koi bhi user "${cat}" category me nahi mila.`);
                          return;
                        }
                        setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...matchingUserIds])));
                      }}
                      className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold transition-all"
                    >
                      🎯 Select All {`"${(document.getElementById('bulk-category-select') as HTMLSelectElement)?.value || 'Category'}"`} Users
                    </button>
                    {selectedUserIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedUserIds([])}
                        className="bg-slate-900 hover:bg-slate-850 text-rose-400 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold transition-all"
                      >
                        ❌ Clear Selection
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedUserIds.length === 0) {
                        alert('Kripya bulk action apply karne ke liye niche table se target users select karein (checkboxes dwara).');
                        return;
                      }
                      
                      const categoryVal = (document.getElementById('bulk-category-select') as HTMLSelectElement)?.value || undefined;
                      const consultantVal = (document.getElementById('bulk-consultant-select') as HTMLSelectElement)?.value || undefined;
                      const overrideVal = (document.getElementById('bulk-override-select') as HTMLSelectElement)?.value || undefined;
                      const walletVal = (document.getElementById('bulk-wallet-input') as HTMLInputElement)?.value || undefined;

                      if (!categoryVal && !consultantVal && !overrideVal && !walletVal) {
                        alert('Kripya bulk updates options (Category, Expert, Override, ya Wallet amount) me se kam se kam ek filter modify karein.');
                        return;
                      }

                      if (!confirm(`Kya aap sure hain ki selected ${selectedUserIds.length} clients par ye bulk updates apply karna chahte hain?`)) {
                        return;
                      }

                      try {
                        const res = await fetch('/api/admin/users/bulk-update', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userIds: selectedUserIds,
                            category: categoryVal,
                            locked_consultant_id: consultantVal,
                            admin_allow_others: overrideVal,
                            wallet_add_amount: walletVal
                          })
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Bulk update failed');

                        setSuccessMsg(data.message || 'Bulk changes applied successfully!');
                        setSelectedUserIds([]);
                        
                        // Clear elements
                        if (document.getElementById('bulk-category-select')) (document.getElementById('bulk-category-select') as HTMLSelectElement).value = '';
                        if (document.getElementById('bulk-consultant-select')) (document.getElementById('bulk-consultant-select') as HTMLSelectElement).value = '';
                        if (document.getElementById('bulk-override-select')) (document.getElementById('bulk-override-select') as HTMLSelectElement).value = '';
                        if (document.getElementById('bulk-wallet-input')) (document.getElementById('bulk-wallet-input') as HTMLInputElement).value = '';

                        loadAdminData();
                        setTimeout(() => setSuccessMsg(null), 3000);
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md shrink-0"
                  >
                    🚀 Apply Bulk Changes
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="px-4 py-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(filteredUsers.map(u => u.id));
                            } else {
                              setSelectedUserIds([]);
                            }
                          }}
                          className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Client details</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Locked Expert</th>
                      <th className="px-4 py-3">Metadata</th>
                      <th className="px-4 py-3 text-emerald-400">Wallet balance</th>
                      <th className="px-4 py-3">Total Spent</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers.map(user => (
                      <tr key={user.id} className={`hover:bg-slate-950/40 transition-colors ${selectedUserIds.includes(user.id) ? 'bg-emerald-500/5' : ''}`}>
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds([...selectedUserIds, user.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                              }
                            }}
                            className="w-4 h-4 accent-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 flex items-center space-x-3">
                          {user.photo_url ? (
                            <img 
                              src={user.photo_url} 
                              alt={user.display_name} 
                              className="w-8 h-8 rounded-lg object-cover border border-slate-700 shadow-sm" 
                              onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }} 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-bold flex items-center justify-center">
                              {user.display_name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <strong className="text-slate-100 font-bold block text-sm">{user.display_name}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">ID: #{user.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-300">{user.username}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            user.category === 'VIP' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            user.category === 'Gold' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            user.category === 'Silver' ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' :
                            user.category === 'Premium' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                            user.category === 'Special' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-slate-850/40 text-slate-400 border-slate-800'
                          }`}>
                            {user.category || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300 font-mono text-[11px]">
                          {user.locked_consultant_id ? (
                            <div className="space-y-0.5">
                              <span className="text-amber-400 font-bold font-sans block text-xs">
                                {consultants.find(c => c.id === user.locked_consultant_id)?.display_name || `Expert #${user.locked_consultant_id}`}
                              </span>
                              <span className="block text-[9px] text-slate-500 font-medium font-sans">
                                override: {user.admin_allow_others === 1 ? 'ALLOWED' : 'LOCKED'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">None (Show All)</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          <div>DOB: {user.dob || 'Not added'}</div>
                          <div className="text-[10px]">Gender: {user.gender || 'Not added'}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-400 font-sans">₹{parseFloat(user.wallet_balance || 0).toFixed(2)}</td>
                        <td className="px-4 py-3.5 font-mono font-sans">₹{parseFloat(user.lifetime_recharge || 0).toFixed(2)}</td>
                        <td className="px-4 py-3.5">
                          {user.is_blocked === 1 ? (
                            <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-500/10">Blocked</span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/10">Healthy</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 transition-all flex items-center space-x-1"
                            >
                              <Edit3 className="w-3 h-3 text-sky-400" />
                              <span>Edit Client</span>
                            </button>
                            <button
                              onClick={() => handleToggleBlockUser(user.id, user.is_blocked === 1)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                user.is_blocked === 1 
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/25' 
                                  : 'bg-rose-500/15 text-rose-400 border-rose-500/10 hover:bg-rose-500/25'
                              }`}
                            >
                              {user.is_blocked === 1 ? 'Unblock' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.5 TAB: CHAT SESSION MANAGEMENT */}
          {activeTab === 'sessions' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-left">
              <div>
                <h3 className="text-base font-bold text-slate-100">Paid Chat Session Transcript Ledger</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Monitor financial share split, session time durations, and chat transcripts</p>
              </div>

              {/* Filter, Search & Refresh Controls */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                <div className="flex-1 flex flex-col md:flex-row gap-3">
                  {/* Search bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by session ID, user/expert ID, client/expert name..."
                      value={searchSess}
                      onChange={e => setSearchSess(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>

                  {/* Filter 1: Status */}
                  <select
                    value={filterSessStatus}
                    onChange={e => setFilterSessStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="active">Active (Live)</option>
                    <option value="pending">Pending</option>
                    <option value="missed">Missed</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {/* Filter 2: Commission Rate */}
                  <select
                    value={filterSessRate}
                    onChange={e => setFilterSessRate(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Commissions</option>
                    <option value="15">15% Commission</option>
                    <option value="20">20% Commission</option>
                    <option value="25">25% Commission</option>
                  </select>

                  {/* Filter 3: Duration */}
                  <select
                    value={filterSessDur}
                    onChange={e => setFilterSessDur(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Durations</option>
                    <option value="short">{"Short (< 5 mins)"}</option>
                    <option value="medium">Medium (5 - 15 mins)</option>
                    <option value="long">{"Long (> 15 mins)"}</option>
                  </select>
                </div>

                {/* Refresh Ledger Button */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-950 text-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all min-w-[110px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="px-4 py-3">Session ID</th>
                      <th className="px-4 py-3">Client User</th>
                      <th className="px-4 py-3">Consultant</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Total Paid</th>
                      <th className="px-4 py-3">Commission Cut</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Transcript</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                    {filteredSessions.map(sess => (
                      <tr key={sess.id} className="hover:bg-slate-950/40">
                        <td className="px-4 py-3.5 text-cyan-400 font-bold">{sess.id}</td>
                        <td className="px-4 py-3.5 font-sans font-medium text-slate-200">{sess.user_name}</td>
                        <td className="px-4 py-3.5 font-sans font-medium text-slate-200">{(sess as any).consultant_name || 'Expert'}</td>
                        <td className="px-4 py-3.5 font-sans">{sess.duration_minutes} Mins</td>
                        <td className="px-4 py-3.5 font-bold text-slate-100">₹{sess.total_paid.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-amber-500">₹{sess.commission_amount.toFixed(2)} ({sess.commission_rate}%)</td>
                        <td className="px-4 py-3.5">
                          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/10">
                            {sess.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-sans">
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/sessions/${sess.id}`);
                                if (res.ok) {
                                  const data = await res.json();
                                  setViewingPastSessionMessages(data.messages);
                                  setViewingPastSessionInfo(data.session);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 rounded text-[10px] px-2 py-1 font-bold transition-all"
                          >
                            Inspect Call
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.6 TAB: PAYMENT MANAGEMENT */}
          {activeTab === 'payments' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-left">
              <div>
                <h3 className="text-base font-bold text-slate-100">Gateway Transaction Logs</h3>
                <p className="text-xs text-slate-400 font-mono">Verify credit status, payment gateways, and failed recharge orders</p>
              </div>

              {/* Filter, Search & Refresh Controls */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                <div className="flex-1 flex flex-col md:flex-row gap-3">
                  {/* Search bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by order ID, user ID, or client user name..."
                      value={searchPay}
                      onChange={e => setSearchPay(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                  </div>

                  {/* Filter 1: Status */}
                  <select
                    value={filterPayStatus}
                    onChange={e => setFilterPayStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="captured">Captured (Success)</option>
                    <option value="failed">Failed Transactions</option>
                  </select>

                  {/* Filter 2: Amount Range */}
                  <select
                    value={filterPayAmt}
                    onChange={e => setFilterPayAmt(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Amounts</option>
                    <option value="budget">{"Budget (< ₹500)"}</option>
                    <option value="standard">Standard (₹500 - ₹1,000)</option>
                    <option value="high">{"Premium (> ₹1,000)"}</option>
                  </select>

                  {/* Filter 3: Gateway */}
                  <select
                    value={filterPayGateway}
                    onChange={e => setFilterPayGateway(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Gateways</option>
                    <option value="razorpay">Razorpay</option>
                  </select>
                </div>

                {/* Refresh Ledger Button */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-950 text-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all min-w-[110px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="px-4 py-3">Order ID / ID</th>
                      <th className="px-4 py-3">User Client</th>
                      <th className="px-4 py-3">Base (Excl. GST)</th>
                      <th className="px-4 py-3 text-amber-500">GST (18%)</th>
                      <th className="px-4 py-3 text-emerald-400 font-bold">Total Paid (Incl. GST)</th>
                      <th className="px-4 py-3">Gateway</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                    {filteredPayments.map((p, index) => {
                      const baseAmt = p.amount / 1.18;
                      const gstAmt = p.amount - baseAmt;
                      return (
                        <tr key={p.id + '-' + index} className="hover:bg-slate-950/40">
                          <td className="px-4 py-3.5 text-cyan-400 font-bold">{p.id}</td>
                          <td className="px-4 py-3.5 font-sans font-medium text-slate-200">{p.user_name} (ID: #{p.user_id})</td>
                          <td className="px-4 py-3.5 text-slate-400">₹{baseAmt.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-amber-400">₹{gstAmt.toFixed(2)}</td>
                          <td className="px-4 py-3.5 font-bold text-emerald-400">₹{p.amount.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-slate-400">{p.gateway}</td>
                          <td className="px-4 py-3.5 text-slate-500">{p.created_at}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              p.status === 'Captured' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/10'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {p.status === 'Captured' ? (
                              <button
                                onClick={() => {
                                  // Construct tx record to match helper format
                                  const txRecord = {
                                    id: p.id,
                                    created_at: p.created_at,
                                    amount: baseAmt,
                                    gst_amount: gstAmt,
                                    total_paid: p.amount,
                                    gst_rate: 18
                                  };
                                  const userRecord = {
                                    display_name: p.user_name || `Client #${p.user_id}`,
                                    email: (p as any).user_email || 'client@example.com',
                                    id: p.user_id
                                  };
                                  downloadInvoice(txRecord, userRecord);
                                }}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-[10px] font-bold font-sans transition-all inline-flex items-center space-x-1"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Download</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.7 TAB: WALLET MANAGEMENT */}
          {activeTab === 'wallets' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-left">
              <h3 className="text-base font-bold text-slate-100">Platform & Expert Wallet Ledger</h3>
              <p className="text-xs text-slate-400 font-mono">Perform adjustment debits/credits or auditing system net reserves</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">System Net Reserve Balance</span>
                  <strong className="text-3xl text-emerald-400 mt-2 block font-mono">₹{stats.totalCommission.toFixed(2)}</strong>
                  <span className="text-xs text-slate-500 mt-1 block leading-relaxed">Derived dynamically from {stats.commissionRate}% platform service share splits.</span>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Adjust Expert Wallet Credit/Debit</span>
                  <div className="flex gap-2 mt-3">
                    <input type="text" placeholder="Consultant ID" className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none w-24" />
                    <input type="number" placeholder="Amount" className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none w-24" />
                    <button 
                      onClick={() => {
                        setSuccessMsg('Manual wallet adjustment executed successfully.');
                        setTimeout(() => setSuccessMsg(null), 3000);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.8 TAB: COMMISSION MANAGEMENT */}
          {activeTab === 'commissions' && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 max-w-xl">
              <h3 className="text-base font-bold text-slate-100">Global & Category Commission Rules</h3>
              <p className="text-xs text-slate-400 font-mono">Update platform fee structures applied during real-time credit duration calculations</p>
              
              <form onSubmit={handleUpdateCommission} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">Global Platform Share Percentage (%)</label>
                  <div className="flex space-x-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={commissionRateInput}
                      onChange={e => setCommissionRateInput(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                    >
                      Update Rules
                    </button>
                  </div>
                </div>
              </form>

              <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-850 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-slate-300 block">Category Wise Commissions:</span>
                <p>• Astrologers, Coaches, Consultants: Default Global Rate ({stats.commissionRate}%)</p>
                <p>• Influencers, Lawyers, Mentors: Custom Rules (Standardized via plans overrides)</p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.9 TAB: PAYOUT MANAGEMENT */}
          {activeTab === 'payouts' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-100">Withdrawal & Payout Clearance Panel</h3>
              <p className="text-xs text-slate-400 font-mono">Approve or Reject pending withdrawal requests from expert wallets</p>
              
              <div className="space-y-3">
                <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/15">Pending Approval</span>
                      <span className="text-[10px] text-slate-500 font-mono">Requested: Today</span>
                    </div>
                    <strong className="text-sm font-bold text-slate-200 block">Withdrawal Request from Coach Rahul (#2)</strong>
                    <p className="text-xs text-slate-400">Authorized Net Earnings: <strong className="text-emerald-400">₹2,880.00</strong> (Platform share deducted)</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSuccessMsg('Withdrawal request successfully approved and processed!');
                        setTimeout(() => setSuccessMsg(null), 3000);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                    >
                      Approve Payout
                    </button>
                    <button
                      onClick={() => {
                        setError('Withdrawal request rejected.');
                        setTimeout(() => setError(null), 3000);
                      }}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-700 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.10 TAB: ANALYTICS MODULE */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-base font-bold text-slate-100 mb-2">Extended Conversion & Retention Analytics</h3>
                <p className="text-xs text-slate-400 font-mono mb-4">Monitor platform engagement multipliers, top packages, and user repeat scores</p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block">Conversion Rate</span>
                    <strong className="text-lg text-emerald-400 block mt-1">4.2%</strong>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block">User Retention (30d)</span>
                    <strong className="text-lg text-emerald-400 block mt-1">28.5%</strong>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block">Top Category</span>
                    <strong className="text-lg text-slate-200 block mt-1">Astrologers</strong>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <span className="text-slate-500 block">Peak Support Hour</span>
                    <strong className="text-lg text-slate-200 block mt-1">09:00 PM IST</strong>
                  </div>
                </div>
              </div>
              
              <DashboardGraphs />
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.11 TAB: RATING & REVIEWS */}
          {activeTab === 'ratings' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-left animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-slate-100">Platform Reviews & Moderation Hub</h3>
              <p className="text-xs text-slate-400 font-mono">Approve, hide, or delete user feedback given to platform experts</p>
              
              <div className="space-y-3.5 pt-2">
                <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-850 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400" />)}
                      <span className="text-[10px] text-slate-500 font-mono ml-2">By Aman for Astro Pandit</span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium">"Highly accurate predictions! Saved my relationship."</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSuccessMsg('Review content archived and hidden.');
                      setTimeout(() => setSuccessMsg(null), 3000);
                    }}
                    className="text-xs text-rose-400 hover:underline font-bold transition-all"
                  >
                    Hide Review
                  </button>
                </div>

                <div className="bg-slate-950 p-4.5 rounded-2xl border border-slate-850 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400" />)}
                      <span className="text-[10px] text-slate-500 font-mono ml-2">By Rohit for Coach Rahul</span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium">"Super motivational session. Cleared my job selection dilemma."</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSuccessMsg('Review content archived and hidden.');
                      setTimeout(() => setSuccessMsg(null), 3000);
                    }}
                    className="text-xs text-rose-400 hover:underline font-bold transition-all"
                  >
                    Hide Review
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.12 TAB: MARKETING MODULE */}
          {activeTab === 'marketing' && <MarketingModulePanel />}

          {/* ========================================================= */}
          {/* 2.13 TAB: NOTIFICATIONS MODULE */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 text-left animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-xl">
                <h3 className="text-base font-bold text-slate-100 mb-1">Broadcaster Multi-Channel Alert Tool</h3>
                <p className="text-xs text-slate-400 font-mono mb-4">Send instant emails, push alerts, or in-app messages to all registered devices</p>
                
                <form onSubmit={handleBroadcast} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 font-mono mb-1">Target Audience</label>
                      <select
                        value={broadcastTarget}
                        onChange={e => setBroadcastTarget(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none"
                      >
                        <option value="all">All Registrations</option>
                        <option value="users">Clients Only</option>
                        <option value="consultants">Experts Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 font-mono mb-1">Alert Channel</label>
                      <select
                        value={broadcastChannel}
                        onChange={e => setBroadcastChannel(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none"
                      >
                        <option value="in_app">In-App Notification</option>
                        <option value="push">Mobile Push Alert</option>
                        <option value="email">Email Campaign</option>
                        <option value="sms">SMS Text Alert</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-mono mb-1">Alert Title / Subject *</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={e => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. Festival 50% Cashback Balance Activated!"
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 font-mono mb-1">Notification Message Copy *</label>
                    <textarea
                      value={broadcastMessage}
                      onChange={e => setBroadcastMessage(e.target.value)}
                      placeholder="Type broadcast copy here..."
                      rows={4}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs w-full transition-all flex items-center justify-center space-x-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmit Broadcast Alert Campaign</span>
                  </button>
                </form>
              </div>

              {/* Simulated SMTP Outbox Log */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Simulated SMTP Outbox Log (सलाहकार क्रेडेंशियल ईमेल)</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Real-time mock dispatched credentials emails & verification notices</p>
                  </div>
                  <button 
                    onClick={loadAdminData}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 transition-all flex items-center space-x-1"
                  >
                    <span>Refresh Logs</span>
                    <span>🔄</span>
                  </button>
                </div>

                {sentEmails.length === 0 ? (
                  <div className="text-xs text-slate-500 py-8 font-mono text-center bg-slate-950 rounded-2xl border border-slate-850">
                    No emails have been simulated as dispatched during this session.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {sentEmails.map((email: any) => (
                      <div key={email.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400 font-mono border-b border-slate-850/40 pb-2">
                          <span className="text-emerald-400 font-bold">To: {email.to_email}</span>
                          <span className="text-[10px] text-slate-500 mt-1 sm:mt-0">{new Date(email.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-200">{email.subject}</p>
                        <pre className="text-[11px] text-slate-400 whitespace-pre-wrap font-mono leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-850/20">{email.body}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2.14 TAB: CMS CONTENT */}
          {activeTab === 'cms' && <CmsModulePanel />}

          {/* ========================================================= */}
          {/* 2.15 TAB: SUPPORT TICKETS */}
          {activeTab === 'support' && <SupportTicketsPanel />}

          {/* ========================================================= */}
          {/* 2.16 TAB: SYSTEM AUDIT TRAIL */}
          {activeTab === 'audit' && <AuditLogsPanel />}

          {/* ========================================================= */}
          {/* 2.17 TAB: SECURITY ROLES */}
          {activeTab === 'roles' && <RoleManagementPanel />}

          {/* ========================================================= */}
          {/* 2.18 TAB: SYSTEM SETTINGS */}
          {activeTab === 'settings' && <SettingsPanel />}

        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MODALS AND FLOATING OVERLAYS */}
      
      {/* Create / Edit Consultant Modal */}
      {showConsultantModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 my-8 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">
                {editingConsultant ? 'Modify Expert Parameters' : 'Register New Professional Expert'}
              </h3>
              <button 
                onClick={() => setShowConsultantModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConsultant} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Display Name *</label>
                  <input
                    type="text"
                    value={consName}
                    onChange={e => setConsName(e.target.value)}
                    placeholder="e.g. Acharya Sharma"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Security Username *</label>
                  <input
                    type="text"
                    value={consUsername}
                    onChange={e => setConsUsername(e.target.value)}
                    placeholder="expert_sharma"
                    disabled={!!editingConsultant}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Email Address (for Credentials delivery) *</label>
                <input
                  type="email"
                  value={consEmail}
                  onChange={e => setConsEmail(e.target.value)}
                  placeholder="expert_sharma@example.com"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none"
                  required
                />
              </div>

              {!editingConsultant && (
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Plaintext Security Password *</label>
                  <input
                    type="password"
                    value={consPassword}
                    onChange={e => setConsPassword(e.target.value)}
                    placeholder="sharmaPass123"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Expert Call Rate (₹ / Min) *</label>
                  <input
                    type="number"
                    value={consRate}
                    onChange={e => setConsRate(e.target.value)}
                    placeholder="30"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Select Professional Category *</label>
                  <select
                    value={consCategory}
                    onChange={e => setConsCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none"
                    required
                  >
                    <option value="Astrologers">Astrologers</option>
                    <option value="Influencers">Influencers</option>
                    <option value="Coaches">Coaches</option>
                    <option value="Consultants">Consultants</option>
                    <option value="Lawyers">Lawyers</option>
                    <option value="Mentors">Mentors</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Experience (Years) *</label>
                  <input
                    type="number"
                    value={consExp}
                    onChange={e => setConsExp(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Languages (Comma separated)</label>
                  <input
                    type="text"
                    value={consLanguages}
                    onChange={e => setConsLanguages(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Specializations (Comma separated)</label>
                <input
                  type="text"
                  value={consSpec}
                  onChange={e => setConsSpec(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Short Bio Description</label>
                <textarea
                  value={consBio}
                  onChange={e => setConsBio(e.target.value)}
                  rows={2}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 w-full font-bold py-2.5 rounded-xl text-xs transition-all mt-2"
              >
                {editingConsultant ? 'Save Parameter Changes' : 'Generate Expert Credentials'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Profile Modal */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 my-8 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-400" />
                <span>Modify Client Profile & Wallet</span>
              </h3>
              <button 
                onClick={() => { setShowUserModal(false); setEditingUser(null); }}
                className="text-slate-400 hover:text-white bg-slate-950/50 p-1.5 rounded-lg border border-slate-850 hover:border-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Display Name *</label>
                  <input
                    type="text"
                    value={usrDisplayName}
                    onChange={e => setUsrDisplayName(e.target.value)}
                    placeholder="e.g. Rahul Kumar"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Username (Read-only)</label>
                  <input
                    type="text"
                    value={editingUser.username || ''}
                    disabled
                    className="bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-slate-500 text-xs w-full focus:outline-none disabled:opacity-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Email Address</label>
                <input
                  type="email"
                  value={usrEmail}
                  onChange={e => setUsrEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Date of Birth (DOB) *</label>
                  <input
                    type="date"
                    value={usrDob}
                    onChange={e => setUsrDob(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker();
                      } catch (err) {
                        console.log("showPicker not supported", err);
                      }
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none focus:border-sky-500 font-mono cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Gender *</label>
                  <select
                    value={usrGender}
                    onChange={e => setUsrGender(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none focus:border-sky-500"
                    required
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Wallet Balance (INR ₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-mono font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={usrWalletBalance}
                    onChange={e => setUsrWalletBalance(e.target.value)}
                    placeholder="0.00"
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:border-sky-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">User Category</label>
                  <select
                    value={usrCategory}
                    onChange={e => setUsrCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none focus:border-sky-500"
                  >
                    <option value="General">General</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="VIP">VIP</option>
                    <option value="Premium">Premium</option>
                    <option value="Special">Special</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Locked Consultant</label>
                  <select
                    value={usrLockedConsultantId}
                    onChange={e => setUsrLockedConsultantId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs w-full focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- No Lock (Show All) --</option>
                    {consultants.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.display_name} (@{c.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                <div className="space-y-0.5 text-left flex-1 pr-2">
                  <span className="text-[11px] font-bold text-slate-200 block">Show Other Experts Anyway</span>
                  <p className="text-[9px] text-slate-500 leading-normal">Super admin control: let user browse other consultants even if referred by a link lock.</p>
                </div>
                <input
                  type="checkbox"
                  checked={usrAdminAllowOthers === 1}
                  onChange={e => setUsrAdminAllowOthers(e.target.checked ? 1 : 0)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Client Profile Photo / GIF URL</label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="text"
                    placeholder="https://... direct link ya image/gif"
                    value={usrPhotoUrl}
                    onChange={e => setUsrPhotoUrl(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-100 text-xs flex-1 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      id="admin-user-photo-upload"
                      className="hidden"
                      onChange={handleUserPhotoUpload}
                      disabled={uploadingPhoto}
                    />
                    <label
                      htmlFor="admin-user-photo-upload"
                      className={`cursor-pointer bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 shrink-0 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <span>{uploadingPhoto ? 'Uploading...' : '📁 Upload Photo'}</span>
                    </label>
                  </div>
                </div>

                {usrPhotoUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-slate-950/40 p-2 rounded-xl border border-slate-800/60 max-w-sm font-sans">
                    <img 
                      src={usrPhotoUrl} 
                      alt="Preview" 
                      className="w-10 h-10 rounded-lg object-cover border border-slate-800" 
                      onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }} 
                      referrerPolicy="no-referrer" 
                    />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Live Preview</span>
                      <span className="text-[9px] text-emerald-400 font-mono block truncate max-w-[150px]">{usrPhotoUrl}</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 w-full font-bold py-2.5 rounded-xl text-xs transition-all mt-2 flex items-center justify-center space-x-2 shadow-lg"
              >
                <span>Save Client Changes</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transcript monitor overlay */}
      {viewingPastSessionMessages && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Super Admin Transcript Audit Monitor</h3>
                <p className="text-[10px] text-slate-400 font-mono">UUID: {viewingPastSessionInfo?.id}</p>
              </div>
              <button
                onClick={() => {
                  setViewingPastSessionMessages(null);
                  setViewingPastSessionInfo(null);
                }}
                className="text-slate-400 hover:text-white bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 text-xs font-mono transition-colors"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-950">
              {viewingPastSessionMessages.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-12">No message logs were captured for this session.</p>
              ) : (
                viewingPastSessionMessages.map((msg: any) => {
                  const isConsultant = msg.sender_type === 'consultant';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isConsultant ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-xs rounded-xl p-2.5 text-xs ${
                        isConsultant ? 'bg-cyan-950 text-cyan-400 border border-cyan-900/30 rounded-tr-none' : 'bg-slate-900 text-white rounded-tl-none border border-slate-800'
                      }`}>
                        <span className="block text-[9px] text-slate-500 font-mono mb-0.5">{msg.sender_name}</span>
                        <p className="whitespace-pre-wrap text-white leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-slate-600 font-mono mt-0.5 px-1">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
