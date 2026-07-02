import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Header } from '../components/layouts/Header';
import { AdminPanel } from '../components/layouts/AdminPanel';
import { ConsultantPanel } from '../components/layouts/ConsultantPanel';
import { ConsultantProfile } from '../components/layouts/ConsultantProfile';
import { ChatRoom } from '../components/modals/ChatRoom';
import { X, Lock, User, Key, Sparkles, CheckCircle, AlertCircle, Phone, ArrowRight, Copy } from 'lucide-react';

export default function AppPage() {
  // Navigation & Role states
  const [currentRole, setCurrentRole] = useState<'user' | 'consultant' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/super-secret-owner-portal') {
        return 'admin';
      }
      const sessionRole = sessionStorage.getItem('current_role');
      if (sessionRole === 'consultant' || sessionRole === 'admin' || sessionRole === 'user') {
        return sessionRole;
      }
      const savedRole = localStorage.getItem('current_role');
      if (savedRole === 'consultant' || savedRole === 'admin' || savedRole === 'user') {
        return savedRole;
      }
      const hasConsultantSession = localStorage.getItem('consultant_session');
      if (hasConsultantSession) {
        return 'consultant';
      }
    }
    return 'user';
  });
  const [socketConnected, setSocketConnected] = useState(false);

  // Deep linking public profiles
  const [targetUsername, setTargetUsername] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/u/')) {
        const username = path.slice(3).trim();
        if (username) {
          localStorage.setItem('clicked_consultant_username', username);
          return username;
        }
      }
      return localStorage.getItem('clicked_consultant_username') || undefined;
    }
    return undefined;
  });

  // Active Chat Session state
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    userName: string;
    role: 'user' | 'consultant';
  } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const persisted = localStorage.getItem('advisor_active_session');
        if (persisted) {
          return JSON.parse(persisted);
        }
      } catch (e) {
        console.error('Error reading activeSession from localStorage:', e);
      }
    }
    return null;
  });

  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('advisor_active_session', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('advisor_active_session');
    }
  }, [activeSession]);

  // User Auth States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authRole, setAuthRole] = useState<'user' | 'consultant'>('user');
  const [signUpType, setSignUpType] = useState<'choose' | 'user' | 'consultant'>('choose');
  const [consultantCategory, setConsultantCategory] = useState('Consultants');

  // Auth Inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [newPassword, setNewPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string, password: string, displayName: string} | null>(null);

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
        localStorage.setItem('clicked_consultant_username', username);
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

  // Maintain the history of clicked consultant usernames in localStorage
  useEffect(() => {
    if (targetUsername) {
      try {
        const rawHistory = localStorage.getItem('clicked_consultants_history');
        let history = rawHistory ? JSON.parse(rawHistory) : [];
        if (!Array.isArray(history)) history = [];
        const normalized = targetUsername.trim().toLowerCase();
        if (normalized && !history.some((u: string) => String(u).trim().toLowerCase() === normalized)) {
          history.push(targetUsername.trim());
          localStorage.setItem('clicked_consultants_history', JSON.stringify(history));
        }
      } catch (e) {
        console.error('Error maintaining clicked_consultants_history:', e);
      }
    }
  }, [targetUsername]);

  // Lock user to referred consultant if landing on deep link
  useEffect(() => {
    if (currentUser?.id) {
      // Collect clicked history from localStorage
      let usernamesToSync: string[] = [];
      try {
        const rawHistory = localStorage.getItem('clicked_consultants_history');
        if (rawHistory) {
          usernamesToSync = JSON.parse(rawHistory).map((s: string) => s.trim()).filter(Boolean);
        }
      } catch (e) {
        console.error('Error parsing click history:', e);
      }

      if (targetUsername && !usernamesToSync.some(u => u.toLowerCase() === targetUsername.toLowerCase())) {
        usernamesToSync.push(targetUsername);
      }

      if (usernamesToSync.length > 0) {
        fetch('/api/user/lock-referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, usernames: usernamesToSync })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
          }
        })
        .catch(err => console.error('Error locking referral:', err));
      }
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

  // Consultant Sign Up handler to register directly without storing locally
  const handleConsultantRegisterDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!displayName.trim() || !email.trim() || !phone.trim()) {
      setAuthError('All fields are required');
      return;
    }

    const numericPhone = phone.replace(/\D/g, '');
    if (numericPhone.length !== 10) {
      setAuthError('Mobile number must be exactly 10 digits.');
      return;
    }

    try {
      const res = await fetch('/api/consultants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          email: email.trim().toLowerCase(),
          phone: numericPhone,
          category: consultantCategory,
          plan_id: null // No plan chosen yet
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setGeneratedCredentials({
        username: data.username,
        password: data.password,
        displayName: data.display_name
      });

      setAuthSuccess('Consultant Account Created Successfully! Please save your credentials.');

      // Auto-login preparer
      const newConsultantSession = {
        id: data.consultant_id,
        username: data.username,
        display_name: data.display_name,
        email: data.email,
        phone: data.phone,
        category: consultantCategory,
        plan_id: null,
        plan_expiry: null,
        is_active: 1
      };

      // Store session
      localStorage.setItem('consultant_session', JSON.stringify(newConsultantSession));
      localStorage.setItem('current_role', 'consultant');
      sessionStorage.setItem('current_role', 'consultant');
    } catch (err: any) {
      setAuthError(err.message);
    }
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
    const numericPhone = phone.replace(/\D/g, '');
    if (numericPhone.length !== 10) {
      setAuthError('Mobile number must be exactly 10 digits.');
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
          display_name: displayName.trim(),
          gender: gender,
          phone: '+91' + numericPhone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      setAuthSuccess('Registration successful! Please log in now.');
      setAuthTab('login');
      setPassword('');
      setEmail('');
      setPhone('');
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
        localStorage.setItem('current_role', 'user');
        sessionStorage.setItem('current_role', 'user');
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
        localStorage.setItem('current_role', 'consultant');
        sessionStorage.setItem('current_role', 'consultant');
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
    localStorage.removeItem('consultant_session');
    localStorage.removeItem('advisor_active_session');
    localStorage.removeItem('clicked_consultant_username');
    localStorage.removeItem('current_role');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('current_role');
    }
    setTargetUsername(undefined);
    setCurrentUser(null);
    setActiveSession(null);
    setCurrentRole('user');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 1. Header (Shared) */}
      <Header
        currentRole={currentRole}
        onChangeRole={(role) => {
          setCurrentRole(role);
          localStorage.setItem('current_role', role);
          sessionStorage.setItem('current_role', role);
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
          setSignUpType('choose');
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
                onClearTargetUsername={() => {
                  localStorage.removeItem('clicked_consultant_username');
                  setTargetUsername(undefined);
                  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/u/')) {
                    window.history.pushState({}, '', '/');
                  }
                }}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                onOpenAuth={() => {
                  setAuthError(null);
                  setAuthSuccess(null);
                  setAuthTab('login');
                  setSignUpType('choose');
                  setAuthModalOpen(true);
                }}
                activeSessionId={activeSession?.sessionId}
                onLogout={handleLogout}
              />
            )}

            {currentRole === 'consultant' && (
              // Consultant Dashboard
              <ConsultantPanel
                onSelectSession={handleSelectSession}
                onNavigateToUserView={handleNavigateToUserView}
                activeSessionId={activeSession?.sessionId}
                onLogout={handleLogout}
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
                  {authTab === 'signup' && (
                    signUpType === 'choose' ? 'Join CallMint' : 
                    signUpType === 'consultant' ? 'Consultant Sign Up' : 'User Sign Up'
                  )}
                  {authTab === 'forgot' && 'Reset Password'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {authTab === 'login' && 'Log in to start high-quality secured audio chats instantly.'}
                {authTab === 'signup' && (
                  signUpType === 'choose' ? 'Select an account type to get started.' : 
                  signUpType === 'consultant' ? 'Enter your professional details to create a consultant account.' : 
                  'Create your client account with username & email address.'
                )}
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

            {/* Tab Content & Choice Screen */}
            {authTab === 'signup' && signUpType === 'choose' ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-300 font-medium text-center">
                  Select how you would like to join CallMint:
                </p>
                
                <div className="space-y-3">
                  {/* Option 1: Sign up as a User */}
                  <button
                    type="button"
                    onClick={() => setSignUpType('user')}
                    className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 text-left transition-all duration-200 group active:scale-[0.98] flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
                        <span>Sign Up as a User</span>
                        <span className="text-xs">👤</span>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed max-w-[280px]">
                        Consult with professional mentors & advisers, recharge wallet, and chat instantly.
                      </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:border-transparent transition-all">
                      <User className="w-4 h-4 text-emerald-400 group-hover:text-slate-950 transition-colors" />
                    </div>
                  </button>

                  {/* Option 2: Join as a Consultant */}
                  <button
                    type="button"
                    onClick={() => {
                      setSignUpType('consultant');
                      setAuthError(null);
                    }}
                    className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 text-left transition-all duration-200 group active:scale-[0.98] flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors">
                        <span>Join as a Consultant</span>
                        <span className="text-xs">💼</span>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed max-w-[280px]">
                        Offer your consulting/advising services, manage sessions, and view earnings.
                      </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl group-hover:bg-emerald-500 group-hover:text-slate-950 group-hover:border-transparent transition-all">
                      <Sparkles className="w-4 h-4 text-emerald-400 group-hover:text-slate-950 transition-colors" />
                    </div>
                  </button>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login');
                      setAuthError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-emerald-400 hover:underline transition-colors font-mono"
                  >
                    ← Already have an account? Login
                  </button>
                </div>
              </div>
            ) : authTab === 'signup' && signUpType === 'consultant' ? (
              generatedCredentials ? (
                <div className="space-y-4 text-left p-4 bg-slate-950 rounded-2xl border border-slate-800 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase font-mono mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 font-bold" />
                    <span>Portal Account Registered!</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Welcome <strong className="text-slate-200">{generatedCredentials.displayName}</strong>! We have registered your advisor profile and sent the secure login credentials to your email.
                  </p>
                  
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-2.5 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const copyTxt = `Username: ${generatedCredentials.username}\nPassword: ${generatedCredentials.password}`;
                        navigator.clipboard.writeText(copyTxt);
                        alert('Credentials copied securely!');
                      }}
                      className="absolute top-2.5 right-2.5 text-[10px] text-slate-500 hover:text-white flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-mono">USERNAME</span>
                      <strong className="text-xs font-mono text-slate-200 select-all">{generatedCredentials.username}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-mono">PASSWORD</span>
                      <strong className="text-xs font-mono text-slate-200 select-all">{generatedCredentials.password}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    💡 Click below to open your Consultant Dashboard and buy a subscription plan to start earning.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      // Trigger routing update and close modal
                      setCurrentRole('consultant');
                      setAuthModalOpen(false);
                      setDisplayName('');
                      setEmail('');
                      setPhone('');
                      setGeneratedCredentials(null);
                      // Dispatch storage event so other components sync
                      window.dispatchEvent(new Event('storage'));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-1.5"
                  >
                    <span>Go to Consultant Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConsultantRegisterDirect} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Full Name / Display Name *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acharya Raj Shastri"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Email Address *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-500">@</span>
                      <input
                        type="email"
                        required
                        placeholder="e.g. raj.astrologer@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Mobile Number *</label>
                    <div className="relative flex rounded-xl border border-slate-800 bg-slate-950 items-center focus-within:border-emerald-500 transition-colors overflow-hidden">
                      <div className="flex items-center pl-3.5 pr-2 py-2.5 bg-slate-900 border-r border-slate-800 shrink-0">
                        <Phone className="w-4 h-4 text-slate-500 mr-1.5" />
                        <span className="text-xs font-bold text-slate-300 font-mono">+91</span>
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 10) {
                            setPhone(val);
                          }
                        }}
                        className="w-full bg-transparent border-0 pl-3 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">My Professional Category *</label>
                    <select
                      value={consultantCategory}
                      onChange={(e) => setConsultantCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                      required
                    >
                      <option value="Astrologers">Astrologers</option>
                      <option value="Influencers">Influencers</option>
                      <option value="Mentors">Mentors</option>
                      <option value="Doctors">Doctors</option>
                      <option value="Lawyers">Lawyers</option>
                      <option value="Singers">Singers</option>
                      <option value="Advisors">Advisors</option>
                      <option value="Friends">Friends</option>
                      <option value="Coaches">Coaches</option>
                      <option value="Consultants">Consultants</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-sm animate-pulse"
                  >
                    Create Account & Open Dashboard
                  </button>

                  <div className="flex justify-between items-center px-1 pt-2 border-t border-slate-850/60 text-center text-xs text-slate-400 font-mono">
                    <button type="button" onClick={() => setSignUpType('choose')} className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]">
                      ← Change Type
                    </button>
                    <div className="flex space-x-1 text-[11px]">
                      <span>Already have an account?</span>
                      <button type="button" onClick={() => { setAuthTab('login'); setAuthError(null); }} className="text-emerald-400 hover:underline font-bold">
                        Login
                      </button>
                    </div>
                  </div>
                </form>
              )
            ) : (
              <>
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
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Mobile Number *</label>
                      <div className="relative flex rounded-xl border border-slate-800 bg-slate-950 items-center focus-within:border-emerald-500 transition-colors overflow-hidden">
                        <div className="flex items-center pl-3.5 pr-2 py-2.5 bg-slate-900 border-r border-slate-800 shrink-0">
                          <Phone className="w-4 h-4 text-slate-500 mr-1.5" />
                          <span className="text-xs font-bold text-slate-300 font-mono">+91</span>
                        </div>
                        <input
                          type="tel"
                          required
                          placeholder="9876543210"
                          value={phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 10) {
                              setPhone(val);
                            }
                          }}
                          className="w-full bg-transparent border-0 pl-3 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
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

                  {authTab === 'signup' && (
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">Gender *</label>
                      <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setGender('Male')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                            gender === 'Male' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Male ♂️
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('Female')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                            gender === 'Female' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Female ♀️
                        </button>
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
                        <button onClick={() => { setAuthTab('signup'); setSignUpType('choose'); setAuthError(null); }} className="text-emerald-400 hover:underline font-bold text-[11px]">
                          Create Account
                        </button>
                      </div>
                    </>
                  )}

                  {authTab === 'signup' && (
                    <div className="flex justify-between items-center px-1">
                      <button onClick={() => setSignUpType('choose')} className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]">
                        ← Change Type
                      </button>
                      <div className="flex space-x-1 text-[11px]">
                        <span>Already have an account?</span>
                        <button onClick={() => { setAuthTab('login'); setAuthError(null); }} className="text-emerald-400 hover:underline font-bold">
                          Login
                        </button>
                      </div>
                    </div>
                  )}

                  {authTab === 'forgot' && (
                    <button onClick={() => { setAuthTab('login'); setAuthError(null); }} className="text-slate-400 hover:text-white text-xs">
                      ← Back to Login
                    </button>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
