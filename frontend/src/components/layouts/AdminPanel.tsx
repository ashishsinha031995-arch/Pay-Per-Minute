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

  // Load backend datasets
  const loadAdminData = async () => {
    try {
      setLoading(true);
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

  // Broadcaster tool simulation
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    setSuccessMsg(`Broadcast message trigger fired to ${broadcastTarget} via ${broadcastChannel.toUpperCase()} channel!`);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

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
                      {consultants.map(cons => (
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Registered Client Accounts</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Suspend user accounts or verify lifetime recharges</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="px-4 py-3">Client details</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Metadata</th>
                      <th className="px-4 py-3 text-emerald-400">Wallet balance</th>
                      <th className="px-4 py-3">Total Spent</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {adminUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-950/40">
                        <td className="px-4 py-3.5 flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-bold flex items-center justify-center">
                            {user.display_name.slice(0, 1)}
                          </div>
                          <div>
                            <strong className="text-slate-100 font-bold block text-sm">{user.display_name}</strong>
                            <span className="text-[10px] text-slate-500">ID: #{user.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-300">{user.username}</td>
                        <td className="px-4 py-3.5 text-slate-400">
                          <div>DOB: {user.dob || 'Not added'}</div>
                          <div className="text-[10px]">Gender: {user.gender || 'Not added'}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">₹{parseFloat(user.wallet_balance || 0).toFixed(2)}</td>
                        <td className="px-4 py-3.5 font-mono">₹{parseFloat(user.lifetime_recharge || 0).toFixed(2)}</td>
                        <td className="px-4 py-3.5">
                          {user.is_blocked === 1 ? (
                            <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-500/10">Blocked</span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/10">Healthy</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleToggleBlockUser(user.id, user.is_blocked === 1)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                              user.is_blocked === 1 
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/25' 
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/10 hover:bg-rose-500/25'
                            }`}
                          >
                            {user.is_blocked === 1 ? 'Unblock Account' : 'Suspend Account'}
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
          {/* 2.5 TAB: CHAT SESSION MANAGEMENT */}
          {activeTab === 'sessions' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Paid Chat Session Transcript Ledger</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Monitor financial share split, session time durations, and chat transcripts</p>
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
                    {sessions.map(sess => (
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
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-100">Gateway Transaction Logs</h3>
              <p className="text-xs text-slate-400 font-mono">Verify credit status, payment gateways, and failed recharge orders</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="px-4 py-3">Order ID / ID</th>
                      <th className="px-4 py-3">User Client</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Gateway</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                    <tr className="hover:bg-slate-950/40">
                      <td className="px-4 py-3.5 text-cyan-400 font-bold">order_K8dJws92</td>
                      <td className="px-4 py-3.5 font-sans font-medium text-slate-200">Aman Kumar</td>
                      <td className="px-4 py-3.5 font-bold text-slate-100">₹500.00</td>
                      <td className="px-4 py-3.5 text-slate-400">Razorpay</td>
                      <td className="px-4 py-3.5 text-slate-500">2026-06-25 00:05</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/10">Captured</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-950/40">
                      <td className="px-4 py-3.5 text-cyan-400 font-bold">order_G3vKw812</td>
                      <td className="px-4 py-3.5 font-sans font-medium text-slate-200">Sanya Mehta</td>
                      <td className="px-4 py-3.5 font-bold text-slate-100">₹1,000.00</td>
                      <td className="px-4 py-3.5 text-slate-400">Razorpay</td>
                      <td className="px-4 py-3.5 text-slate-500">2026-06-24 18:30</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/10">Failed</span>
                      </td>
                    </tr>
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
