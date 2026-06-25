import React, { useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  LineChart, Line, BarChart, Bar, Legend, ComposedChart 
} from 'recharts';
import { 
  Plus, Trash2, Edit, Check, X, Shield, Lock, Trash, HelpCircle, 
  Send, Bell, Mail, Phone, MessageSquare, AlertCircle, RefreshCw, Sparkles, AlertTriangle,
  Filter, Calendar, TrendingUp, CreditCard, ChevronRight, ShoppingCart, Percent, Layers, Landmark, Info
} from 'lucide-react';
import { 
  revenueTrendData, growthTrendData, packageSalesData, 
  mockAuditLogs, mockSupportTickets, initialCoupons, mockBlogPages, systemRolesList,
  dailyRevenueTrendData, weeklyRevenueTrendData, dailySubscriptionSalesData
} from './AdminMockData';

// Component 1: ANALYTICS & GRAPHS
export function DashboardGraphs() {
  // 1. Revenue & Commission Filters State
  const [revenueTimeframe, setRevenueTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [revDateFilter, setRevDateFilter] = useState<'all' | '7days' | '14days'>('all');
  const [minRevenue, setMinRevenue] = useState<number>(0);
  const [simulatedCommissionRate, setSimulatedCommissionRate] = useState<number>(20); // default platform commission is 20%
  
  // 2. Subscription Filters State
  const [subDateFilter, setSubDateFilter] = useState<'all' | '7days' | '14days'>('all');
  const [minSubsSold, setMinSubsSold] = useState<number>(0);
  const [showPlansBreakdown, setShowPlansBreakdown] = useState<boolean>(true);

  // 3. Tab State for raw data table
  const [showDataTable, setShowDataTable] = useState<boolean>(false);
  const [dataTableTab, setDataTableTab] = useState<'revenue' | 'subscriptions'>('revenue');

  // --- REVENUE FILTERING LOGIC ---
  const rawRevData = revenueTimeframe === 'daily' ? dailyRevenueTrendData : weeklyRevenueTrendData;
  
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
  const [tickets, setTickets] = useState(mockSupportTickets);

  const resolveTicket = (id: string) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status: 'Resolved' as const } : t));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider">Active Customer Support Tickets</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Track and resolve user and advisor disputes</p>
          </div>
          <span className="bg-rose-500/10 text-rose-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-rose-500/20">
            {tickets.filter(t => t.status !== 'Resolved').length} Unresolved
          </span>
        </div>

        <div className="space-y-4">
          {tickets.map(t => (
            <div key={t.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded font-bold border border-slate-700">{t.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.priority === 'Critical' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
                    t.priority === 'High' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {t.priority} Priority
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'Resolved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                    'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 animate-pulse'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100">{t.subject}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                  <span>Owner: <strong className="text-slate-400">{t.user} ({t.role})</strong></span>
                  <span>•</span>
                  <span>Assigned To: <strong className="text-slate-400">{t.assignedTo}</strong></span>
                </div>
              </div>

              {t.status !== 'Resolved' && (
                <button
                  onClick={() => resolveTicket(t.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0 align-self-start"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Component 5: AUDIT LOGS MODULE
export function AuditLogsPanel() {
  const [logs, setLogs] = useState(mockAuditLogs);
  const [filter, setFilter] = useState('');

  const filtered = logs.filter(l => 
    l.actor.toLowerCase().includes(filter.toLowerCase()) || 
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.details.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 mb-4 gap-3">
          <div>
            <h3 className="text-sm font-mono text-slate-300 uppercase tracking-wider">Chronological System Audit Ledger</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Records all core administrative actions to maintain platform compliance</p>
          </div>
          <input
            type="text"
            placeholder="Search audit trail..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full md:w-56"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="px-4 py-3">UUID</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-950/40">
                  <td className="px-4 py-3.5 text-cyan-400 font-bold">{l.id}</td>
                  <td className="px-4 py-3.5 text-slate-500">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-slate-200 font-sans">{l.actor} ({l.role})</td>
                  <td className="px-4 py-3.5 text-slate-100">{l.action}</td>
                  <td className="px-4 py-3.5 text-slate-400 font-sans max-w-xs truncate" title={l.details}>{l.details}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      l.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
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

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-xl">
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
    </div>
  );
}
