import React, { useState, useEffect } from 'react';
import { Sparkles, Key, LogIn, LogOut, Wallet, ShieldCheck, UserCheck, RefreshCw, Copy, Check, FileText, Star, Settings2, Globe, Flame, ShieldAlert } from 'lucide-react';
import { Consultant, Plan, Session } from '../../types';

interface ConsultantPanelProps {
  onSelectSession: (sessionId: string, username: string, role: 'user' | 'consultant') => void;
  onNavigateToUserView: (username: string) => void;
}

export function ConsultantPanel({ onSelectSession, onNavigateToUserView }: ConsultantPanelProps) {
  // Authentication & Session States
  const [currentConsultant, setCurrentConsultant] = useState<Consultant | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // Registration States
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPrice, setRegisterPrice] = useState('20');
  const [registerCategory, setRegisterCategory] = useState<'Astrologers' | 'Influencers' | 'Coaches' | 'Consultants' | 'Lawyers' | 'Mentors'>('Consultants');
  const [credentialsGenerated, setCredentialsGenerated] = useState<{username: string, password: string, displayName: string} | null>(null);

  // Stats & Sessions list
  const [wallet, setWallet] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Profile Form States
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');
  const [pricePerMin, setPricePerMin] = useState('20');

  // Status Toggles
  const [isOnline, setIsOnline] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Common UI feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Past session lookup states
  const [viewingPastSessionMessages, setViewingPastSessionMessages] = useState<any[] | null>(null);
  const [viewingPastSessionInfo, setViewingPastSessionInfo] = useState<any | null>(null);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  // Load plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/plans');
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
          if (data.length > 0) setSelectedPlanId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      }
    };
    fetchPlans();

    // Check if consultant already logged in during active session
    const saved = localStorage.getItem('consultant_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentConsultant(parsed);
        loadConsultantStatsAndStatus(parsed.id);
      } catch (e) {
        localStorage.removeItem('consultant_session');
      }
    }
  }, []);

  // Poll stats and sessions list every 4 seconds for incoming chat requests
  useEffect(() => {
    if (!currentConsultant) return;
    const interval = setInterval(() => {
      loadConsultantStatsAndStatus(currentConsultant.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentConsultant]);

  // Logout handler
  function handleLogout() {
    localStorage.removeItem('consultant_session');
    setCurrentConsultant(null);
    setWallet(null);
    setSessions([]);
    setCredentialsGenerated(null);
    setUsernameInput('');
    setPasswordInput('');
  }

  // Block User Handler
  const handleBlockUser = async (userName: string) => {
    if (!currentConsultant) return;
    try {
      const res = await fetch('/api/consultants/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultant_id: currentConsultant.id,
          user_name: userName,
        }),
      });
      if (res.ok) {
        // Refresh the blocked list
        const listRes = await fetch(`/api/consultants/${currentConsultant.id}/blocked`);
        if (listRes.ok) {
          setBlockedUsers(await listRes.json());
        }
      }
    } catch (err) {
      console.error('Error blocking user:', err);
    }
  };

  // Unblock User Handler
  const handleUnblockUser = async (userName: string) => {
    if (!currentConsultant) return;
    try {
      const res = await fetch('/api/consultants/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultant_id: currentConsultant.id,
          user_name: userName,
        }),
      });
      if (res.ok) {
        // Refresh the blocked list
        const listRes = await fetch(`/api/consultants/${currentConsultant.id}/blocked`);
        if (listRes.ok) {
          setBlockedUsers(await listRes.json());
        }
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
    }
  };

  const loadConsultantStatsAndStatus = async (id: number) => {
    try {
      const res = await fetch(`/api/consultants/${id}/stats`);
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
        setSessions(data.sessions);
      } else if (res.status === 404 || res.status === 401) {
        // Stale session, clean it up!
        handleLogout();
        return;
      }

      // Fetch blocked users
      const blockedRes = await fetch(`/api/consultants/${id}/blocked`);
      if (blockedRes.ok) {
        const blockedData = await blockedRes.json();
        setBlockedUsers(blockedData);
      }

      // Fetch basic profile info to sync online/busy toggles
      const profileRes = await fetch(`/api/consultants`);
      if (profileRes.ok) {
        const list = await profileRes.json() as Consultant[];
        const matching = list.find(c => c.id === id);
        if (matching) {
          setIsOnline(matching.is_online === 1);
          setIsBusy(matching.is_busy === 1);
          setPhotoUrl(matching.photo_url);
          setBio(matching.bio);
          setPricePerMin(matching.price_per_minute.toString());
        } else {
          // Consultant not found in current list
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Error fetching consultant dataset:', err);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/consultants/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      setCurrentConsultant(data.consultant);
      localStorage.setItem('consultant_session', JSON.stringify(data.consultant));
      loadConsultantStatsAndStatus(data.consultant.id);
      setSuccess('Logged in successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Register / Purchase Plan
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!registerDisplayName) {
      setError('Please provide your Display Name');
      return;
    }
    if (!registerEmail) {
      setError('Please provide your Email Address');
      return;
    }
    try {
      const res = await fetch('/api/consultants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          display_name: registerDisplayName,
          email: registerEmail,
          initial_price_per_minute: parseFloat(registerPrice),
          category: registerCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setCredentialsGenerated({
        username: data.username,
        password: data.password,
        displayName: data.display_name,
      });
      setRegisterDisplayName('');
      setRegisterEmail('');
      // Autocomplete login fields for them
      setUsernameInput(data.username);
      setPasswordInput(data.password);
    } catch (err: any) {
      setError(err.message);
    }
  };



  // Update Profile Settings
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConsultant) return;
    setError(null);
    try {
      const res = await fetch(`/api/consultants/${currentConsultant.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: photoUrl,
          bio: bio,
          price_per_minute: parseFloat(pricePerMin),
        }),
      });
      if (!res.ok) throw new Error('Failed to save profile changes');
      
      setSuccess('Profile updated successfully!');
      loadConsultantStatsAndStatus(currentConsultant.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle Online/Offline State
  const handleToggleOnline = async () => {
    if (!currentConsultant) return;
    try {
      const nextOnline = !isOnline;
      const res = await fetch(`/api/consultants/${currentConsultant.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_online: nextOnline }),
      });
      if (res.ok) {
        setIsOnline(nextOnline);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Busy State
  const handleToggleBusy = async () => {
    if (!currentConsultant) return;
    try {
      const nextBusy = !isBusy;
      const res = await fetch(`/api/consultants/${currentConsultant.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_busy: nextBusy }),
      });
      if (res.ok) {
        setIsBusy(nextBusy);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy Profile URL helper
  const handleCopyProfileUrl = () => {
    if (!currentConsultant) return;
    const bookingUrl = `${window.location.origin}/u/${currentConsultant.username}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Alert states */}
      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl text-rose-800 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl text-emerald-800 text-sm">
          {success}
        </div>
      )}

      {/* 1. NO CONSULTANT LOGGED IN */}
      {!currentConsultant && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Login Form */}
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-8 border border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <Key className="w-6 h-6 text-emerald-400" />
              <div>
                <h2 className="text-xl font-bold">Consultant Login</h2>
                <p className="text-xs text-slate-400">Enter your secure credentials to manage your wallet and chats</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">Platform Username</label>
                <input
                  type="text"
                  placeholder="expert_astro_1234"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">Secure Account Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                  required
                />
              </div>

              <button
                type="submit"
                id="consultant-login-btn"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded-xl font-bold text-sm w-full transition-all flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In to Portal</span>
              </button>
            </form>

            {credentialsGenerated && (
              <div className="bg-emerald-950/80 border border-emerald-800 p-5 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <UserCheck className="w-4 h-4" />
                  <span>PLAN ACTIVATED successfully!</span>
                </div>
                <p className="text-xs text-slate-300">We have auto-filled your credentials above. Copy them securely:</p>
                <div className="bg-slate-950 p-3 rounded-xl font-mono text-xs space-y-1 text-slate-200 border border-slate-900">
                  <div><span className="text-slate-500">Username:</span> {credentialsGenerated.username}</div>
                  <div><span className="text-slate-500">Password:</span> {credentialsGenerated.password}</div>
                </div>
                <p className="text-[10px] text-amber-400">Click the "Log In to Portal" button above to access your dashboard.</p>
              </div>
            )}
          </div>

          {/* New Consultant Plan Purchase (Registration Flow) */}
          <div className="lg:col-span-7 bg-slate-900 text-white rounded-2xl p-8 border border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              <div>
                <h2 className="text-xl font-bold">New Consultant Portal Sign Up</h2>
                <p className="text-xs text-slate-400">Choose a platform subscription plan to instantly generate security credentials</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* Plan Selection Radio Grids */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-3">Select Subscription Plan</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <label
                      key={plan.id}
                      className={`border p-4 rounded-xl cursor-pointer flex flex-col justify-between transition-all ${
                        selectedPlanId === plan.id
                          ? 'border-emerald-500 bg-emerald-500/5'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={selectedPlanId === plan.id}
                        onChange={() => setSelectedPlanId(plan.id)}
                        className="sr-only"
                      />
                      <div>
                        <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider block">{plan.name}</span>
                        <p className="text-lg font-extrabold text-slate-100 mt-1">₹{plan.price}</p>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{plan.duration_days} Days Expiry</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-3 line-clamp-2">{plan.description}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">Consultant/Expert Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acharya Shashi"
                    value={registerDisplayName}
                    onChange={(e) => setRegisterDisplayName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">Consultant Email Address (for Credentials)</label>
                  <input
                    type="email"
                    placeholder="e.g. shashi@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">My Custom Call Rate (₹ / Minute)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="20"
                    value={registerPrice}
                    onChange={(e) => setRegisterPrice(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">My Professional Category</label>
                  <select
                    value={registerCategory}
                    onChange={(e: any) => setRegisterCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
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

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start space-x-2">
                <Globe className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  After successful checkout, your unique profile path <strong className="text-slate-200">/u/[username]</strong> will be activated. 
                  Users can instantly pay per minute to start a chat with you.
                </span>
              </div>

              <button
                type="submit"
                id="consultant-register-btn"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded-xl font-bold text-sm w-full transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Simulate Plan Checkout & Register</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* 2. CONSULTANT IS LOGGED IN BUT STATS ARE LOADING */}
      {currentConsultant && !wallet && (
        <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4 bg-slate-900 border border-slate-800 rounded-2xl max-w-xl mx-auto shadow-xl text-center">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <h3 className="font-bold text-slate-200">Loading Consultant Portal...</h3>
          <p className="text-xs text-slate-400 max-w-xs">Connecting securely and fetching your wallet & active sessions...</p>
          <button
            onClick={handleLogout}
            className="text-xs text-rose-400 hover:underline hover:text-rose-300 font-bold font-mono mt-4"
          >
            Reset Session / Login Again
          </button>
        </div>
      )}

      {/* 3. CONSULTANT IS LOGGED IN */}
      {currentConsultant && wallet && (
        <div className="space-y-8">
          
          {/* Portal header & public address */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <img
                src={photoUrl || currentConsultant.photo_url}
                alt={currentConsultant.display_name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm flex-shrink-0"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold">{currentConsultant.display_name}</h2>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded border border-emerald-500/20">
                    Pro Verified
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                  <span>ID: #{currentConsultant.id}</span>
                  <span>•</span>
                  <span>Plan Active until: <strong className="text-slate-200">{new Date(wallet.plan_expiry).toLocaleDateString()}</strong></span>
                </div>
              </div>
            </div>

            {/* Unique Profile Booking URL */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 max-w-sm w-full">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">My Public Booking Address</span>
              <div className="flex items-center justify-between space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 pl-3">
                <span className="text-xs font-mono text-emerald-400 truncate select-all">{`/u/${currentConsultant.username}`}</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleCopyProfileUrl}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all"
                    title="Copy Profile URL"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onNavigateToUserView(currentConsultant.username)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all"
                    title="Open Booking Page"
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 self-center"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Status Controls & Wallet Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Wallet summary */}
            <div className="lg:col-span-8 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-800 mb-6">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold">My Earnings & Wallet</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Today's Earnings</span>
                    <span className="text-xl font-extrabold text-slate-200 mt-1 block">₹{wallet.wallet_today.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Monthly Earnings</span>
                    <span className="text-xl font-extrabold text-slate-200 mt-1 block">₹{wallet.wallet_monthly.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Total Lifetime</span>
                    <span className="text-xl font-extrabold text-slate-200 mt-1 block">₹{wallet.wallet_total.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.01]">
                    <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block">Withdrawable Balance</span>
                    <span className="text-xl font-extrabold text-emerald-400 mt-1 block">₹{wallet.wallet_withdrawable.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-400 space-y-2 sm:space-y-0">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Wallet balance is updated instantly at the end of each billing chat.</span>
                </span>
                <button
                  onClick={() => loadConsultantStatsAndStatus(currentConsultant.id)}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 transition-colors self-end"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Wallet</span>
                </button>
              </div>
            </div>

            {/* Status indicators */}
            <div className="lg:col-span-4 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Flame className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold">Real-Time Availability</h3>
                </div>

                {/* Online toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-bold block">Online / Visible</span>
                    <span className="text-[10px] text-slate-500">Toggle whether clients can see you</span>
                  </div>
                  <button
                    onClick={handleToggleOnline}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isOnline ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isOnline ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Busy toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs font-bold block">Busy / Engaged</span>
                    <span className="text-[10px] text-slate-500">Toggle busy badge on booking listing</span>
                  </div>
                  <button
                    onClick={handleToggleBusy}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isBusy ? 'bg-amber-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isBusy ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="text-[11px] font-mono p-2.5 bg-slate-950/40 rounded-lg text-slate-500 border border-slate-850 text-center">
                Current Status: {isOnline ? (isBusy ? '🟠 BUSY' : '🟢 ONLINE') : '🔴 OFFLINE'}
              </div>
            </div>

          </div>

          {/* Profile Customizer & Chat History */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Edit settings */}
            <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                <Settings2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold">Edit Profile & Rates</h3>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">Display Profile Photo URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">My Call Rate per Minute (₹ INR)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="25"
                    value={pricePerMin}
                    onChange={(e) => setPricePerMin(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">Professional Bio / Specialization</label>
                  <textarea
                    placeholder="Describe your credentials, services, and Vibe..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full resize-none"
                  />
                </div>

                <button
                  type="submit"
                  id="consultant-update-profile-btn"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-2.5 rounded-xl text-xs font-bold w-full transition-all"
                >
                  Save Profile Settings
                </button>
              </form>
            </div>

            {/* Chat Sessions Audit list */}
            <div className="lg:col-span-7 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold">Consultation Chat History</h3>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">No bookings found for your profile.</div>
                ) : (
                  sessions.map((sess) => {
                    const isUserBlocked = blockedUsers.some(b => b.user_name.toLowerCase() === sess.user_name.toLowerCase());
                    return (
                      <div
                        key={sess.id}
                        className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-slate-200">{sess.user_name}</span>
                            <span className="text-[10px] font-mono text-slate-500">ID: {sess.id}</span>
                            {isUserBlocked && (
                              <span className="bg-rose-500/15 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                Blocked
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono">
                            Duration: {sess.duration_minutes} Mins • Rate: ₹{sess.price_per_minute}/min
                          </p>
                          <div className="text-[11px] text-emerald-400 font-mono">
                            Your Net Earnings: <strong>₹{sess.consultant_earnings.toFixed(2)}</strong> (after platform commission)
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono block">
                            Date: {new Date(sess.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          {sess.status === 'completed' && (
                            <div className="flex flex-col items-end space-y-1">
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">Completed</span>
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
                                className="text-[10px] text-emerald-400 hover:underline hover:text-emerald-300 font-bold transition-all"
                              >
                                View Transcript
                              </button>
                            </div>
                          )}
                          {sess.status === 'active' && (
                            <div className="flex flex-col items-end space-y-1">
                              <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">Live Now</span>
                              <button
                                onClick={() => {
                                  if (currentConsultant) {
                                    onSelectSession(sess.id, currentConsultant.display_name, 'consultant');
                                  }
                                }}
                                className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[10px] px-2 py-1 rounded transition-colors"
                              >
                                Resume Chat
                              </button>
                            </div>
                          )}
                          {sess.status === 'rejected' && (
                            <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold">Rejected</span>
                          )}
                          {sess.status === 'missed' && (
                            <span className="bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">Missed by Consultant</span>
                          )}
                          {sess.status === 'pending' && (
                            <div className="flex flex-col items-end space-y-1.5 p-2 bg-amber-500/5 rounded-xl border border-amber-500/10">
                              <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                                Incoming Chat Request
                              </span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/sessions/${sess.id}/accept`, { method: 'POST' });
                                      if (res.ok) {
                                        loadConsultantStatsAndStatus(currentConsultant.id);
                                        onSelectSession(sess.id, currentConsultant.display_name, 'consultant');
                                      } else {
                                        const data = await res.json();
                                        alert(data.error || 'Failed to accept request');
                                      }
                                    } catch (err) {
                                      console.error('Accept error:', err);
                                    }
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/sessions/${sess.id}/reject`, { method: 'POST' });
                                      if (res.ok) {
                                        loadConsultantStatsAndStatus(currentConsultant.id);
                                      } else {
                                        const data = await res.json();
                                        alert(data.error || 'Failed to reject request');
                                      }
                                    } catch (err) {
                                      console.error('Reject error:', err);
                                    }
                                  }}
                                  className="bg-rose-500/20 hover:bg-rose-500/35 text-rose-400 border border-rose-500/20 font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}

                          {sess.status === 'active' ? (
                            <button
                              onClick={() => onSelectSession(sess.id, currentConsultant.display_name, 'consultant')}
                              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                            >
                              Join Chat Room
                            </button>
                          ) : (
                            sess.transcript && (
                              <details className="text-right">
                                <summary className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer outline-none">
                                  View Transcript
                                </summary>
                                <pre className="text-left bg-slate-900 border border-slate-800 p-3 rounded-lg text-[10px] font-mono text-slate-400 mt-2 whitespace-pre-wrap max-w-xs max-h-[120px] overflow-y-auto">
                                  {sess.transcript}
                                </pre>
                              </details>
                            )
                          )}

                          {/* Block/Unblock Button inside History */}
                          {isUserBlocked ? (
                            <button
                              onClick={() => handleUnblockUser(sess.user_name)}
                              className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded px-2.5 py-1 font-bold transition-all w-full text-center"
                            >
                              Unblock User
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlockUser(sess.user_name)}
                              className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded px-2.5 py-1 font-bold transition-all w-full text-center"
                            >
                              Block User
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Blocked Clients List Card */}
            <div className="lg:col-span-7 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-slate-200">Blocked Clients List</h3>
              </div>
              
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono">No clients are currently blocked by you.</div>
                ) : (
                  blockedUsers.map((b) => (
                    <div key={b.id} className="bg-slate-950 border border-slate-800/80 px-4 py-2.5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-300">{b.user_name}</span>
                        <p className="text-[9px] text-slate-500 font-mono">Blocked on: {new Date(b.created_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(b.user_name)}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 rounded text-[10px] px-2.5 py-1 font-bold transition-all"
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Transcript modal overlay for consultants */}
      {viewingPastSessionMessages && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Consultation Transcript Record</h3>
                <p className="text-[10px] text-slate-400">Secure record for Client: {viewingPastSessionInfo?.user_name}</p>
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

            <div className="p-4 overflow-y-auto flex-1 space-y-3.5 bg-slate-950">
              {viewingPastSessionMessages.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-12">No messages logs found for this consultation.</p>
              ) : (
                viewingPastSessionMessages.map((msg: any) => {
                  const isMe = msg.sender_type === 'consultant';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-xs rounded-xl p-2.5 text-xs ${
                        isMe ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-slate-900 text-white rounded-tl-none border border-slate-800'
                      }`}>
                        <span className="block text-[9px] text-slate-400 font-mono mb-0.5">{msg.sender_name}</span>
                        <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-slate-600 font-mono mt-0.5 px-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
