import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Header } from '../components/layouts/Header';
import { AdminPanel } from '../components/layouts/AdminPanel';
import { ConsultantPanel } from '../components/layouts/ConsultantPanel';
import { ConsultantProfile } from '../components/layouts/ConsultantProfile';
import { ChatRoom } from '../components/modals/ChatRoom';
import { X, Lock, User, Key, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export default function AppPage() {
  // Navigation & Role states
  const [currentRole, setCurrentRole] = useState<'user' | 'consultant' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/super-secret-owner-portal') {
        return 'admin';
      }
    }
    return 'user';
  });
  const [socketConnected, setSocketConnected] = useState(false);

  // Deep linking public profiles
  const [targetUsername, setTargetUsername] = useState<string | undefined>(undefined);

  // Active Chat Session state
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    userName: string;
    role: 'user' | 'consultant';
  } | null>(null);

  // User Auth States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authRole, setAuthRole] = useState<'user' | 'consultant'>('user');

  // Auth Inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Sync user profile state from database
  const refreshUserProfile = async (id: number) => {
    if (!id || isNaN(id)) return;
    try {
      const res = await fetch(`/api/user/profile/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          if (data.user.is_blocked === 1) {
            alert('Aapka account block kar diya gaya hai admin dwara. (Your account is blocked.)');
            handleLogout();
          } else {
            setCurrentUser(data.user);
          }
        }
      }
    } catch (err) {
      // Log as warning rather than triggering error flags for transient/offline situations
      console.warn('Could not refresh user profile temporarily:', err);
    }
  };

  // Background Socket.IO ping monitoring and Deep Link Parsing
  useEffect(() => {
    const socket = io();

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('wallet:updated', (data) => {
      const savedUserId = localStorage.getItem('logged_user_id');
      if (savedUserId && Number(savedUserId) === Number(data.userId)) {
        refreshUserProfile(Number(savedUserId));
      }
    });

    // Parse deep link pathname
    const path = window.location.pathname;
    if (path === '/super-secret-owner-portal') {
      setCurrentRole('admin');
    } else if (path.startsWith('/u/')) {
      const username = path.slice(3).trim();
      if (username) {
        setTargetUsername(username);
        setCurrentRole('user');
      }
    }

    // Load active user session if exists
    const savedUserId = localStorage.getItem('logged_user_id');
    if (savedUserId) {
      refreshUserProfile(parseInt(savedUserId, 10));
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  // Poll profile periodically (every 5 seconds) to keep wallet balance and block status fully synchronized
  useEffect(() => {
    if (currentUser?.id) {
      const interval = setInterval(() => {
        refreshUserProfile(currentUser.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  // Lock user to referred consultant if landing on deep link
  useEffect(() => {
    if (currentUser?.id && targetUsername) {
      fetch('/api/user/lock-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, consultantUsername: targetUsername })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error('Error locking referral:', err));
    }
  }, [currentUser?.id, targetUsername]);

  // Handler to open an active real-time chat room
  const handleSelectSession = (sessionId: string, userName: string, role: 'user' | 'consultant') => {
    setActiveSession({ sessionId, userName, role });
  };

  // Handler to navigate directly to booking URL from Portal URL copier
  const handleNavigateToUserView = (username: string) => {
    setTargetUsername(username);
    setCurrentRole('user');
  };

  // Sign up handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!username.trim() || !password.trim() || !displayName.trim()) {
      setAuthError('All fields are required');
      return;
    }
    try {
      const res = await fetch('/api/user/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          email: email.trim(), 
          password, 
          display_name: displayName.trim() 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      setAuthSuccess('Registration successful! Please log in now.');
      setAuthTab('login');
      setPassword('');
      setEmail('');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!username.trim() || !password.trim()) {
      setAuthError('Please fill in all credentials.');
      return;
    }
    try {
      if (authRole === 'user') {
        const res = await fetch('/api/user/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        
        setCurrentUser(data.user);
        localStorage.setItem('logged_user_id', data.user.id.toString());
        setAuthSuccess('Welcome back! Logging in...');
        setTimeout(() => {
          setAuthModalOpen(false);
          setAuthSuccess(null);
        }, 1000);
      } else {
        // Log in as consultant
        const res = await fetch('/api/consultants/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Consultant authentication failed');
        
        // Save consultant session and switch role
        localStorage.setItem('consultant_session', JSON.stringify(data.consultant));
        setCurrentRole('consultant');
        setAuthSuccess(`Welcome, ${data.consultant.display_name}! Redirecting to Consultant Dashboard...`);
        
        // Dispatch window event so ConsultantPanel reloads its session
        setTimeout(() => {
          window.dispatchEvent(new Event('storage'));
          setAuthModalOpen(false);
          setAuthSuccess(null);
        }, 1200);
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!username.trim() || !newPassword.trim()) {
      setAuthError('Please fill in your username and new password.');
      return;
    }
    try {
      const res = await fetch('/api/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');
      setAuthSuccess('Password changed successfully! You can now login.');
      setAuthTab('login');
      setPassword('');
      setNewPassword('');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('logged_user_id');
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 1. Header (Shared) */}
      <Header
        currentRole={currentRole}
        onChangeRole={(role) => {
          setCurrentRole(role);
          // If switching role, reset target profile links
          if (role !== 'user') setTargetUsername(undefined);
          if (role !== 'admin' && window.location.pathname === '/super-secret-owner-portal') {
            window.history.pushState({}, '', '/');
          }
        }}
        socketConnected={socketConnected}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => {
          setAuthError(null);
          setAuthSuccess(null);
          setAuthTab('login');
          setAuthModalOpen(true);
        }}
      />

      {/* 2. Main Content Routing Area */}
      <main className="flex-1 pb-12">
        {activeSession ? (
          // Active Socket Chat Room overlay
          <ChatRoom
            sessionId={activeSession.sessionId}
            userName={activeSession.userName}
            role={activeSession.role}
            currentUser={currentUser}
            refreshUserProfile={refreshUserProfile}
            onClose={() => {
              setActiveSession(null);
              if (currentUser?.id) refreshUserProfile(currentUser.id);
            }}
          />
        ) : (
          <>
            {currentRole === 'user' && (
              // User View / Consultants page
              <ConsultantProfile
                onSelectSession={handleSelectSession}
                targetUsername={targetUsername}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                onOpenAuth={() => {
                  setAuthError(null);
                  setAuthSuccess(null);
                  setAuthTab('login');
                  setAuthModalOpen(true);
                }}
                activeSessionId={activeSession?.sessionId}
              />
            )}

            {currentRole === 'consultant' && (
              // Consultant Dashboard
              <ConsultantPanel
                onSelectSession={handleSelectSession}
                onNavigateToUserView={handleNavigateToUserView}
                activeSessionId={activeSession?.sessionId}
              />
            )}

            {currentRole === 'admin' && (
              // Super Admin Control panel
              <AdminPanel />
            )}
          </>
        )}
      </main>

      {/* AUTHENTICATION OVERLAY MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100">
            
            <button 
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-950/40 p-2 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Heading */}
            <div className="space-y-1">
              <h3 className="text-xl font-black flex items-center space-x-2 text-emerald-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span>
                  {authTab === 'login' && (authRole === 'user' ? 'User Login' : 'Consultant Login')}
                  {authTab === 'signup' && 'User Sign Up'}
                  {authTab === 'forgot' && 'Reset Password'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {authTab === 'login' && 'Log in to start high-quality secured audio chats instantly.'}
                {authTab === 'signup' && 'Create your client account with username & email address.'}
                {authTab === 'forgot' && 'Enter your username and set a brand new password securely.'}
              </p>
            </div>

            {/* Error / Success notification feeds */}
            {authError && (
              <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 p-3 rounded-xl text-xs flex items-center space-x-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-3 rounded-xl text-xs flex items-center space-x-2 font-mono">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Tab Forms */}
            <form onSubmit={authTab === 'login' ? handleLogin : authTab === 'signup' ? handleSignUp : handleForgotPassword} className="space-y-4">
              
              {authTab === 'login' && (
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setAuthRole('user')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      authRole === 'user' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Login as User 👤
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthRole('consultant')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      authRole === 'consultant' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Login as Consultant 💼
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                  {authRole === 'user' ? 'Username or Email *' : 'Username or Consultant Email *'}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder={authRole === 'user' ? 'e.g. ashish_sinha or ashish@example.com' : 'e.g. expert_pandit or pandit@example.com'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {authTab === 'signup' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Email Address *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-500">@</span>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ashish@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {authTab === 'signup' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Display Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ashish Sinha"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {authTab === 'login' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {authTab === 'signup' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Set Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="Set secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {authTab === 'forgot' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">New Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-sm"
              >
                {authTab === 'login' && 'Log In Now'}
                {authTab === 'signup' && 'Register Account'}
                {authTab === 'forgot' && 'Reset My Password'}
              </button>

            </form>

            {/* Alternating Tab switch footer */}
            <div className="flex flex-col space-y-2 pt-2 border-t border-slate-850/60 text-center text-xs text-slate-400 font-mono">
              {authTab === 'login' && (
                <>
                  <div className="flex justify-between items-center">
                    <button onClick={() => { setAuthTab('forgot'); setAuthError(null); }} className="hover:text-emerald-400 text-[11px]">
                      Forgot Password?
                    </button>
                    <button onClick={() => { setAuthTab('signup'); setAuthError(null); }} className="text-emerald-400 hover:underline font-bold text-[11px]">
                      Create Account
                    </button>
                  </div>
                </>
              )}

              {authTab === 'signup' && (
                <div className="flex justify-center space-x-1">
                  <span>Already have an account?</span>
                  <button onClick={() => { setAuthTab('login'); setAuthError(null); }} className="text-emerald-400 hover:underline font-bold">
                    Login
                  </button>
                </div>
              )}

              {authTab === 'forgot' && (
                <button onClick={() => { setAuthTab('login'); setAuthError(null); }} className="text-slate-400 hover:text-white text-xs">
                  ← Back to Login
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
