import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  LineChart, Line, BarChart, Bar, Legend, ComposedChart 
} from 'recharts';
import { 
  Plus, Trash2, Edit, Check, X, Shield, Lock, Trash, HelpCircle, 
  Send, Bell, Mail, Phone, MessageSquare, AlertCircle, RefreshCw, Sparkles, AlertTriangle,
  Filter, Calendar, TrendingUp, CreditCard, ChevronRight, ShoppingCart, Percent, Layers, Landmark, Info,
  Award, Search, Users, Wallet, Coins, Eye, Clock, CheckCircle, Upload, Image
} from 'lucide-react';
import { 
  revenueTrendData, growthTrendData, packageSalesData, 
  mockAuditLogs, mockSupportTickets, initialCoupons, mockBlogPages, systemRolesList,
  dailyRevenueTrendData, weeklyRevenueTrendData, dailySubscriptionSalesData,
  DailyRevenueData, WeeklyRevenueData
} from './AdminMockData';
import { compressImageBase64 } from '../../utils/helpers';

interface DashboardGraphsProps {
  consultants?: any[];
  sessions?: any[];
  users?: any[];
}

// Component 1: ANALYTICS & GRAPHS
export function DashboardGraphs({ consultants = [], sessions = [], users = [] }: DashboardGraphsProps) {
  // 1. Revenue & Commission Filters State
  const [revenueTimeframe, setRevenueTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [revDateFilter, setRevDateFilter] = useState<'all' | '7days' | '14days'>('all');
  const [minRevenue, setMinRevenue] = useState<number>(0);
  const [simulatedCommissionRate, setSimulatedCommissionRate] = useState<number>(20); // default platform commission is 20%
  
  // 2. Subscription Filters State
  const [subDateFilter, setSubDateFilter] = useState<'all' | '7days' | '14days'>('all');
  const [minSubsSold, setMinSubsSold] = useState<number>(0);
  const [showPlansBreakdown, setShowPlansBreakdown] = useState<boolean>(true);

  // 2.5 Category & User Segmentation States
  const [selectedBreakdownCategory, setSelectedBreakdownCategory] = useState<string>('all');
  const [breakdownSearch, setBreakdownSearch] = useState<string>('');
  const [breakdownSort, setBreakdownSort] = useState<'rev-desc' | 'rev-asc' | 'sessions' | 'name'>('rev-desc');
  const [categoryTimeframe, setCategoryTimeframe] = useState<'daily' | '15days' | 'monthly' | 'lifetime'>('monthly');

  // 3. Tab State for raw data table
  const [showDataTable, setShowDataTable] = useState<boolean>(false);
  const [dataTableTab, setDataTableTab] = useState<'revenue' | 'subscriptions'>('revenue');

  // --- REVENUE FILTERING LOGIC ---
  const dynamicDailyRevenueTrend: DailyRevenueData[] = React.useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; commission: number; payouts: number; transactionsCount: number }>();
    
    // Sort sessions chronologically by default
    const sortedSessions = [...sessions].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    
    sortedSessions.forEach((s: any) => {
      if (s.status === 'completed' && s.created_at) {
        // Extract YYYY-MM-DD
        const dateStr = s.created_at.slice(0, 10);
        const rev = Number(s.total_paid || 0);
        const comm = Number(s.commission_amount || 0);
        const pay = Number(s.consultant_earnings || 0);
        
        const existing = map.get(dateStr);
        if (existing) {
          existing.revenue += rev;
          existing.commission += comm;
          existing.payouts += pay;
          existing.transactionsCount += 1;
        } else {
          map.set(dateStr, {
            date: dateStr,
            revenue: rev,
            commission: comm,
            payouts: pay,
            transactionsCount: 1
          });
        }
      }
    });
    
    if (map.size === 0) {
      return dailyRevenueTrendData;
    }
    
    return Array.from(map.values());
  }, [sessions]);

  const dynamicWeeklyRevenueTrend: WeeklyRevenueData[] = React.useMemo(() => {
    const map = new Map<string, { week: string; revenue: number; commission: number; payouts: number; transactionsCount: number }>();
    
    // Group sessions by week
    const sortedSessions = [...sessions].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    
    sortedSessions.forEach((s: any) => {
      if (s.status === 'completed' && s.created_at) {
        const d = new Date(s.created_at);
        const day = d.getDay();
        // Calculate Monday of the week
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        const formatOption: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit' };
        const mondayStr = monday.toLocaleDateString('en-US', formatOption);
        const sundayStr = sunday.toLocaleDateString('en-US', formatOption);
        const weekLabel = `Wk ${mondayStr} - ${sundayStr}`;
        
        const rev = Number(s.total_paid || 0);
        const comm = Number(s.commission_amount || 0);
        const pay = Number(s.consultant_earnings || 0);
        
        const existing = map.get(weekLabel);
        if (existing) {
          existing.revenue += rev;
          existing.commission += comm;
          existing.payouts += pay;
          existing.transactionsCount += 1;
        } else {
          map.set(weekLabel, {
            week: weekLabel,
            revenue: rev,
            commission: comm,
            payouts: pay,
            transactionsCount: 1
          });
        }
      }
    });
    
    if (map.size === 0) {
      return weeklyRevenueTrendData;
    }
    
    return Array.from(map.values());
  }, [sessions]);

  const rawRevData = revenueTimeframe === 'daily' ? dynamicDailyRevenueTrend : dynamicWeeklyRevenueTrend;
  
  const filteredRevData = rawRevData.filter((item, index) => {
    // A. Apply Date Range Filter
    if (revenueTimeframe === 'daily') {
      if (revDateFilter === '7days' && index < rawRevData.length - 7) return false;
      if (revDateFilter === '14days' && index < rawRevData.length - 14) return false;
    } else {
      // For weekly data, '7days' acts as last 4 weeks, '14days' as last 6 weeks
      if (revDateFilter === '7days' && index < rawRevData.length - 4) return false;
      if (revDateFilter === '14days' && index < rawRevData.length - 6) return false;
    }
    
    // B. Apply Minimum Revenue Filter
    if (item.revenue < minRevenue) return false;
    
    return true;
  }).map(item => {
    // C. Apply Simulated Commission calculations dynamically
    const simulatedComm = Math.round(item.revenue * (simulatedCommissionRate / 100));
    const simulatedPay = item.revenue - simulatedComm;
    return {
      ...item,
      // Overwrite or add simulated fields
      commission: simulatedComm,
      payouts: simulatedPay,
    };
  });

  // Calculate totals for summary cards based on active filtered revenue data
  const totalPeriodRevenue = filteredRevData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalPeriodCommission = filteredRevData.reduce((acc, curr) => acc + curr.commission, 0);
  const totalPeriodPayouts = filteredRevData.reduce((acc, curr) => acc + curr.payouts, 0);
  const totalPeriodTransactions = filteredRevData.reduce((acc, curr) => acc + curr.transactionsCount, 0);

  // --- SUBSCRIPTIONS FILTERING LOGIC ---
  const filteredSubData = dailySubscriptionSalesData.filter((item, index) => {
    // A. Apply Date Range Filter
    if (subDateFilter === '7days' && index < dailySubscriptionSalesData.length - 7) return false;
    if (subDateFilter === '14days' && index < dailySubscriptionSalesData.length - 14) return false;

    // B. Apply Min Subscriptions Sold Filter
    if (item.subscriptionsSold < minSubsSold) return false;

    return true;
  });

  // Calculate totals for subscriptions
  const totalSubsSold = filteredSubData.reduce((acc, curr) => acc + curr.subscriptionsSold, 0);
  const totalSubRevenue = filteredSubData.reduce((acc, curr) => acc + curr.subscriptionRevenue, 0);
  const totalSilverSold = filteredSubData.reduce((acc, curr) => acc + curr.silverSold, 0);
  const totalGoldSold = filteredSubData.reduce((acc, curr) => acc + curr.goldSold, 0);
  const totalPlatinumSold = filteredSubData.reduce((acc, curr) => acc + curr.platinumSold, 0);

  // --- DYNAMIC ADVISOR CATEGORY REVENUE CALCULATIONS ---
  const normalizeCategory = (cat: string) => {
    if (!cat) return 'Consultants';
    const c = cat.trim();
    // Normalize singular and plural versions of standard categories
    const mapping: Record<string, string> = {
      'Astrologer': 'Astrologers',
      'Astrologers': 'Astrologers',
      'Influencer': 'Influencers',
      'Influencers': 'Influencers',
      'Mentor': 'Mentors',
      'Mentors': 'Mentors',
      'Doctor': 'Doctors',
      'Doctors': 'Doctors',
      'Lawyer': 'Lawyers',
      'Lawyers': 'Lawyers',
      'Singer': 'Singers',
      'Singers': 'Singers',
      'Advisor': 'Advisors',
      'Advisors': 'Advisors',
      'Friend': 'Friends',
      'Friends': 'Friends',
      'Coach': 'Coaches',
      'Coaches': 'Coaches',
      'Consultant': 'Consultants',
      'Consultants': 'Consultants'
    };
    return mapping[c] || c;
  };

  const consultantCategoryMap: Record<number, string> = {};
  consultants.forEach((c: any) => {
    consultantCategoryMap[c.id] = normalizeCategory(c.category || 'Consultants');
  });

  const checkSessionTimeframe = (createdAtStr: string, timeframe: 'monthly' | 'daily' | '15days' | 'lifetime') => {
    if (timeframe === 'lifetime') return true;
    if (!createdAtStr) return false;
    const sDate = new Date(createdAtStr);
    if (isNaN(sDate.getTime())) return false;
    
    // We establish our base reference "now" as the maximum of actual current time and June 30, 2026 (seed reference time)
    const seedRefDate = new Date('2026-06-30T12:55:55-07:00');
    const now = new Date().getTime() > seedRefDate.getTime() ? new Date() : seedRefDate;
    
    const diffMs = now.getTime() - sDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (timeframe === 'daily') return diffDays <= 1;
    if (timeframe === '15days') return diffDays <= 15;
    if (timeframe === 'monthly') return diffDays <= 30;
    return true;
  };

  const consultantLifetimeRev: Record<number, number> = {};
  const consultantFilteredRev: Record<number, number> = {};
  const consultantFilteredSessionCount: Record<number, number> = {};
  const consultantUniqueUsers: Record<number, Set<number>> = {};

  sessions.forEach((s: any) => {
    if (s.status === 'completed') {
      const consId = Number(s.consultant_id);
      const totalPaid = Number(s.total_paid || 0);
      const userId = Number(s.user_id);
      
      consultantLifetimeRev[consId] = (consultantLifetimeRev[consId] || 0) + totalPaid;
      
      if (!consultantUniqueUsers[consId]) {
        consultantUniqueUsers[consId] = new Set<number>();
      }
      consultantUniqueUsers[consId].add(userId);

      if (checkSessionTimeframe(s.created_at, categoryTimeframe)) {
        consultantFilteredRev[consId] = (consultantFilteredRev[consId] || 0) + totalPaid;
        consultantFilteredSessionCount[consId] = (consultantFilteredSessionCount[consId] || 0) + 1;
      }
    }
  });

  const categoriesList = ['Astrologers', 'Influencers', 'Mentors', 'Doctors', 'Lawyers', 'Singers', 'Advisors', 'Friends', 'Coaches', 'Consultants'];
  const categoryDataMap: Record<string, { 
    category: string; 
    monthlyRev: number; 
    lifetimeRev: number; 
    consultantCount: number; 
    sessionCount: number;
    signupCount: number;
    consultationUserCount: number;
  }> = {};

  categoriesList.forEach(cat => {
    categoryDataMap[cat] = { 
      category: cat, 
      monthlyRev: 0, 
      lifetimeRev: 0, 
      consultantCount: 0, 
      sessionCount: 0,
      signupCount: 0,
      consultationUserCount: 0
    };
  });

  consultants.forEach((c: any) => {
    const cat = normalizeCategory(c.category || 'Consultants');
    if (!categoryDataMap[cat]) {
      categoryDataMap[cat] = { 
        category: cat, 
        monthlyRev: 0, 
        lifetimeRev: 0, 
        consultantCount: 0, 
        sessionCount: 0,
        signupCount: 0,
        consultationUserCount: 0
      };
    }
    
    const sessLifetime = consultantLifetimeRev[c.id] || 0;
    const sessFiltered = consultantFilteredRev[c.id] || 0;
    
    // Fallback based on pre-seeded wallet totals
    const fallbackLifetime = Number(c.wallet_total || 0) * 1.25;
    const fallbackMonthly = Number(c.wallet_monthly || 0) * 1.25;
    
    let fallbackFiltered = fallbackMonthly;
    if (categoryTimeframe === 'daily') {
      fallbackFiltered = fallbackMonthly / 30;
    } else if (categoryTimeframe === '15days') {
      fallbackFiltered = fallbackMonthly / 2;
    } else if (categoryTimeframe === 'lifetime') {
      fallbackFiltered = fallbackLifetime;
    }
    
    const lifetimeRev = sessLifetime > 0 ? sessLifetime : fallbackLifetime;
    const filteredRev = sessFiltered > 0 ? sessFiltered : fallbackFiltered;
    
    categoryDataMap[cat].lifetimeRev += Math.round(lifetimeRev);
    categoryDataMap[cat].monthlyRev += Math.round(filteredRev);
    categoryDataMap[cat].consultantCount += 1;
    categoryDataMap[cat].sessionCount += (consultantFilteredSessionCount[c.id] || 0);
  });

  // Calculate unique user signups and consultation counts per category
  const categoryUniqueUsersSet: Record<string, Set<number>> = {};
  categoriesList.forEach(cat => {
    categoryUniqueUsersSet[cat] = new Set<number>();
  });

  sessions.forEach((s: any) => {
    if (s.status === 'completed') {
      const consId = Number(s.consultant_id);
      const cat = consultantCategoryMap[consId];
      if (cat && categoryUniqueUsersSet[cat]) {
        categoryUniqueUsersSet[cat].add(Number(s.user_id));
      }
    }
  });

  const userCategorySignupCounts: Record<string, number> = {};
  categoriesList.forEach(cat => {
    userCategorySignupCounts[cat] = 0;
  });

  users.forEach((u: any) => {
    const userDirectCat = normalizeCategory(u.category || 'General');
    if (categoriesList.includes(userDirectCat)) {
      userCategorySignupCounts[userDirectCat] += 1;
    } else {
      const lockedId = Number(u.locked_consultant_id);
      if (lockedId && consultantCategoryMap[lockedId]) {
        const lockedCat = consultantCategoryMap[lockedId];
        userCategorySignupCounts[lockedCat] += 1;
      } else {
        const userSess = sessions.filter(s => s.status === 'completed' && Number(s.user_id) === u.id);
        if (userSess.length > 0) {
          const firstCat = consultantCategoryMap[Number(userSess[0].consultant_id)];
          if (firstCat && userCategorySignupCounts[firstCat] !== undefined) {
            userCategorySignupCounts[firstCat] += 1;
          } else {
            userCategorySignupCounts['Consultants'] += 1;
          }
        } else {
          // Beautiful distribution of mock users based on user ID modulo
          const index = u.id % categoriesList.length;
          const randomCat = categoriesList[index];
          userCategorySignupCounts[randomCat] += 1;
        }
      }
    }
  });

  categoriesList.forEach(cat => {
    if (categoryDataMap[cat]) {
      categoryDataMap[cat].signupCount = userCategorySignupCounts[cat] || 0;
      categoryDataMap[cat].consultationUserCount = categoryUniqueUsersSet[cat]?.size || 0;
    }
  });

  const categoryRevenueData = Object.values(categoryDataMap);

  let topCategory = { category: 'None', revenue: 0 };
  categoryRevenueData.forEach(item => {
    if (item.lifetimeRev > topCategory.revenue) {
      topCategory = { category: item.category, revenue: item.lifetimeRev };
    }
  });

  const totalCatMonthlyRevenue = categoryRevenueData.reduce((acc, curr) => acc + curr.monthlyRev, 0);
  const totalCatLifetimeRevenue = categoryRevenueData.reduce((acc, curr) => acc + curr.lifetimeRev, 0);

  // Compute consultant breakdown data
  const consultantBreakdownList = consultants.map((c: any) => {
    const sessLifetime = consultantLifetimeRev[c.id] || 0;
    const sessMonthly = consultantFilteredRev[c.id] || 0;
    const fallbackLifetime = Number(c.wallet_total || 0) * 1.25;
    const fallbackMonthly = Number(c.wallet_monthly || 0) * 1.25;

    const lifetimeRev = sessLifetime > 0 ? sessLifetime : fallbackLifetime;
    const monthlyRev = sessMonthly > 0 ? sessMonthly : fallbackMonthly;

    return {
      id: c.id,
      display_name: c.display_name,
      username: c.username,
      category: normalizeCategory(c.category || 'Consultants'),
      photo_url: c.photo_url,
      sessionsCount: consultantFilteredSessionCount[c.id] || 0,
      monthlyRev: Math.round(monthlyRev),
      lifetimeRev: Math.round(lifetimeRev),
    };
  });

  const filteredBreakdownList = consultantBreakdownList.filter(item => {
    const matchesCategory = selectedBreakdownCategory === 'all' || item.category === selectedBreakdownCategory;
    const matchesSearch = item.display_name.toLowerCase().includes(breakdownSearch.toLowerCase()) || 
                          item.username.toLowerCase().includes(breakdownSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  filteredBreakdownList.sort((a, b) => {
    if (breakdownSort === 'rev-desc') return b.lifetimeRev - a.lifetimeRev;
    if (breakdownSort === 'rev-asc') return a.lifetimeRev - b.lifetimeRev;
    if (breakdownSort === 'sessions') return b.sessionsCount - a.sessionsCount;
    if (breakdownSort === 'name') return a.display_name.localeCompare(b.display_name);
    return 0;
  });

  // --- DYNAMIC USER CATEGORY CALCULATIONS ---
  const userCategoriesList = ['General', 'VIP', 'Gold', 'Silver', 'Premium', 'Special'];
  const userCategoryDataMap: Record<string, { category: string; count: number; totalSpent: number }> = {};

  userCategoriesList.forEach(cat => {
    userCategoryDataMap[cat] = { category: cat, count: 0, totalSpent: 0 };
  });

  users.forEach((u: any) => {
    const cat = u.category || 'General';
    if (!userCategoryDataMap[cat]) {
      userCategoryDataMap[cat] = { category: cat, count: 0, totalSpent: 0 };
    }
    userCategoryDataMap[cat].count += 1;
    userCategoryDataMap[cat].totalSpent += Number(u.total_spent || 0);
  });

  const totalUsersCount = users.length || 1;
  const userCategoryData = Object.values(userCategoryDataMap).map(item => ({
    ...item,
    percentage: Math.round((item.count / totalUsersCount) * 100)
  }));

  let mostPopulatedUserCategory = { category: 'None', count: 0, percentage: 0 };
  userCategoryData.forEach(item => {
    if (item.count > mostPopulatedUserCategory.count) {
      mostPopulatedUserCategory = { category: item.category, count: item.count, percentage: Math.round((item.count / totalUsersCount) * 100) };
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200 text-left">
      
      {/* 1. SUPER ADMIN EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        
        {/* KPI: Consulting Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-emerald-500" />
          </div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Consulting Revenue</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">₹{totalPeriodRevenue.toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-mono text-slate-500">for selected period</span>
          </div>
          <div className="mt-3.5 pt-3.5 border-t border-slate-800/60 flex justify-between items-center text-xs">
            <span className="text-slate-400">Total Consultations:</span>
            <span className="font-mono text-slate-200 font-semibold">{totalPeriodTransactions} sessions</span>
          </div>
        </div>

        {/* KPI: Platform Commission */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Percent className="w-16 h-16 text-amber-500" />
          </div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Platform Commission ({simulatedCommissionRate}%)</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-amber-400">₹{totalPeriodCommission.toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-mono text-amber-500/80">Simulated Earned</span>
          </div>
          <div className="mt-3.5 pt-3.5 border-t border-slate-800/60 flex justify-between items-center text-xs">
            <span className="text-slate-400">Payout to Experts:</span>
            <span className="font-mono text-slate-200 font-semibold">₹{totalPeriodPayouts.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* KPI: Subscriptions Count */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingCart className="w-16 h-16 text-cyan-500" />
          </div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Subscriptions Sold Daily</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">{totalSubsSold} packs</span>
            <span className="text-[10px] font-mono text-slate-500">sold in period</span>
          </div>
          <div className="mt-3.5 pt-3.5 border-t border-slate-800/60 grid grid-cols-3 gap-1 text-[10px] font-mono text-center text-slate-400">
            <div className="bg-slate-950/50 py-1 rounded border border-slate-800/40">
              <span className="text-slate-500 block">Silver</span>
              <span className="text-slate-200 font-semibold">{totalSilverSold}</span>
            </div>
            <div className="bg-slate-950/50 py-1 rounded border border-slate-800/40">
              <span className="text-amber-500/80 block">Gold</span>
              <span className="text-slate-200 font-semibold">{totalGoldSold}</span>
            </div>
            <div className="bg-slate-950/50 py-1 rounded border border-slate-800/40">
              <span className="text-sky-400 block">Plat</span>
              <span className="text-slate-200 font-semibold">{totalPlatinumSold}</span>
            </div>
          </div>
        </div>

        {/* KPI: Subscription Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard className="w-16 h-16 text-sky-500" />
          </div>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Subscription Revenue</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-sky-400">₹{totalSubRevenue.toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-mono text-slate-500">100% Platform Direct</span>
          </div>
          <div className="mt-3.5 pt-3.5 border-t border-slate-800/60 flex justify-between items-center text-xs">
            <span className="text-slate-400">Avg pack price:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              ₹{totalSubsSold > 0 ? Math.round(totalSubRevenue / totalSubsSold).toLocaleString('en-IN') : 0}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN SECTION: FILTERS & REVENUE / COMMISSION CHARTS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Header with main toggle controls */}
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
              <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp className="w-4 h-4" /></span>
              <span>Consultation Revenue & Commission Analysis</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Configure timeframes, filter outliers, and simulate platform commission cuts.</p>
          </div>

          {/* Timeframe selector toggle */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => { setRevenueTimeframe('daily'); setMinRevenue(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
                revenueTimeframe === 'daily'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📅 Daily Basis
            </button>
            <button
              onClick={() => { setRevenueTimeframe('weekly'); setMinRevenue(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
                revenueTimeframe === 'weekly'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📆 Weekly Basis
            </button>
          </div>
        </div>

        {/* FILTER PANEL ROW */}
        <div className="bg-slate-950/40 p-6 border-b border-slate-800/50 grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
          
          {/* Date Filter */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-mono flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Date Range Option</span>
            </label>
            <select
              value={revDateFilter}
              onChange={(e) => setRevDateFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {revenueTimeframe === 'daily' ? (
                <>
                  <option value="all">Full Fortnight (14 Days)</option>
                  <option value="14days">Last 14 Days</option>
                  <option value="7days">Last 7 Days</option>
                </>
              ) : (
                <>
                  <option value="all">Full History (8 Weeks)</option>
                  <option value="14days">Last 6 Weeks</option>
                  <option value="7days">Last 4 Weeks</option>
                </>
              )}
            </select>
          </div>

          {/* Minimum Revenue Threshold Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-slate-400">
              <span className="flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Min Revenue Filter</span>
              </span>
              <span className="text-emerald-400 font-bold">₹{minRevenue}</span>
            </div>
            <input
              type="range"
              min="0"
              max={revenueTimeframe === 'daily' ? "5000" : "30000"}
              step={revenueTimeframe === 'daily' ? "200" : "1000"}
              value={minRevenue}
              onChange={(e) => setMinRevenue(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>₹0</span>
              <span>₹{revenueTimeframe === 'daily' ? "5,000" : "30,000"}</span>
            </div>
          </div>

          {/* Commission Rate Simulator */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-slate-400">
              <span className="flex items-center space-x-1">
                <Percent className="w-3.5 h-3.5 text-slate-500" />
                <span>Commission Cut (₹)</span>
              </span>
              <span className="text-amber-400 font-bold">{simulatedCommissionRate}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="35"
              step="5"
              value={simulatedCommissionRate}
              onChange={(e) => setSimulatedCommissionRate(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>10% (Low)</span>
              <span>20% (Default)</span>
              <span>35% (High)</span>
            </div>
          </div>

          {/* Commission/Payout quick summary inside filter row */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-center space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Total:</span>
              <span className="font-mono text-slate-300 font-semibold">₹{totalPeriodRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800/40 pt-1">
              <span className="text-amber-500/80">Commission Cut:</span>
              <span className="font-mono text-amber-400 font-semibold">₹{totalPeriodCommission.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
              <span>Expert Payouts:</span>
              <span className="font-mono text-slate-400">₹{totalPeriodPayouts.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* CHART SECTION CONTAINER */}
        <div className="p-6">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredRevData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevSim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCommSim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey={revenueTimeframe === 'daily' ? 'date' : 'week'} 
                  stroke="#64748b" 
                  fontSize={10}
                  tickFormatter={(val) => {
                    if (revenueTimeframe === 'daily') {
                      return val.replace('2026-', ''); // shorter date display
                    }
                    return val.split(' ')[0]; // shorter week display
                  }}
                />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  formatter={(value: any, name: string) => {
                    return [`₹${value.toLocaleString('en-IN')}`, name];
                  }}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Gross Session Revenue (₹)" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevSim)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="commission" 
                  name={`Simulated Commission (₹, @${simulatedCommissionRate}%)`} 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCommSim)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {filteredRevData.length === 0 && (
            <div className="text-center py-10 text-slate-500 font-mono">
              ⚠️ No days match your Minimum Revenue Filter of ₹{minRevenue}.
            </div>
          )}
        </div>
      </div>

      {/* 3. SUBSCRIPTION SALES DAILY REPORT SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
              <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg"><ShoppingCart className="w-4 h-4" /></span>
              <span>Daily Subscription Sales & Direct Revenue</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Daily sold packages (Silver, Gold, Platinum) with total cash inflow.</p>
          </div>

          {/* Subscriptions range filter option */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSubDateFilter('all')}
              className={`px-3 py-1 rounded-lg font-mono transition-all ${
                subDateFilter === 'all' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Fortnight
            </button>
            <button
              onClick={() => setSubDateFilter('14days')}
              className={`px-3 py-1 rounded-lg font-mono transition-all ${
                subDateFilter === '14days' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setSubDateFilter('7days')}
              className={`px-3 py-1 rounded-lg font-mono transition-all ${
                subDateFilter === '7days' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7 Days
            </button>
          </div>
        </div>

        {/* SUBSCRIPTIONS FILTERS BAR */}
        <div className="bg-slate-950/40 p-6 border-b border-slate-800/50 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          
          {/* Slider for Min Subscriptions Sold */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-slate-400">
              <span className="flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Min Sold Packages</span>
              </span>
              <span className="text-cyan-400 font-bold">{minSubsSold} sold</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={minSubsSold}
              onChange={(e) => setMinSubsSold(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 Sold</span>
              <span>10 Sold</span>
            </div>
          </div>

          {/* Toggle breakdown view */}
          <div className="flex flex-col justify-center">
            <span className="text-slate-400 font-mono mb-2 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Composition Insights</span>
            </span>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPlansBreakdown}
                  onChange={(e) => setShowPlansBreakdown(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-xs">Show details on hover</span>
              </label>
            </div>
          </div>

          {/* Sub Sales Summary Card */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-center text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Sales Period Revenue:</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">₹{totalSubRevenue.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              {totalSubsSold} subscription packages sold at an average ticket of ₹{totalSubsSold > 0 ? Math.round(totalSubRevenue / totalSubsSold) : 0}.
            </p>
          </div>
        </div>

        {/* SUBSCRIPTIONS DUAL-AXIS CHART */}
        <div className="p-6">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredSubData} margin={{ top: 10, right: -5, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={(val) => val.replace('2026-', '')}
                />
                
                {/* Left Y-axis for quantity sold */}
                <YAxis 
                  yAxisId="left" 
                  stroke="#06b6d4" 
                  fontSize={10} 
                  label={{ value: 'Packages Sold (Qty)', angle: -90, position: 'insideLeft', fill: '#06b6d4', offset: 0, style: { fontSize: 10, fontFamily: 'monospace' } }}
                />
                
                {/* Right Y-axis for revenue earned */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#38bdf8" 
                  fontSize={10} 
                  label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight', fill: '#38bdf8', offset: 0, style: { fontSize: 10, fontFamily: 'monospace' } }}
                />

                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-left space-y-2 max-w-xs shadow-xl">
                          <p className="font-mono font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                            <span>📅 Date: {label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-400">Daily Details</span>
                          </p>
                          <div className="space-y-1">
                            <p className="flex justify-between text-cyan-400">
                              <span>Subscriptions Sold:</span>
                              <span className="font-mono font-bold">{data.subscriptionsSold} packs</span>
                            </p>
                            
                            {showPlansBreakdown && (
                              <div className="bg-slate-900/50 p-2 rounded border border-slate-800/40 text-[11px] font-mono text-slate-400 space-y-1 my-1">
                                <div className="flex justify-between">
                                  <span>🥈 Silver Sold (₹499):</span>
                                  <span className="text-slate-200">{data.silverSold}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>🥇 Gold Sold (₹1,499):</span>
                                  <span className="text-amber-500 font-semibold">{data.goldSold}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>💎 Platinum Sold (₹4,999):</span>
                                  <span className="text-sky-400 font-semibold">{data.platinumSold}</span>
                                </div>
                              </div>
                            )}

                            <p className="flex justify-between text-sky-400 border-t border-slate-800/40 pt-1.5">
                              <span>Total Sub Revenue:</span>
                              <span className="font-mono font-bold text-slate-100">₹{data.subscriptionRevenue.toLocaleString('en-IN')}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                
                {/* Cylindrical count bar */}
                <Bar 
                  yAxisId="left"
                  dataKey="subscriptionsSold" 
                  name="Packages Sold (Qty)" 
                  fill="#06b6d4" 
                  barSize={20} 
                  radius={[4, 4, 0, 0]} 
                />
                
                {/* Sales revenue trend line */}
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="subscriptionRevenue" 
                  name="Subscription Revenue (₹)" 
                  stroke="#38bdf8" 
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {filteredSubData.length === 0 && (
            <div className="text-center py-10 text-slate-500 font-mono">
              ⚠️ No days match your Minimum Subscription Sold Filter.
            </div>
          )}
        </div>
      </div>

      {/* ==================== NEW MODULE: ADVISOR CATEGORY REVENUE & LIFETIME PERFORMANCE ==================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl text-left">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-100 flex items-center space-x-2.5">
              <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg"><Coins className="w-4 h-4" /></span>
              <span>Advisor Categories Revenue & Performance Analytics</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Real-time breakdown of Monthly, Daily, 15-day, and Lifetime platform revenue generated from each specialty category.</p>
          </div>
          
          {/* Interactive Timeframe Selection Pills */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-850 self-start md:self-auto shrink-0 gap-1">
            {(['daily', '15days', 'monthly', 'lifetime'] as const).map((tf) => {
              const active = categoryTimeframe === tf;
              const labels = {
                daily: '☀️ Daily',
                '15days': '📅 15 Days',
                monthly: '🌙 Monthly',
                lifetime: '💎 Lifetime'
              };
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setCategoryTimeframe(tf)}
                  className={`px-3.5 py-1 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer ${
                    active 
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg scale-105' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  {labels[tf]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category KPI summary cards */}
        <div className="p-6 bg-slate-950/20 border-b border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-mono uppercase tracking-wider text-[10px]">Top Revenue Category</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <strong className="text-lg text-slate-200 mt-2 block font-mono">{topCategory.category}</strong>
            <span className="text-[10px] text-slate-500 mt-1 block">Lifetime: ₹{topCategory.revenue.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                {categoryTimeframe === 'daily' && 'Daily Cat Gross'}
                {categoryTimeframe === '15days' && '15-Day Cat Gross'}
                {categoryTimeframe === 'monthly' && 'Monthly Cat Gross'}
                {categoryTimeframe === 'lifetime' && 'Lifetime Cat Gross'}
              </span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <strong className="text-lg text-amber-400 mt-2 block font-mono">₹{totalCatMonthlyRevenue.toLocaleString('en-IN')}</strong>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {categoryTimeframe === 'daily' && 'Last 24 Hours performance'}
              {categoryTimeframe === '15days' && 'Last 15 Days performance'}
              {categoryTimeframe === 'monthly' && 'Last 30 Days performance'}
              {categoryTimeframe === 'lifetime' && 'All-time platform performance'}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-mono uppercase tracking-wider text-[10px]">Lifetime Cat Gross</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <strong className="text-lg text-emerald-400 mt-2 block font-mono">₹{totalCatLifetimeRevenue.toLocaleString('en-IN')}</strong>
            <span className="text-[10px] text-slate-500 mt-1 block">All-time platform consulting fees</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-mono uppercase tracking-wider text-[10px]">Configured Categories</span>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <strong className="text-lg text-indigo-400 mt-2 block font-mono">{categoriesList.length} Active</strong>
            <span className="text-[10px] text-slate-500 mt-1 block">Spanning astrologers, coaches, & advisors</span>
          </div>
        </div>

        {/* Category Revenue Bar Chart */}
        <div className="p-6 border-b border-slate-800">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRevenueData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  formatter={(value: any, name: string) => {
                    const labelName = name === 'monthlyRev' 
                      ? (categoryTimeframe === 'daily' ? 'Daily Revenue' : categoryTimeframe === '15days' ? '15 Days Revenue' : categoryTimeframe === 'monthly' ? 'Monthly Revenue' : 'Lifetime Revenue')
                      : 'Lifetime Gross';
                    return [`₹${value.toLocaleString('en-IN')}`, labelName];
                  }}
                  labelFormatter={(label) => `Category: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar 
                  dataKey="monthlyRev" 
                  name={
                    categoryTimeframe === 'daily' ? 'Daily Category Revenue' : 
                    categoryTimeframe === '15days' ? '15-Day Category Revenue' : 
                    categoryTimeframe === 'monthly' ? 'Monthly Category Revenue' : 
                    'Lifetime Category Revenue (Selected)'
                  } 
                  fill="#f59e0b" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar dataKey="lifetimeRev" name="Lifetime Category Revenue (Total)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ==================== CATEGORY WISE REGISTRATIONS & CONSULTATIONS METRICS BOARD ==================== */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/30 space-y-4">
          <div>
            <h4 className="text-sm font-extrabold text-slate-100 flex items-center space-x-2">
              <span className="p-1 bg-indigo-500/10 text-indigo-400 rounded"><Users className="w-4 h-4" /></span>
              <span>Category wise User Signups & Consultations Board</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Detailed tracking of total registrations, paying users, and performance conversion across specialty fields for the selected 
              <span className="text-amber-400 font-bold ml-1 font-mono uppercase">
                {categoryTimeframe === 'daily' ? 'Daily' : categoryTimeframe === '15days' ? '15 Days' : categoryTimeframe === 'monthly' ? 'Monthly' : 'Lifetime'}
              </span> timeframe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryRevenueData.map((item) => {
              // Calculate conversion rate of signups who have consulted
              const conversionRate = item.signupCount > 0 
                ? Math.round((item.consultationUserCount / item.signupCount) * 100) 
                : 0;
              
              return (
                <div key={item.category} className="bg-slate-900/60 rounded-2xl border border-slate-850 p-4 hover:border-slate-700/60 transition-all space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h5 className="font-bold text-slate-100 text-sm flex items-center space-x-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>{item.category}</span>
                      </h5>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {item.consultantCount} Experts Registered
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold font-mono">
                        {conversionRate}% Conversion
                      </span>
                    </div>
                  </div>

                  {/* Signup & Consultations Counters */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850/60 text-xs font-mono">
                    <div className="text-left">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Signed-up Users</p>
                      <p className="text-sm font-extrabold text-slate-200 mt-0.5 flex items-center space-x-1">
                        <span>👥 {item.signupCount}</span>
                      </p>
                    </div>
                    <div className="text-right border-l border-slate-850/60 pl-2.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Consulted Clients</p>
                      <p className="text-sm font-extrabold text-emerald-400 mt-0.5 flex items-center justify-end space-x-1">
                        <span>📞 {item.consultationUserCount}</span>
                      </p>
                    </div>
                  </div>

                  {/* Revenue metrics row */}
                  <div className="flex justify-between items-center text-xs pt-1">
                    <div>
                      <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                        {categoryTimeframe === 'daily' ? 'Daily Rev' : categoryTimeframe === '15days' ? '15-Day Rev' : categoryTimeframe === 'monthly' ? 'Monthly Rev' : 'Selected Rev'}
                      </p>
                      <p className="text-xs font-extrabold text-amber-400 font-mono">
                        ₹{item.monthlyRev.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Lifetime Rev</p>
                      <p className="text-xs font-extrabold text-emerald-400 font-mono">
                        ₹{item.lifetimeRev.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Conversion progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Conversion Progress</span>
                      <span>{item.consultationUserCount}/{item.signupCount} Users</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, conversionRate)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Breakdown: Consultant Revenue under Specialty Category */}
        <div className="p-6 space-y-4 bg-slate-950/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-200">Consultant Contribution Breakdown</h4>
              <p className="text-xs text-slate-400">View individual monthly and lifetime revenue contribution of experts in each category.</p>
            </div>

            {/* Filter and sorting controls */}
            <div className="flex flex-wrap gap-2 text-xs">
              <select
                value={selectedBreakdownCategory}
                onChange={(e) => setSelectedBreakdownCategory(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">📁 All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={breakdownSort}
                onChange={(e) => setBreakdownSort(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="rev-desc">📈 Revenue: Highest First</option>
                <option value="rev-asc">📉 Revenue: Lowest First</option>
                <option value="sessions">💬 Session Volume</option>
                <option value="name">🔤 Name (A-Z)</option>
              </select>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search expert..."
                  value={breakdownSearch}
                  onChange={(e) => setBreakdownSearch(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 pl-8 pr-3 py-1.5 rounded-xl text-xs w-44 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Consultant breakdown list table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-850 bg-slate-950/40">
            {filteredBreakdownList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono">
                No experts matching current search criteria or category filter.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Expert Profile</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Sessions</th>
                    <th className="py-3 px-4 text-right">Monthly Revenue (₹)</th>
                    <th className="py-3 px-4 text-right">Lifetime Revenue (₹)</th>
                    <th className="py-3 px-4 text-right">Contr. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40 text-slate-300 font-mono">
                  {filteredBreakdownList.map((item, idx) => {
                    const pctContribution = totalCatLifetimeRevenue > 0 
                      ? Math.round((item.lifetimeRev / totalCatLifetimeRevenue) * 100) 
                      : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center space-x-2.5 text-left">
                            <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center overflow-hidden font-bold text-[10px] text-slate-300 uppercase">
                              {item.photo_url ? (
                                <img src={item.photo_url} alt={item.display_name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : item.display_name?.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 font-sans leading-tight">{item.display_name}</p>
                              <p className="text-[9px] text-slate-500">@{item.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-400">{item.sessionsCount} sessions</td>
                        <td className="py-2.5 px-4 text-right text-amber-400 font-bold">₹{item.monthlyRev.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">₹{item.lifetimeRev.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 text-right text-slate-500">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold text-slate-300">
                            {pctContribution}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ==================== NEW MODULE: USER CATEGORIES DISTRIBUTION DASHBOARD ==================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl text-left">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-100 flex items-center space-x-2.5">
              <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg"><Users className="w-4 h-4" /></span>
              <span>User Segmentation & Category Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Live tracking of active user tiers, member volume density, and which subscription class has the highest user base.</p>
          </div>
          <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Segmentation Active
          </span>
        </div>

        {/* User Stats Grid & Horizontal Chart side-by-side */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {/* Segmentation KPI summary card */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between space-y-4">
              <div className="flex items-center space-x-3 text-indigo-400">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/15">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider block">Largest User base Tier</span>
                  <strong className="text-lg text-indigo-300 font-mono font-extrabold">{mostPopulatedUserCategory.category}</strong>
                </div>
              </div>
              <div className="pt-3.5 border-t border-slate-850 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">Members Count:</span>
                <span className="font-mono text-slate-200 font-semibold">{mostPopulatedUserCategory.count} users</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-mono">Platform Density:</span>
                <span className="font-mono text-indigo-400 font-black">{mostPopulatedUserCategory.percentage}% of all users</span>
              </div>
            </div>

            {/* Micro segments breakdown list */}
            <div className="space-y-2">
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tier-wise User Density & Values</h5>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {userCategoryData.map((item, idx) => {
                  let badgeColor = "bg-slate-900 text-slate-400 border-slate-800";
                  if (item.category === 'VIP') badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/15";
                  else if (item.category === 'Gold') badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/15";
                  else if (item.category === 'Silver') badgeColor = "bg-slate-300/10 text-slate-300 border-slate-300/15";
                  else if (item.category === 'Premium') badgeColor = "bg-sky-500/10 text-sky-400 border-sky-500/15";
                  else if (item.category === 'Special') badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/15";

                  return (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-left space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeColor}`}>
                          {item.category}
                        </span>
                        <span className="text-slate-500 text-[10px]">{item.percentage}%</span>
                      </div>
                      <div className="flex justify-between text-[11px] pt-1">
                        <span className="text-slate-400">Qty:</span>
                        <span className="text-slate-200 font-bold">{item.count}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-900">
                        <span>Spends:</span>
                        <span className="text-slate-400 font-semibold">₹{Math.round(item.totalSpent).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User distribution chart */}
          <div className="lg:col-span-7 bg-slate-950/40 p-4 rounded-2xl border border-slate-850/80 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-slate-300 uppercase font-mono">User Density Bar Chart</span>
              <span className="text-[10px] font-mono text-indigo-400">Registered Users: {users.length}</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userCategoryData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={10} width={60} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    formatter={(value: any, name: string) => {
                      if (name === 'count') return [`${value} Users`, 'Total Registered'];
                      if (name === 'totalSpent') return [`₹${value.toLocaleString('en-IN')}`, 'Combined Spends'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="count" name="Users count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 4. USER GROWTH & GENERAL TRAFFIC VOLUME (RETAINED FROM ORIGINAL MOCK LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Retention graph of growth */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">User Acquisition & Session Volumes</h4>
              <p className="text-[11px] text-slate-400">Total monthly registered users and video sessions volume.</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-500">Overview</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={growthTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="users" name="Registered Users" fill="#06b6d4" barSize={16} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="sessions" name="Sessions Completed" stroke="#a855f7" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Audit Tips and Performance Metrics */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 mb-3">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider">Super Admin Optimization Hub</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Based on active transaction rates, your peak activity triggers around <span className="text-emerald-400 font-mono">19:00 - 22:00 UTC</span>. 
              The platform commission split simulation can be modified globally on this dashboard to assist finance forecasting.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center space-x-2 text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Landmark className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <span className="text-[11px] block text-slate-400 font-mono">Suggested Commission Tier</span>
                  <span className="text-slate-200">20% commission rate yields optimal expert retention.</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <span className="text-[11px] block text-slate-400 font-mono">Package Popularity</span>
                  <span className="text-slate-200">Silver Pack is popular (60%), Gold yields highest margin.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">Platform State: Stable</span>
            <button 
              onClick={() => {
                setShowDataTable(!showDataTable);
                setDataTableTab(dataTableTab === 'revenue' ? 'revenue' : 'subscriptions');
              }}
              className="text-xs font-mono px-3 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all flex items-center space-x-1"
            >
              <span>{showDataTable ? 'Hide' : 'Show'} Interactive Ledger Table</span>
              <ChevronRight className={`w-3 h-3 transform transition-transform ${showDataTable ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE DATA TABLE (OPENS ON REQUEST) */}
      {showDataTable && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-mono text-slate-200 uppercase tracking-wider">Super Admin Audit Ledger Data</h3>
              <p className="text-xs text-slate-400">Inspect the exact numbers backing the live charts.</p>
            </div>
            
            {/* Table data type switcher */}
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 self-start sm:self-auto text-xs">
              <button
                onClick={() => setDataTableTab('revenue')}
                className={`px-3 py-1 rounded-md font-mono ${dataTableTab === 'revenue' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400'}`}
              >
                📊 Session Revenue ({filteredRevData.length})
              </button>
              <button
                onClick={() => setDataTableTab('subscriptions')}
                className={`px-3 py-1 rounded-md font-mono ${dataTableTab === 'subscriptions' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400'}`}
              >
                🎫 Subscription Sales ({filteredSubData.length})
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            {dataTableTab === 'revenue' ? (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                    <th className="py-3 px-4">Period Label</th>
                    <th className="py-3 px-4 text-right">Gross Revenue (₹)</th>
                    <th className="py-3 px-4 text-right">Commission Cut ({simulatedCommissionRate}%)</th>
                    <th className="py-3 px-4 text-right">Expert Payouts (₹)</th>
                    <th className="py-3 px-4 text-right">Sessions Count</th>
                    <th className="py-3 px-4 text-right">AOV (Avg Value)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono">
                  {filteredRevData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 text-slate-100 font-bold">{revenueTimeframe === 'daily' ? (item as any).date : (item as any).week}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">₹{item.revenue.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-amber-400">₹{item.commission.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-violet-400">₹{item.payouts.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-slate-200">{item.transactionsCount}</td>
                      <td className="py-3 px-4 text-right text-slate-400">₹{Math.round(item.revenue / item.transactionsCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Total Subscriptions Sold</th>
                    <th className="py-3 px-4 text-center">Silver Sold</th>
                    <th className="py-3 px-4 text-center">Gold Sold</th>
                    <th className="py-3 px-4 text-center">Platinum Sold</th>
                    <th className="py-3 px-4 text-right">Direct Sub Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono">
                  {filteredSubData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 text-slate-100 font-bold">{item.date}</td>
                      <td className="py-3 px-4 text-right text-cyan-400 font-bold">{item.subscriptionsSold} packs</td>
                      <td className="py-3 px-4 text-center text-slate-400">{item.silverSold}</td>
                      <td className="py-3 px-4 text-center text-amber-500">{item.goldSold}</td>
                      <td className="py-3 px-4 text-center text-sky-400">{item.platinumSold}</td>
                      <td className="py-3 px-4 text-right text-sky-300 font-semibold">₹{item.subscriptionRevenue.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Component 2: MARKETING MODULE
export function MarketingModulePanel() {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'Percentage' | 'Flat'>('Percentage');
  const [val, setVal] = useState('');
  const [min, setMin] = useState('');
  const [exp, setExp] = useState('2026-12-31');

  const addCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !val) return;
    const newCoupon = {
      code: code.toUpperCase().replace(/\s+/g, ''),
      discountType: type,
      value: parseFloat(val),
      minOrder: parseFloat(min || '0'),
      expiry: exp,
      active: true
    };
    setCoupons([newCoupon, ...coupons]);
    setCode('');
    setVal('');
    setMin('');
  };

  const toggleCoupon = (targetCode: string) => {
    setCoupons(coupons.map(c => c.code === targetCode ? { ...c, active: !c.active } : c));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Creator panel */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <span>🏷️ Create Coupon Promo Campaign</span>
          </h3>
          <form onSubmit={addCoupon} className="space-y-3.5">
            <div>
              <label className="block text-[11px] text-slate-400 font-mono mb-1">Coupon Promo Code *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. MONSOON50"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Discount Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Percentage">Percentage (%)</option>
                  <option value="Flat">Flat Discount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Discount Value *</label>
                <input
                  type="number"
                  value={val}
                  onChange={e => setVal(e.target.value)}
                  placeholder="50"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Min Order (₹)</label>
                <input
                  type="number"
                  value={min}
                  onChange={e => setMin(e.target.value)}
                  placeholder="100"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={exp}
                  onChange={e => setExp(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 w-full font-bold py-2.5 rounded-xl text-xs transition-all mt-2"
            >
              Generate Coupon
            </button>
          </form>
        </div>

        {/* Existing coupons list */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider mb-4">Active Coupon Campaigns</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {coupons.map((c) => (
              <div key={c.code} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-slate-800 text-emerald-400 text-xs font-mono font-bold px-2 py-0.5 rounded border border-slate-700">{c.code}</span>
                    <span className="text-[10px] text-slate-500">Exp: {c.expiry}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 font-sans">
                    Gets <strong className="text-slate-100">{c.discountType === 'Percentage' ? `${c.value}% Off` : `₹${c.value} Flat Off`}</strong> on orders above ₹{c.minOrder}.
                  </p>
                </div>
                <button
                  onClick={() => toggleCoupon(c.code)}
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                    c.active 
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/15' 
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/15'
                  }`}
                >
                  {c.active ? '🟢 Active' : '🔴 Deactive'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral & Affiliate Management */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider mb-3">Referral & Affiliate Tracking</h3>
        <p className="text-xs text-slate-400 mb-4">Set rewards and share rules for brand affiliates promoting your consultation portal.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
            <span className="text-slate-500 uppercase tracking-wider block">Referrer Commission</span>
            <strong className="text-lg text-slate-200 mt-1 block">₹50.00 Wallet Bonus</strong>
            <span className="text-[10px] text-slate-500 block mt-1">Given per 1st paid call completed by referee</span>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
            <span className="text-slate-500 uppercase tracking-wider block">Referee Signup Reward</span>
            <strong className="text-lg text-slate-200 mt-1 block">₹20.00 Free Balance</strong>
            <span className="text-[10px] text-slate-500 block mt-1">Credited on registration</span>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
            <span className="text-slate-500 uppercase tracking-wider block">Affiliate Flat Payout</span>
            <strong className="text-lg text-slate-200 mt-1 block">5.0% Rev Share</strong>
            <span className="text-[10px] text-slate-500 block mt-1">On total consulting bills paid in first 90 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component 3: CMS MANAGEMENT
export function CmsModulePanel() {
  const [blogs, setBlogs] = useState(mockBlogPages);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');

  const handleCreateBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) return;
    const newBlog = {
      id: `BLOG-00${blogs.length + 1}`,
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      author,
      status: 'Published' as const,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setBlogs([newBlog, ...blogs]);
    setTitle('');
    setAuthor('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Creator form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider mb-4">Write New Blog / Guide Article</h3>
          <form onSubmit={handleCreateBlog} className="space-y-4">
            <div>
              <label className="block text-[11px] text-slate-400 font-mono mb-1">Article Title *</label>
              <input
                type="text"
                placeholder="e.g. Legal guide for tech founders"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 font-mono mb-1">Author Name *</label>
              <input
                type="text"
                placeholder="e.g. Shreya Sen"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all w-full"
            >
              Publish Article
            </button>
          </form>
        </div>

        {/* Article list */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider mb-4">Published Articles & Dynamic Pages</h3>
          <div className="space-y-3">
            {blogs.map(b => (
              <div key={b.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{b.title}</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">Author: {b.author} • slug: /{b.slug}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/15">
                    {b.status}
                  </span>
                  <button 
                    onClick={() => setBlogs(blogs.filter(bl => bl.id !== b.id))}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pages Content & SEO Metatags */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider">Configure SEO Metadata & Legal Copy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
            <span className="text-slate-400 font-bold text-xs block">FAQ & Terms Settings</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">Customize your platform policies, dispute guidelines, and frequently asked question sets.</p>
            <button className="text-[11px] text-emerald-400 font-bold hover:underline">Edit Terms Copy →</button>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
            <span className="text-slate-400 font-bold text-xs block">Meta Title & Keywords</span>
            <p className="text-[11px] text-slate-500 leading-relaxed">Maximize Google search rankings by injecting schema keywords and title headers.</p>
            <button className="text-[11px] text-emerald-400 font-bold hover:underline">Edit SEO Tags →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component 4: SUPPORT TICKETS MODULE
export function SupportTicketsPanel() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'user' | 'consultant'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'closed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [confirmingCloseId, setConfirmingCloseId] = useState<number | null>(null);
  const [confirmingResolveId, setConfirmingResolveId] = useState<number | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTickets(data.tickets);
        } else {
          setError(data.error || 'Failed to load support tickets');
        }
      } else {
        setError('Failed to fetch tickets from server');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !adminReplyText.trim()) return;

    try {
      setReplying(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_reply: adminReplyText })
      });

      if (res.ok) {
        setSuccess('Reply submitted successfully!');
        setAdminReplyText('');
        setSelectedTicket(null);
        fetchTickets();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit reply');
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting reply');
    } finally {
      setReplying(false);
    }
  };

  const handleCloseTicket = async (ticketId: number) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/tickets/${ticketId}/close`, {
        method: 'POST'
      });
      if (res.ok) {
        setSuccess('Ticket closed successfully!');
        setSelectedTicket(null);
        fetchTickets();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to close ticket');
      }
    } catch (err: any) {
      setError(err.message || 'Error closing ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId: number) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/tickets/${ticketId}/resolve`, {
        method: 'POST'
      });
      if (res.ok) {
        setSuccess('Ticket marked as resolved successfully!');
        setSelectedTicket(null);
        fetchTickets();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to resolve ticket');
      }
    } catch (err: any) {
      setError(err.message || 'Error resolving ticket');
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(t => {
    const matchesSender = activeFilter === 'all' ? true : t.sender_type === activeFilter;
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'pending'
        ? (t.status === 'open' || t.status === 'pending')
        : t.status === statusFilter;
    return matchesSender && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-4 gap-4">
          <div>
            <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider">Helpdesk Customer Support Tickets</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Administrate and resolve raised disputes from clients & experts</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-rose-500/10 text-rose-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-rose-500/20">
              {tickets.filter(t => t.status === 'open' || t.status === 'pending').length} Open
            </span>
            <button 
              onClick={fetchTickets}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Refresh Tickets"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters/Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === 'all' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              All Tickets ({tickets.length})
            </button>
            <button
              onClick={() => setActiveFilter('user')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === 'user' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              User Support ({tickets.filter(t => t.sender_type === 'user').length})
            </button>
            <button
              onClick={() => setActiveFilter('consultant')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === 'consultant' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Consultant Support ({tickets.filter(t => t.sender_type === 'consultant').length})
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending/Open</option>
              <option value="resolved">Resolved/Replied</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs px-4 py-3 rounded-xl font-mono mb-4">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs px-4 py-3 rounded-xl font-mono mb-4">
            ✅ {success}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono animate-pulse">Fetching support tickets database...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono bg-slate-950 rounded-2xl border border-dashed border-slate-850">
            No support tickets match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono font-bold">
                  <th className="p-3 text-center w-16">ID</th>
                  <th className="p-3 w-40">SENDER</th>
                  <th className="p-3">SUBJECT</th>
                  <th className="p-3 w-28">STATUS</th>
                  <th className="p-3 w-40">ACTION TAKEN</th>
                  <th className="p-3 w-32">RAISE DATE</th>
                  <th className="p-3 w-32">CLOSED DATE</th>
                  <th className="p-3 text-center w-24">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {filteredTickets.map(t => {
                  let actionTakenLabel = "Awaiting Response";
                  let actionTakenColor = "bg-amber-500/10 text-amber-400 border border-amber-500/25";
                  
                  if (t.status === 'closed') {
                    actionTakenLabel = "Ticket Closed";
                    actionTakenColor = "bg-rose-500/10 text-rose-400 border border-rose-500/25";
                  } else if (t.status === 'resolved') {
                    actionTakenLabel = "Resolved";
                    actionTakenColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
                  } else if (t.replies && t.replies.length > 0) {
                    const lastReply = t.replies[t.replies.length - 1];
                    if (lastReply.sender_type === 'admin') {
                      actionTakenLabel = `Admin Replied (${t.replies.filter((r: any) => r.sender_type === 'admin').length})`;
                      actionTakenColor = "bg-sky-500/10 text-sky-400 border border-sky-500/25";
                    } else {
                      actionTakenLabel = "Awaiting Admin Action";
                      actionTakenColor = "bg-amber-500/10 text-amber-400 border border-amber-500/25";
                    }
                  }

                  const raisedDate = new Date(t.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const closedDate = t.closed_at 
                    ? new Date(t.closed_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : t.status === 'closed' && t.replied_at
                      ? new Date(t.replied_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—';

                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400 font-bold">#{t.id}</td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1">
                            <span>{t.sender_type === 'user' ? '👤' : '🙋'}</span>
                            <span className="text-slate-200 font-bold max-w-[120px] truncate block" title={t.sender_name}>
                              {t.sender_name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">ID: {t.sender_id}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className="text-slate-200 font-bold block max-w-xs truncate" title={t.subject}>
                            {t.subject}
                          </span>
                          <span className="text-[10px] text-slate-400 block max-w-xs truncate font-normal">
                            {t.message}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          t.status === 'closed' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                            : t.status === 'resolved' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/15 animate-pulse'
                        }`}>
                          {(t.status || 'open').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full inline-block font-mono font-bold ${actionTakenColor}`}>
                          {actionTakenLabel}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">{raisedDate}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        <span className={t.status === 'closed' ? 'text-rose-400/90 font-bold font-mono' : ''}>
                          {closedDate}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                            setAdminReplyText('');
                            setConfirmingCloseId(null);
                            setConfirmingResolveId(null);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 text-slate-200 font-bold px-3 py-1.5 rounded-xl transition-all inline-flex items-center space-x-1.5 border border-slate-750 cursor-pointer"
                          title="View Ticket details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive View and Action Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="bg-slate-950 text-slate-400 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800 font-bold">
                    TICKET ID: #{selectedTicket.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedTicket.status === 'closed' 
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                      : selectedTicket.status === 'resolved' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/15 animate-pulse'
                  }`}>
                    {(selectedTicket.status || 'open').toUpperCase()}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-100 text-base leading-tight mt-1">{selectedTicket.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white bg-slate-950 p-2 border border-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content Container */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Raised By Sender</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm">{selectedTicket.sender_type === 'user' ? '👤' : '🙋'}</span>
                    <strong className="text-slate-200 text-xs font-bold">{selectedTicket.sender_name}</strong>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block">Type: {selectedTicket.sender_type.toUpperCase()} (ID: {selectedTicket.sender_id})</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Raise Date (Raised on)</span>
                  <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(selectedTicket.created_at).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Closed Date (Status closed)</span>
                  <div className="flex items-center space-x-1.5 text-slate-300 font-mono text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className={selectedTicket.status === 'closed' ? 'text-rose-400 font-bold' : ''}>
                      {selectedTicket.closed_at 
                        ? new Date(selectedTicket.closed_at).toLocaleString('en-IN')
                        : selectedTicket.status === 'closed' && selectedTicket.replied_at
                          ? new Date(selectedTicket.replied_at).toLocaleString('en-IN')
                          : 'Not Closed Yet'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Action Taken Status</span>
                  <div>
                    {(() => {
                      let tagLabel = "Awaiting Action";
                      let tagStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/25";
                      if (selectedTicket.status === 'closed') {
                        tagLabel = "Closed By Admin";
                        tagStyle = "bg-rose-500/10 text-rose-400 border border-rose-500/25";
                      } else if (selectedTicket.status === 'resolved') {
                        tagLabel = "Marked Resolved";
                        tagStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25";
                      } else if (selectedTicket.replies && selectedTicket.replies.length > 0) {
                        const last = selectedTicket.replies[selectedTicket.replies.length - 1];
                        if (last.sender_type === 'admin') {
                          tagLabel = "Admin Replied";
                          tagStyle = "bg-sky-500/10 text-sky-400 border border-sky-500/25";
                        }
                      }
                      return (
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full inline-block ${tagStyle}`}>
                          {tagLabel.toUpperCase()}
                        </span>
                      );
                    })()}
                  </div>
                  {selectedTicket.session_id && (
                    <span className="text-[9px] text-emerald-400 font-mono block mt-1">
                      Session Reference: #{selectedTicket.session_id}
                    </span>
                  )}
                </div>
              </div>

              {/* Original User Issue Message */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Original Query / Message</span>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 relative">
                  <span className="absolute right-4 top-2 text-slate-800 text-3xl font-serif select-none">“</span>
                  <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans pr-6">
                    {selectedTicket.message}
                  </p>
                </div>
              </div>

              {/* Conversation History / Replies Thread */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                  Replies Thread ({selectedTicket.replies ? selectedTicket.replies.length : 0})
                </span>
                
                {!selectedTicket.replies || selectedTicket.replies.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono bg-slate-950 rounded-xl border border-slate-850/50">
                    No replies in this thread yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {selectedTicket.replies.map((reply: any) => (
                      <div 
                        key={reply.id} 
                        className={`p-3.5 rounded-xl text-xs space-y-1.5 border ${
                          reply.sender_type === 'admin' 
                            ? 'bg-emerald-950/15 border-emerald-850/40 ml-12' 
                            : 'bg-slate-950 border-slate-850 mr-12'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className={`font-bold flex items-center gap-1 ${
                            reply.sender_type === 'admin' ? 'text-emerald-400' : reply.sender_type === 'user' ? 'text-blue-400' : 'text-purple-400'
                          }`}>
                            {reply.sender_type === 'admin' ? '🛡️ Admin Support' : reply.sender_type === 'user' ? `👤 Client (${reply.sender_name})` : `🙋 Expert (${reply.sender_name})`}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {new Date(reply.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                          {reply.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error/Success Banners inside Modal */}
              {error && (
                <div className="bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs px-4 py-3 rounded-xl font-mono">
                  ⚠️ {error}
                </div>
              )}

              {/* Action and Reply Form Section */}
              <div className="pt-4 border-t border-slate-800 space-y-4 bg-slate-900">
                {selectedTicket.status === 'closed' ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center space-y-1">
                    <span className="text-rose-400 font-extrabold text-xs block">🔒 TICKET COMPLETED & CLOSED</span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      This helpdesk ticket is officially closed. No additional administrative replies can be added.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReplySubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Administrative Reply *</label>
                      <textarea
                        required
                        rows={3}
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder="Type official support reply, troubleshooting instructions, or resolution details here..."
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full resize-none font-sans"
                      />
                    </div>

                    {/* Action Buttons Grid */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      
                      {/* Left: Quick Admin Actions */}
                      <div className="flex items-center gap-2">
                        {selectedTicket.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirmingResolveId === selectedTicket.id) {
                                handleResolveTicket(selectedTicket.id);
                                setConfirmingResolveId(null);
                              } else {
                                setConfirmingResolveId(selectedTicket.id);
                                setConfirmingCloseId(null);
                              }
                            }}
                            className={`font-bold px-4 py-2.5 rounded-xl text-[11px] transition-all uppercase tracking-wider border cursor-pointer ${
                              confirmingResolveId === selectedTicket.id
                                ? 'bg-amber-500 text-slate-950 border-amber-600 animate-pulse font-extrabold'
                                : 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/20 text-teal-400'
                            }`}
                          >
                            {confirmingResolveId === selectedTicket.id ? '⚠️ Click to Confirm Resolve' : 'Mark Resolved'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (confirmingCloseId === selectedTicket.id) {
                              handleCloseTicket(selectedTicket.id);
                              setConfirmingCloseId(null);
                            } else {
                              setConfirmingCloseId(selectedTicket.id);
                              setConfirmingResolveId(null);
                            }
                          }}
                          className={`font-bold px-4 py-2.5 rounded-xl text-[11px] transition-all uppercase tracking-wider border cursor-pointer ${
                            confirmingCloseId === selectedTicket.id
                              ? 'bg-rose-600 text-white border-rose-700 animate-pulse font-extrabold'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                          }`}
                        >
                          {confirmingCloseId === selectedTicket.id ? '⚠️ Click to Confirm Close' : 'Close Ticket'}
                        </button>
                      </div>

                      {/* Right: Submit Reply Button */}
                      <div className="flex-1 flex justify-end">
                        <button
                          type="submit"
                          disabled={replying}
                          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 text-xs font-extrabold py-2.5 px-6 rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
                        >
                          {replying ? 'Submitting Reply...' : 'Submit Support Reply'}
                        </button>
                      </div>

                    </div>
                  </form>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Component 5: AUDIT LOGS MODULE
export function AuditLogsPanel() {
  const [logs, setLogs] = useState<any[]>(mockAuditLogs);
  const [filter, setFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/audit-logs');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setLogs(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean))).sort();
  const uniqueRoles = Array.from(new Set(logs.map(l => l.role).filter(Boolean))).sort();

  const filtered = logs.filter(l => {
    const searchStr = filter.toLowerCase();
    const matchesSearch = filter ? (
      String(l.id || '').toLowerCase().includes(searchStr) ||
      String(l.actor || '').toLowerCase().includes(searchStr) ||
      String(l.action || '').toLowerCase().includes(searchStr) ||
      String(l.details || '').toLowerCase().includes(searchStr) ||
      String(l.role || '').toLowerCase().includes(searchStr) ||
      String(l.status || '').toLowerCase().includes(searchStr)
    ) : true;

    const matchesAction = actionFilter !== 'ALL' ? l.action === actionFilter : true;
    const matchesRole = roleFilter !== 'ALL' ? l.role === roleFilter : true;
    const matchesStatus = statusFilter !== 'ALL' ? l.status === statusFilter : true;

    return matchesSearch && matchesAction && matchesRole && matchesStatus;
  });

  const hasActiveFilters = filter !== '' || actionFilter !== 'ALL' || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  const clearFilters = () => {
    setFilter('');
    setActionFilter('ALL');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-800 mb-6 gap-4">
          <div>
            <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>Chronological System Audit Ledger</span>
              {loading && <span className="text-[10px] text-emerald-400 font-normal animate-pulse">(Loading...)</span>}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Records all core administrative actions to maintain platform compliance</p>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-850">
            <span>Filtered Logs:</span>
            <strong className="text-emerald-400">{filtered.length}</strong>
            {logs.length !== filtered.length && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-slate-500">{logs.length} total</span>
              </>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
          {/* Search Input */}
          <div className="relative col-span-1 sm:col-span-2 md:col-span-1 xl:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search actor, action, details..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full placeholder:text-slate-600"
            />
          </div>

          {/* Action Filter */}
          <div className="relative">
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full appearance-none cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼</span>
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full appearance-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼</span>
          </div>

          {/* Status Filter */}
          <div className="relative text-xs">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full appearance-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼</span>
          </div>

          {/* Clear Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl py-2 px-4 text-xs font-mono transition-all flex items-center justify-center gap-1.5 h-[38px] w-full"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px] bg-slate-900/60">
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Actor & Role</th>
                <th className="px-4 py-3.5">Action Event</th>
                <th className="px-4 py-3.5">Details</th>
                <th className="px-4 py-3.5 text-right pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-[11px] text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-mono text-xs">
                    No matching compliance logs found. Try adjusting your search filters.
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 text-cyan-400 font-bold font-mono">{l.id}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-sans font-medium">{l.actor}</div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider">{l.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-900 text-slate-300 border border-slate-800/80 rounded px-2 py-0.5 text-[10px] font-semibold">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-sans max-w-sm" title={l.details}>
                      {l.details}
                    </td>
                    <td className="px-4 py-3 text-right pr-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Component 6: ROLE MANAGEMENT
export function RoleManagementPanel() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider mb-2">Role & Access Control Center (RBAC)</h3>
        <p className="text-xs text-slate-400 mb-4">Define platform control levels and staff security keys for default platform managers.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemRolesList.map(role => (
            <div key={role.name} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-start space-x-3">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                  <span>{role.name}</span>
                  <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Default Access</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">{role.desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {['Billing', 'CRUD Users', 'CRUD Admins', 'Email Triggers'].slice(0, role.name === 'Super Admin' ? 4 : 2).map(perm => (
                    <span key={perm} className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/5 font-mono">
                      ✓ {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Component 7: SYSTEM SETTINGS
export function SettingsPanel() {
  const [platformName, setPlatformName] = useState('My Consultation Platform');
  const [maintenance, setMaintenance] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hero management states
  const [heroSettings, setHeroSettings] = useState<any>({
    global: { headline: '', description: '', tagline: '' },
    categories: {}
  });
  const [loadingHero, setLoadingHero] = useState(true);
  const [savingHero, setSavingHero] = useState(false);
  const [activeConfigCategory, setActiveConfigCategory] = useState<'global' | 'Astrologers' | 'Influencers' | 'Coaches' | 'Consultants' | 'Lawyers' | 'Mentors' | 'Doctors' | 'Singers' | 'Advisors' | 'Friends'>('global');

  // Avatar settings states
  const [avatarsList, setAvatarsList] = useState<string[]>([]);
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [savingAvatars, setSavingAvatars] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [uploadingAvatarFile, setUploadingAvatarFile] = useState(false);

  React.useEffect(() => {
    const fetchHeroSettings = async () => {
      try {
        const res = await fetch('/api/settings/hero');
        if (res.ok) {
          const data = await res.json();
          setHeroSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch hero settings:', err);
      } finally {
        setLoadingHero(false);
      }
    };
    const fetchAvatarsList = async () => {
      try {
        const res = await fetch('/api/settings/avatars');
        if (res.ok) {
          const data = await res.json();
          setAvatarsList(data);
        }
      } catch (err) {
        console.error('Failed to fetch avatars list:', err);
      } finally {
        setLoadingAvatars(false);
      }
    };
    fetchHeroSettings();
    fetchAvatarsList();
  }, []);

  const handleSaveHero = async () => {
    setSavingHero(true);
    try {
      const res = await fetch('/api/admin/settings/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_settings: heroSettings })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save hero settings');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingHero(false);
    }
  };

  const handleSaveAvatarsList = async (updatedList: string[]) => {
    setSavingAvatars(true);
    setAvatarError(null);
    setAvatarSuccess(null);
    try {
      const res = await fetch('/api/admin/settings/avatars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatars: updatedList })
      });
      if (res.ok) {
        setAvatarsList(updatedList);
        setAvatarSuccess('Avatars list saved successfully!');
        setTimeout(() => setAvatarSuccess(null), 3000);
      } else {
        const data = await res.json();
        setAvatarError(data.error || 'Failed to save avatars list');
      }
    } catch (err: any) {
      setAvatarError(err.message || 'An error occurred while saving.');
    } finally {
      setSavingAvatars(false);
    }
  };

  const handleAddAvatar = () => {
    setAvatarError(null);
    setAvatarSuccess(null);
    if (!newAvatarUrl.trim()) return;
    if (!newAvatarUrl.trim().startsWith('http://') && !newAvatarUrl.trim().startsWith('https://')) {
      setAvatarError('Kripya valid HTTP/HTTPS image URL enter karein.');
      return;
    }
    const updated = [...avatarsList, newAvatarUrl.trim()];
    handleSaveAvatarsList(updated);
    setNewAvatarUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    setAvatarSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('File size limit is 5MB. Kripya choti file select karein.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file (PNG/JPG/JPEG).');
      return;
    }

    setUploadingAvatarFile(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = reader.result as string;
        console.log('[Image Optimization] Compressing custom avatar image...');
        const compressedBase64 = await compressImageBase64(base64String, 50 * 1024);

        const res = await fetch('/api/user/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: compressedBase64 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload image file');

        const updated = [...avatarsList, data.photo_url];
        await handleSaveAvatarsList(updated);
        setAvatarSuccess('Avatar image uploaded and added successfully!');
        setTimeout(() => setAvatarSuccess(null), 3000);
      } catch (err: any) {
        setAvatarError(err.message || 'Failed to upload photo.');
      } finally {
        setUploadingAvatarFile(false);
        // Clear input
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setAvatarError('Failed to read the selected file.');
      setUploadingAvatarFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = (indexToDelete: number) => {
    const updated = avatarsList.filter((_, idx) => idx !== indexToDelete);
    handleSaveAvatarsList(updated);
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side: General Platform configuration and Avatars management */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider mb-4">Core Platform Configuration Settings</h3>
            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 font-mono mb-1">Platform Identity Name *</label>
                <input
                  type="text"
                  value={platformName}
                  onChange={e => setPlatformName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Currency Code</label>
                  <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-mono mb-1">Default Timezone</label>
                  <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="IST">Asia/Kolkata (IST)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">System Maintenance Mode</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Redirect public visitors to a "Service Restoring" card during DB alterations.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenance(!maintenance)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    maintenance 
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/15' 
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-400 border-slate-700'
                  }`}
                >
                  {maintenance ? '🔴 Maintenance On' : '🟢 Standard Live'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                {saved && (
                  <span className="text-emerald-400 text-xs font-mono">✓ Platform settings updated successfully!</span>
                )}
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all ml-auto"
                >
                  Save Parameters
                </button>
              </div>
            </form>
          </div>

          {/* Classic Static Avatars management section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider">Classic Static Avatars Management</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Super Admin panel se classic static avatars add aur delete karein. Aap local computer se direct photo upload kar sakte hain ya custom URL link paste kar sakte hain.
            </p>

            {/* Error & Success Feedback banners (Prevents blocking browser alerts in iFrame) */}
            {avatarError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex items-center space-x-2 font-mono">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{avatarError}</span>
              </div>
            )}
            {avatarSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center space-x-2 font-mono">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{avatarSuccess}</span>
              </div>
            )}

            {loadingAvatars ? (
              <div className="text-xs text-slate-500 font-mono py-6 text-center animate-pulse">Loading avatars list...</div>
            ) : (
              <div className="space-y-4">
                {/* List of current avatars */}
                <div>
                  <span className="block text-[10px] text-slate-400 font-mono mb-2 uppercase tracking-wider">Current Live Avatars ({avatarsList.length})</span>
                  {avatarsList.length === 0 ? (
                    <div className="bg-slate-950/40 border border-dashed border-slate-800/80 p-6 rounded-xl text-center text-xs text-slate-500">
                      No classic avatars registered. Please upload or add at least one avatar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-slate-950/55 p-3 rounded-xl border border-slate-800/60">
                      {avatarsList.map((avatarUrl, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                          <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => handleDeleteAvatar(index)}
                            className="absolute inset-0 bg-rose-950/85 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            title="Delete Avatar"
                          >
                            <Trash2 className="w-4 h-4 text-rose-200" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add methods (Dual inputs) */}
                <div className="space-y-4 pt-3 border-t border-slate-800/40">
                  {/* Method 1: File Uploader */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                    <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">Method A: Upload Local Image File</span>
                    <label className="flex flex-col items-center justify-center border border-dashed border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/40 transition-all rounded-xl p-4 cursor-pointer text-center group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        disabled={uploadingAvatarFile || savingAvatars} 
                        className="hidden" 
                      />
                      <Upload className={`w-6 h-6 mb-1.5 transition-colors ${uploadingAvatarFile ? 'text-emerald-400 animate-bounce' : 'text-slate-500 group-hover:text-emerald-400'}`} />
                      <span className="text-xs font-bold text-slate-300">
                        {uploadingAvatarFile ? 'Uploading and saving image...' : 'Choose Avatar Image File'}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 font-mono">PNG, JPG, JPEG (Max 5MB)</span>
                    </label>
                  </div>

                  {/* Method 2: HTTP Link */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                    <span className="block text-[10px] text-slate-400 font-mono uppercase tracking-wider">Method B: Add via HTTP/HTTPS Image Link URL</span>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={newAvatarUrl}
                          onChange={(e) => setNewAvatarUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                        <Image className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAvatar}
                        disabled={savingAvatars || !newAvatarUrl.trim()}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Dynamic Hero Content settings */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider">Homepage Hero Content Settings</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Super Admin panel se manage karein ki user homepage ke hero section mein kya dikhega. Category ke basis par header customized copy select karein.
          </p>

          {loadingHero ? (
            <div className="text-xs text-slate-500 font-mono py-12 text-center animate-pulse">Loading hero settings...</div>
          ) : (
            <div className="space-y-4">
              {/* Selector */}
              <div className="flex flex-wrap gap-1.5">
                {(['global', 'Astrologers', 'Influencers', 'Mentors', 'Doctors', 'Lawyers', 'Singers', 'Advisors', 'Friends', 'Coaches', 'Consultants'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveConfigCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                      activeConfigCategory === cat
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                        : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border-slate-800/80'
                    }`}
                  >
                    {cat === 'global' ? '🌎 Default Global' : cat}
                  </button>
                ))}
              </div>

              {/* Form inputs */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Tagline / Accent Prefix</label>
                  <input
                    type="text"
                    value={
                      activeConfigCategory === 'global'
                        ? (heroSettings.global?.tagline || '')
                        : (heroSettings.categories?.[activeConfigCategory]?.tagline || '')
                    }
                    onChange={e => {
                      const val = e.target.value;
                      setHeroSettings((prev: any) => {
                        const updated = JSON.parse(JSON.stringify(prev));
                        if (activeConfigCategory === 'global') {
                          if (!updated.global) updated.global = {};
                          updated.global.tagline = val;
                        } else {
                          if (!updated.categories) updated.categories = {};
                          if (!updated.categories[activeConfigCategory]) updated.categories[activeConfigCategory] = {};
                          updated.categories[activeConfigCategory].tagline = val;
                        }
                        return updated;
                      });
                    }}
                    placeholder="e.g. ✨ CHOOSE THE PERFECT EXPERT"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Hero Main Headline</label>
                  <input
                    type="text"
                    value={
                      activeConfigCategory === 'global'
                        ? (heroSettings.global?.headline || '')
                        : (heroSettings.categories?.[activeConfigCategory]?.headline || '')
                    }
                    onChange={e => {
                      const val = e.target.value;
                      setHeroSettings((prev: any) => {
                        const updated = JSON.parse(JSON.stringify(prev));
                        if (activeConfigCategory === 'global') {
                          if (!updated.global) updated.global = {};
                          updated.global.headline = val;
                        } else {
                          if (!updated.categories) updated.categories = {};
                          if (!updated.categories[activeConfigCategory]) updated.categories[activeConfigCategory] = {};
                          updated.categories[activeConfigCategory].headline = val;
                        }
                        return updated;
                      });
                    }}
                    placeholder="e.g. Unlock Your Cosmic Destiny"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Sub-description Paragraph</label>
                  <textarea
                    value={
                      activeConfigCategory === 'global'
                        ? (heroSettings.global?.description || '')
                        : (heroSettings.categories?.[activeConfigCategory]?.description || '')
                    }
                    onChange={e => {
                      const val = e.target.value;
                      setHeroSettings((prev: any) => {
                        const updated = JSON.parse(JSON.stringify(prev));
                        if (activeConfigCategory === 'global') {
                          if (!updated.global) updated.global = {};
                          updated.global.description = val;
                        } else {
                          if (!updated.categories) updated.categories = {};
                          if (!updated.categories[activeConfigCategory]) updated.categories[activeConfigCategory] = {};
                          updated.categories[activeConfigCategory].description = val;
                        }
                        return updated;
                      });
                    }}
                    rows={3}
                    placeholder="Describe what these experts offer..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-sans"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {saved && (
                    <span className="text-emerald-400 text-xs font-mono">✓ Hero configuration published!</span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHero}
                    disabled={savingHero}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 px-5 py-2 rounded-xl text-xs font-bold transition-all ml-auto"
                  >
                    {savingHero ? 'Saving config...' : 'Apply & Publish'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Dashboard Header Banner Settings Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider">Dashboard Upper Header Banner Settings</h3>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Manage the mobile-responsive and desktop-friendly high-quality promotional banner displayed on the user's consultation hub. Change the headline copy, sub-description, and background cover image dynamically.
        </p>

        {loadingHero ? (
          <div className="text-xs text-slate-500 font-mono py-6 text-center animate-pulse">Loading banner settings...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Banner Title / Headline *</label>
                <input
                  type="text"
                  value={heroSettings?.banner_headline !== undefined ? heroSettings.banner_headline : '🔥 Skip the Search. Talk to Who You Want.'}
                  onChange={e => {
                    const val = e.target.value;
                    setHeroSettings((prev: any) => ({ ...prev, banner_headline: val }));
                  }}
                  placeholder="e.g. 🔥 Skip the Search. Talk to Who You Want."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Banner Sub-Description</label>
                <textarea
                  value={heroSettings?.banner_description !== undefined ? heroSettings.banner_description : 'Premium minute-billed live consultations with top-tier specialists'}
                  onChange={e => {
                    const val = e.target.value;
                    setHeroSettings((prev: any) => ({ ...prev, banner_description: val }));
                  }}
                  rows={2}
                  placeholder="Premium minute-billed live consultations with top-tier specialists"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Banner Background Image Cover URL</label>
                <input
                  type="text"
                  value={heroSettings?.banner_bg_url !== undefined ? heroSettings.banner_bg_url : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop'}
                  onChange={e => {
                    const val = e.target.value;
                    setHeroSettings((prev: any) => ({ ...prev, banner_bg_url: val }));
                  }}
                  placeholder="e.g. https://images.unsplash.com/photo-..."
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs w-full focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Live Preview block inside Super Admin Panel to see the Banner design */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <span className="text-[9px] font-mono uppercase text-slate-500 tracking-widest font-black">Admin Live Preview</span>
                <div 
                  style={{ 
                    backgroundImage: `url(${heroSettings?.banner_bg_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                  className="relative p-4 rounded-xl overflow-hidden border border-slate-800/60 text-left min-h-[80px] flex flex-col justify-center animate-in fade-in duration-300"
                >
                  <div className="absolute inset-0 bg-slate-950/85 pointer-events-none" />
                  <div className="relative z-10">
                    <h4 className="text-xs font-black text-slate-100 truncate">
                      {heroSettings?.banner_headline || "🔥 Skip the Search. Talk to Who You Want."}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {heroSettings?.banner_description !== undefined ? heroSettings.banner_description : "Premium minute-billed live consultations with top-tier specialists"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {saved && (
                  <span className="text-emerald-400 text-xs font-mono">✓ Banner settings updated successfully!</span>
                )}
                <button
                  type="button"
                  onClick={handleSaveHero}
                  disabled={savingHero}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 px-6 py-2 rounded-xl text-xs font-black transition-all ml-auto flex items-center gap-1.5 shadow-md shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {savingHero ? 'Saving Banner...' : 'Apply & Save Banner'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
