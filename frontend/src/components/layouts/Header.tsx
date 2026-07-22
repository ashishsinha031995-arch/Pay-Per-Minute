import React from 'react';
import { Shield, Sparkles, User, MessageSquare, Database, Radio, CreditCard, LogOut, Menu, Sun, Moon, Check, Copy, Globe, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  currentRole: 'user' | 'consultant' | 'admin';
  onChangeRole: (role: 'user' | 'consultant' | 'admin') => void;
  socketConnected: boolean;
  currentUser: any;
  currentConsultant?: any;
  onLogout: () => void;
  onOpenAuth: (options?: { tab?: 'login' | 'signup' | 'forgot', signUpType?: 'choose' | 'user' | 'consultant' }) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onNavigateToUserView?: (username: string) => void;
}

export function Header({ currentRole, onChangeRole, socketConnected, currentUser, currentConsultant, onLogout, onOpenAuth, theme, onToggleTheme, onNavigateToUserView }: HeaderProps) {
  const [copiedConsultantUrl, setCopiedConsultantUrl] = React.useState(false);

  const isLoggedOut = (currentRole === 'user' && !currentUser) || (currentRole === 'consultant' && !currentConsultant);

  const handleCopyConsultantLink = () => {
    if (!currentConsultant) return;
    const bookingUrl = `${window.location.origin}/u/${currentConsultant.username}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopiedConsultantUrl(true);
    setTimeout(() => setCopiedConsultantUrl(false), 2000);
  };
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-3 py-2 w-full">
        <div className="flex justify-between items-center w-full">
          
          {/* Left Side (Logo CallMint) */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => window.dispatchEvent(new CustomEvent('logo-click'))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('logo-click'));
              }
            }}
            className="flex items-center gap-2 flex-shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-xl p-1"
            title="Go to Home"
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl text-slate-900 shadow-md">
                <MessageSquare className="w-6 h-6 font-bold" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent select-none">
                  CallMint
                </h1>
              </div>
            </div>
          </div>

          {/* Center (Core Architecture Indicators) - Hidden on mobile, visible on desktop only in development mode */}
          {((import.meta as any).env?.DEV || window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') || window.location.hostname.includes('ais-dev')) && (
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
          )}

          {/* Right Side (Actions / Badges / Mobile Controls) */}
          <div className="flex items-center gap-x-2">
            {/* Desktop-only Auth Badge */}
            {currentUser && currentRole === 'user' ? (
              <div className="hidden lg:flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser.photo_url) {
                      window.dispatchEvent(new CustomEvent('view-user-photo', { detail: currentUser.photo_url }));
                    }
                  }}
                  className="relative w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 group cursor-pointer hover:scale-105 active:scale-95 transition-all p-0 border-0 bg-transparent focus:outline-none"
                  title="Click to view photo"
                >
                  {/* Subtle pulsing backdrop */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-60 blur-[1px] animate-pulse group-hover:scale-110 transition-transform duration-300" />
                  {currentUser.photo_url ? (
                    <img 
                      src={currentUser.photo_url} 
                      alt="" 
                      className="w-6 h-6 rounded-full object-cover border border-emerald-400/30 relative z-10 animate-fade-in" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center border border-emerald-400/20 relative z-10">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  )}
                </button>
                <div className="text-xs flex items-center">
                  <span className="text-slate-200 font-bold mr-2">{currentUser.display_name} (ID: {currentUser.id})</span>
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
                <div className="h-4 w-px bg-slate-800 mx-1" />
                <button
                  id="desktop-header-hamburger-btn"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggle-hamburger-menu'));
                  }}
                  className="p-1 text-slate-300 hover:text-white bg-slate-900 active:scale-95 hover:bg-slate-850 rounded-lg transition-all flex items-center justify-center w-7 h-7 border border-slate-800 shadow-sm shrink-0 cursor-pointer"
                  title="Open Navigation Menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
            ) : isLoggedOut ? (
              <button
                onClick={onOpenAuth}
                className="hidden lg:flex bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-sm items-center space-x-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            ) : null}

            {/* Universal Desktop Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-sky-400" />
              )}
            </button>

            {/* Desktop-only Role Switcher */}
            {currentRole === 'admin' && (
              <div className="hidden lg:flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                <button
                  id="switch-to-user"
                  onClick={() => onChangeRole('user')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Consultants Page</span>
                </button>

                <button
                  id="switch-to-consultant"
                  onClick={() => onChangeRole('consultant')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-400 hover:text-white hover:bg-slate-900"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Consultant Portal</span>
                </button>

                <button
                  id="switch-to-admin"
                  onClick={() => onChangeRole('admin')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-emerald-500 text-slate-950 shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Super Admin</span>
                </button>
              </div>
            )}

            {/* Mobile Actions Container (hidden on desktop, flex-centered elements) */}
            <div className="lg:hidden flex items-center justify-end gap-x-2.5 pr-1.5">
              {currentRole === 'consultant' && currentConsultant ? (
                <>
                  {/* Profile Photo (to the left of the hamburger menu) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (currentConsultant.photo_url) {
                        window.dispatchEvent(new CustomEvent('view-user-photo', { detail: currentConsultant.photo_url }));
                      }
                    }}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center relative group cursor-pointer hover:scale-105 active:scale-95 transition-all p-0 border-0 bg-transparent focus:outline-none"
                    title="Click to view photo"
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-60 blur-[3px] animate-pulse group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-emerald-400/80 via-teal-400/20 to-emerald-400/80 animate-spin [animation-duration:8s] opacity-75" />
                    {currentConsultant.photo_url ? (
                      <img
                        src={currentConsultant.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-emerald-400/30 shadow-md block relative z-10"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-emerald-400/20 shadow-md relative z-10">
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                  </button>

                  {/* Hamburger Menu Icon */}
                  <div className="flex items-center justify-center">
                    <button
                      id="mobile-header-hamburger-btn-consultant"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('toggle-hamburger-menu'));
                      }}
                      className="p-1 text-slate-200 hover:text-white bg-slate-800 active:scale-95 hover:bg-slate-750 rounded-xl transition-all flex items-center justify-center w-10 h-10 border border-slate-700 shadow-md shrink-0"
                      title="Open Navigation Menu"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : currentUser && currentRole === 'user' ? (
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
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser.photo_url) {
                        window.dispatchEvent(new CustomEvent('view-user-photo', { detail: currentUser.photo_url }));
                      }
                    }}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center relative group cursor-pointer hover:scale-105 active:scale-95 transition-all p-0 border-0 bg-transparent focus:outline-none"
                    title="Click to view photo"
                  >
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
                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-emerald-400/20 shadow-md relative z-10">
                        <User className="w-5 h-5 text-emerald-400" />
                      </div>
                    )}
                  </button>

                  {/* Hamburger Menu Icon */}
                  <div className="flex items-center justify-center">
                    <button
                      id="mobile-header-hamburger-btn"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('toggle-hamburger-menu'));
                      }}
                      className="p-1 text-slate-200 hover:text-white bg-slate-800 active:scale-95 hover:bg-slate-750 rounded-xl transition-all flex items-center justify-center w-10 h-10 border border-slate-700 shadow-md shrink-0"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : isLoggedOut ? (
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
