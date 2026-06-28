import React from 'react';
import { Shield, Sparkles, User, MessageSquare, Database, Radio, CreditCard, LogOut, Menu } from 'lucide-react';

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
      <div className="max-w-7xl mx-auto px-3 py-2 w-full">
        <div className="flex justify-between items-center w-full">
          
          {/* Left Side (Logo) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl text-slate-900 shadow-md">
              <MessageSquare className="w-6 h-6 font-bold" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                CallMint
              </h1>
            </div>
          </div>

          {/* Center (Core Architecture Indicators) - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:flex items-center space-x-4 text-[11px] font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
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

          {/* Right Side (Actions / Badges / Mobile Controls) */}
          <div className="flex items-center gap-x-2">
            {/* Desktop-only Auth Badge */}
            {currentUser && currentRole === 'user' ? (
              <div className="hidden lg:flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/80">
                <div className="relative w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 group">
                  {/* Subtle pulsing backdrop */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-60 blur-[1px] animate-pulse group-hover:scale-110 transition-transform duration-300" />
                  {currentUser.photo_url ? (
                    <img src={currentUser.photo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-emerald-400/30 relative z-10 animate-fade-in" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center border border-emerald-400/20 relative z-10">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  )}
                </div>
                <div className="text-xs flex items-center">
                  <span className="text-slate-200 font-bold mr-2">{currentUser.display_name}</span>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-wallet-tab'))}
                    className="text-emerald-400 font-mono font-bold hover:bg-emerald-500/10 hover:text-emerald-300 px-1.5 py-0.5 rounded transition-all cursor-pointer border border-transparent hover:border-emerald-500/20 flex items-center gap-1 active:scale-95"
                    title="Click to recharge wallet"
                  >
                    <CreditCard className="w-3 h-3 text-emerald-400" />
                    <span>₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}</span>
                  </button>
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

            {/* Desktop-only Role Switcher */}
            <div className="hidden lg:flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
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

              {currentRole === 'admin' && (
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
              )}
            </div>

            {/* Mobile Actions Container (hidden on desktop, flex-centered elements) */}
            <div className="lg:hidden flex items-center justify-end gap-x-2.5 pr-1.5">
              {currentUser && currentRole === 'user' ? (
                <>
                  {/* Wallet Balance Container */}
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-wallet-tab'))}
                    className="flex items-center space-x-1.5 bg-slate-950 hover:bg-slate-900 active:scale-95 px-2.5 py-1.5 rounded-xl border border-slate-800 h-10 max-w-[100px] sm:max-w-none overflow-hidden shrink-0 transition-all cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-emerald-400 font-mono truncate">
                      ₹{parseFloat(currentUser.wallet_balance || 0).toFixed(0)}
                    </span>
                  </button>

                  {/* Profile Avatar with custom breath-glow and rotatory aura animation */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center relative group">
                    {/* Glowing breath backlight layer */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-60 blur-[3px] animate-pulse group-hover:scale-110 transition-transform duration-500" />
                    {/* Slow elegant rotating gradient ring overlay */}
                    <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-emerald-400/80 via-teal-400/20 to-emerald-400/80 animate-spin [animation-duration:8s] opacity-75" />
                    
                    {currentUser.photo_url ? (
                      <img
                        src={currentUser.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-emerald-400/30 shadow-md block relative z-10"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-emerald-400/20 shadow-md relative z-10">
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                  </div>

                  {/* Hamburger Menu Icon */}
                  <div className="flex items-center justify-center">
                    <button
                      id="mobile-header-hamburger-btn"
                      onClick={() => {
                        const btn = document.getElementById('hamburger-menu-btn');
                        if (btn) {
                          btn.click();
                        }
                      }}
                      className="p-1 text-slate-200 hover:text-white bg-slate-800 active:scale-95 hover:bg-slate-750 rounded-xl transition-all flex items-center justify-center w-10 h-10 border border-slate-700 shadow-md shrink-0"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : currentRole === 'user' ? (
                <button 
                  onClick={onOpenAuth} 
                  className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs transition-all shadow-md h-10 flex items-center justify-center"
                >
                  Login
                </button>
              ) : null}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
