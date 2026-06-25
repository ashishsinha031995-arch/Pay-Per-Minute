import React from 'react';
import { Shield, Sparkles, User, MessageSquare, Database, Radio, CreditCard, LogOut } from 'lucide-react';

interface HeaderProps {
  currentRole: 'user' | 'consultant' | 'admin';
  onChangeRole: (role: 'user' | 'consultant' | 'admin') => void;
  socketConnected: boolean;
  currentUser: any;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export function Header({ currentRole, onChangeRole, socketConnected, currentUser, onLogout, onOpenAuth }: HeaderProps) {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-4 space-y-4 lg:space-y-0">
          
          {/* Logo / Brand */}
          <div className="flex items-center justify-between lg:justify-start lg:space-x-3">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl text-slate-900 shadow-md">
                <MessageSquare className="w-6 h-6 font-bold" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  CallMint
                </h1>
                <p className="text-xs text-slate-400 font-mono">SaaS Pay-Per-Minute Chat</p>
              </div>
            </div>

            {/* Mobile Auth button block */}
            <div className="lg:hidden">
              {currentUser && currentRole === 'user' ? (
                <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-emerald-400">₹{parseFloat(currentUser.wallet_balance || 0).toFixed(0)}</span>
                  <button onClick={onLogout} className="text-rose-400 p-1"><LogOut className="w-4 h-4" /></button>
                </div>
              ) : currentRole === 'user' ? (
                <button onClick={onOpenAuth} className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs">Login</button>
              ) : null}
            </div>
          </div>

          {/* Core Architecture Indicators */}
          <div className="hidden md:flex items-center space-x-4 text-[11px] font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <Database className="w-3 h-3" />
              <span>SQLite Connected</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className={`flex items-center space-x-1.5 ${socketConnected ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
              <Radio className="w-3.5 h-3.5" />
              <span>{socketConnected ? 'Socket.IO Live' : 'Socket Connecting...'}</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center space-x-1.5 text-cyan-400">
              <CreditCard className="w-3 h-3" />
              <span>Razorpay Sandbox ready</span>
            </div>
          </div>

          {/* User Badge or Login block */}
          <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end">
            {currentUser && currentRole === 'user' ? (
              <div className="hidden lg:flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/80">
                {currentUser.photo_url ? (
                  <img src={currentUser.photo_url} alt="" className="w-5 h-5 rounded-full object-cover border border-slate-800" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                )}
                <div className="text-xs">
                  <span className="text-slate-200 font-bold">{currentUser.display_name}</span>
                  <span className="text-emerald-400 font-mono ml-2 font-bold">₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}</span>
                </div>
                <button 
                  onClick={onLogout}
                  className="text-[10px] text-rose-400 hover:text-rose-300 font-mono font-bold bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded transition-all ml-1"
                >
                  Logout
                </button>
              </div>
            ) : currentRole === 'user' ? (
              <button
                onClick={onOpenAuth}
                className="hidden lg:flex bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-sm items-center space-x-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>Login / Sign Up</span>
              </button>
            ) : null}

            {/* Interactive Role Switcher */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                id="switch-to-user"
                onClick={() => onChangeRole('user')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentRole === 'user'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Consultants Page</span>
              </button>

              <button
                id="switch-to-consultant"
                onClick={() => onChangeRole('consultant')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentRole === 'consultant'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Consultant Portal</span>
              </button>

              <button
                id="switch-to-admin"
                onClick={() => onChangeRole('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentRole === 'admin'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
