import React, { useState, useEffect } from 'react';
import { Star, ShieldAlert, Sparkles, Clock, MessageCircle, ArrowLeft, Send, CheckCircle, HelpCircle, User, Calendar, DollarSign, AlertTriangle, Edit3, Camera, X } from 'lucide-react';
import { Consultant, Review } from '../types';

interface ConsultantProfileProps {
  onSelectSession: (sessionId: string, username: string, role: 'user' | 'consultant') => void;
  targetUsername?: string; // If navigated from Consultant Panel profile URL
  currentUser: any;
  setCurrentUser: (user: any) => void;
  onOpenAuth: () => void;
}

export function ConsultantProfile({ onSelectSession, targetUsername, currentUser, setCurrentUser, onOpenAuth }: ConsultantProfileProps) {
  // Directory or profile selection
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Active selection states
  const [selectedMinutes, setSelectedMinutes] = useState<number>(10); // Default 10 mins

  // Review Form States
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewText, setNewReviewText] = useState('');

  // Payment checkout overlay states
  const [checkoutOrder, setCheckoutOrder] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Common UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User profile editor fields
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [profileSaving, setProfileSaving] = useState(false);

  // Quick recharge fields
  const [rechargeAmount, setRechargeAmount] = useState('250');
  const [rechargeLoading, setRechargeLoading] = useState(false);

  // Recharge modal visibility state
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // User past chat history states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearchName, setHistorySearchName] = useState('');
  const [userPastSessions, setUserPastSessions] = useState<any[]>([]);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [viewingPastSessionMessages, setViewingPastSessionMessages] = useState<any[] | null>(null);
  const [viewingPastSessionInfo, setViewingPastSessionInfo] = useState<any | null>(null);

  // Client tabs navigation state
  const [activeDashboardTab, setActiveDashboardTab] = useState<'advisors' | 'profile' | 'wallet' | 'history'>('advisors');
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Fetch Wallet Transaction Log
  const fetchWalletTransactions = async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingTransactions(true);
      const res = await fetch(`/api/user/wallet-transactions/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWalletTransactions(data.transactions);
        }
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Sync profile details to editor fields when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setEditDisplayName(currentUser.display_name || '');
      setEditPhotoUrl(currentUser.photo_url || '');
      setEditDob(currentUser.dob || '');
      setEditGender(currentUser.gender || 'Male');
      fetchWalletTransactions();
    }
  }, [currentUser]);

  // Load past consultations from localStorage on mount or modal open
  const loadPastHistoryFromLocalStorage = async () => {
    try {
      const savedIdsStr = localStorage.getItem('my_consultation_sessions');
      if (savedIdsStr) {
        const ids = JSON.parse(savedIdsStr);
        if (ids && ids.length > 0) {
          const res = await fetch(`/api/user/sessions?ids=${ids.join(',')}`);
          if (res.ok) {
            const data = await res.json();
            setUserPastSessions(data);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching localStorage sessions list:', err);
    }
  };

  // Fetch registered consultants directory
  const fetchConsultants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/consultants');
      if (!res.ok) throw new Error('Failed to load expert advisors list');
      const data = await res.json();
      setConsultants(data);

      // Handle deep links if specified
      if (targetUsername) {
        const matched = data.find((c: Consultant) => c.username.toLowerCase() === targetUsername.toLowerCase());
        if (matched) {
          fetchFullProfile(matched);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultants();
  }, [targetUsername]);

  // Load reviews and stats for the selected consultant
  const fetchFullProfile = async (cons: Consultant) => {
    try {
      setSelectedConsultant(cons);
      const revsRes = await fetch(`/api/consultants/${cons.id}/reviews`);
      if (revsRes.ok) {
        const revsData = await revsRes.json();
        setReviews(revsData);
      }
    } catch (err) {
      console.error('Error loading consultant reviews:', err);
    }
  };

  // Save User Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          display_name: editDisplayName,
          photo_url: editPhotoUrl,
          dob: editDob,
          gender: editGender
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      
      setCurrentUser(data.user);
      setSuccess('Aapka profile successfully update ho gaya hai!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Fast Wallet Recharge
  const handleQuickRecharge = async (amountToRecharge: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setRechargeLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/user/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          amount: amountToRecharge
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to recharge wallet');

      setCurrentUser(data.user);
      fetchWalletTransactions();
      setSuccess(`Congratulations! ₹${amountToRecharge} successfully added to your wallet.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRechargeLoading(false);
    }
  };

  // Submit client feedback review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultant) return;
    const authorName = currentUser ? currentUser.display_name : newReviewName.trim();
    if (!authorName) {
      setError('Please specify your name for the review.');
      return;
    }
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/consultants/${selectedConsultant.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: authorName,
          rating: newReviewRating,
          text: newReviewText,
        }),
      });

      if (!res.ok) throw new Error('Failed to post review');

      setNewReviewText('');
      setSuccess('Thank you for your valuable consultation review!');
      fetchFullProfile(selectedConsultant);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Step 1: Create Order and Verify with Wallet instantly
  const handleInitiateWalletPayment = async () => {
    if (!selectedConsultant) return;
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const packagePrice = selectedMinutes * selectedConsultant.price_per_minute;
    if (currentUser.wallet_balance < packagePrice) {
      setError(`Aapke wallet me ₹${packagePrice} nahi hai. Chat suru karne ke liye kripya recharge karein.`);
      return;
    }

    setError(null);
    setIsProcessingPayment(true);

    try {
      // Create initial session order record
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultant_id: selectedConsultant.id,
          duration_minutes: selectedMinutes,
          user_name: currentUser.display_name,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to initialize session order');

      // Verify and deduct instantly using internal wallet balance
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultant_id: selectedConsultant.id,
          duration_minutes: selectedMinutes,
          user_name: currentUser.display_name,
          order_id: orderData.order_id,
          payment_id: `wallet_tx_${Math.random().toString(36).slice(2, 10)}`,
          is_mock: true,
          user_id: currentUser.id,
          payment_method: 'wallet'
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Wallet transaction failed');

      setSuccess('Wallet Payment Succeeded! Connecting you to the Expert Consultation room...');
      
      // Save local history reference
      try {
        const existing = localStorage.getItem('my_consultation_sessions');
        const idList = existing ? JSON.parse(existing) : [];
        if (!idList.includes(verifyData.session_id)) {
          idList.push(verifyData.session_id);
          localStorage.setItem('my_consultation_sessions', JSON.stringify(idList));
        }
      } catch (e) {
        console.error(e);
      }

      setTimeout(() => {
        setSuccess(null);
        setIsProcessingPayment(false);
        onSelectSession(verifyData.session_id, currentUser.display_name, 'user');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
      setIsProcessingPayment(false);
    }
  };

  if (loading && consultants.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 text-slate-100">
      
      {/* Upper bar with User Profile and History Button */}
      {!targetUsername && (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span>Expert Consultation Hub</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Premium minute-billed live consultations with top-tier specialists</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-slate-950 px-3 py-2.5 rounded-xl text-emerald-400 border border-slate-800 font-bold">
                  Wallet Balance: ₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}
                </span>
                <button
                  onClick={() => {
                    if (selectedConsultant) {
                      setShowRechargeModal(true);
                    } else {
                      setActiveDashboardTab('wallet');
                      fetchWalletTransactions();
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl transition-all flex items-center space-x-1 border border-emerald-400/20 shadow-sm"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Recharge Page</span>
                </button>
              </div>
            )}
            <button
              onClick={() => {
                if (selectedConsultant) {
                  setShowHistoryModal(true);
                  loadPastHistoryFromLocalStorage();
                } else {
                  setActiveDashboardTab('history');
                  loadPastHistoryFromLocalStorage();
                }
              }}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 border border-slate-700/60 shadow-sm"
            >
              <span>📜 View My Chat History</span>
            </button>
          </div>
        </div>
      )}

      {/* Direct link banner */}
      {targetUsername && selectedConsultant && (
        <div className="bg-slate-900 border border-emerald-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="space-y-1.5 text-center md:text-left">
            <span className="inline-flex items-center text-[10px] bg-emerald-500/10 text-emerald-400 font-black px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider animate-pulse">
              ✨ Direct Connection Live
            </span>
            <h2 className="text-xl font-black text-slate-100">Bespoke Expert Consultation</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Aap directly <strong>{selectedConsultant.display_name}</strong> ke personal consultation profile page par hain.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {currentUser && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-slate-950 px-3 py-2.5 rounded-xl text-emerald-400 border border-slate-800 font-bold">
                  Wallet Balance: ₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}
                </span>
                <button
                  onClick={() => setShowRechargeModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl transition-all flex items-center space-x-1 border border-emerald-400/20"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Recharge Page</span>
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setShowHistoryModal(true);
                loadPastHistoryFromLocalStorage();
              }}
              className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-all border border-slate-700/60"
            >
              My Past Chats History
            </button>
          </div>
        </div>
      )}

      {/* Alert feeds */}
      {error && (
        <div className="bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded-r-xl text-rose-200 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-r-xl text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* 🟢 CUSTOM USER DASHBOARD TAB SELECTOR */}
      {currentUser && !selectedConsultant && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveDashboardTab('advisors')}
            className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all ${
              activeDashboardTab === 'advisors'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>🔍 Browse Advisors</span>
          </button>
          
          <button
            id="user-profile-tab"
            onClick={() => setActiveDashboardTab('profile')}
            className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all ${
              activeDashboardTab === 'profile'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>👤 My Profile Details</span>
          </button>

          <button
            id="wallet-recharge-tab"
            onClick={() => {
              setActiveDashboardTab('wallet');
              fetchWalletTransactions();
            }}
            className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all ${
              activeDashboardTab === 'wallet'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>💳 Wallet Recharge & Ledger</span>
          </button>

          <button
            id="chat-history-tab"
            onClick={() => {
              setActiveDashboardTab('history');
              loadPastHistoryFromLocalStorage();
            }}
            className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all ${
              activeDashboardTab === 'history'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/10'
                : 'text-slate-400 hover:text-white bg-slate-900/40 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>📜 Past Consultation Chats</span>
          </button>
        </div>
      )}

      {/* TAB CONTENTS */}
      {currentUser && !selectedConsultant && activeDashboardTab === 'profile' && (
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-850">
              <Edit3 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-200">My Consultation Profile Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-left">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Gender</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Profile Photo URL</label>
                <div className="relative">
                  <Camera className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Profile photos presets bar */}
            <div className="space-y-1.5 text-left">
              <span className="text-[9px] font-mono text-slate-500 block uppercase">Quick Avatar Presets</span>
              <div className="flex space-x-2">
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditPhotoUrl(preset)}
                    className={`rounded-lg overflow-hidden border-2 transition-all ${editPhotoUrl === preset ? 'border-emerald-500 scale-105' : 'border-transparent hover:scale-105'}`}
                  >
                    <img src={preset} alt="" className="w-8 h-8 object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="text-left">
              <button
                type="submit"
                disabled={profileSaving}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold py-2 px-5 rounded-xl text-xs transition-all flex items-center space-x-1"
              >
                <span>{profileSaving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {currentUser && !selectedConsultant && activeDashboardTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80">
          {/* Left panel: Wallet Recharge */}
          <div className="lg:col-span-5 bg-slate-950/60 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm text-slate-200">Recharge Page</h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Recharge wallet money safely. Deduct strictly on exact speaking minutes when talking to consultants.
              </p>
            </div>

            <div className="space-y-4">
              {/* Current Wallet Balance Display */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-left">
                <div>
                  <span className="text-slate-500 block font-mono text-[9px] uppercase">Wallet Balance</span>
                  <strong className="text-emerald-400 text-base font-mono font-bold">₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}</strong>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                  <span>Lifetime Recharges:</span>
                  <span className="block text-slate-300 font-bold">₹{parseFloat(currentUser.lifetime_recharge || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Select Preset Amount</span>
                <div className="grid grid-cols-4 gap-2">
                  {['100', '250', '500', '1000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      className={`py-2 px-1 text-xs rounded-xl border text-center font-bold transition-all ${
                        rechargeAmount === amt
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="flex space-x-2 text-left">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="Enter Custom Amount"
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-3 py-2 text-xs text-slate-100 focus:outline-none w-full font-mono font-bold text-emerald-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickRecharge(rechargeAmount)}
                  disabled={rechargeLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-black px-4 rounded-xl text-xs transition-all shrink-0"
                >
                  {rechargeLoading ? 'Adding...' : 'Recharge Wallet'}
                </button>
              </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850/60 text-[10px] text-slate-400 font-mono text-left">
              ⚡ Lifetime Recharges Done: ₹{parseFloat(currentUser.lifetime_recharge || 0).toFixed(2)}
            </div>
          </div>

          {/* Right panel: Wallet Transaction Ledger */}
          <div className="lg:col-span-7 bg-slate-950/40 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-slate-200 flex items-center space-x-2 border-b border-slate-850 pb-2 text-left">
              <span>💳 Wallet Transaction History (Ledger)</span>
            </h4>
            {loadingTransactions ? (
              <div className="text-center py-12 text-xs text-slate-500">Loading transaction history...</div>
            ) : walletTransactions.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-500 bg-slate-900/20 border border-slate-850 rounded-xl">
                No wallet transactions logged yet.<br />All recharges, consultation debits, and refunds will be listed here.
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[320px] pr-1 space-y-2">
                {walletTransactions.map((tx) => (
                  <div key={tx.id} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between hover:border-slate-800 transition-colors">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          tx.type === 'recharge' ? 'text-emerald-400 bg-emerald-500/10' :
                          tx.type === 'refund' ? 'text-blue-400 bg-blue-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {tx.type.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">#{tx.id}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans">{tx.description}</p>
                      <span className="text-[9px] text-slate-500 font-mono block">{new Date(tx.created_at).toLocaleString()}</span>
                    </div>
                    <div className={`font-mono text-xs font-bold shrink-0 pl-3 ${
                      tx.type === 'consultation' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {tx.type === 'consultation' ? '-' : '+'}₹{parseFloat(tx.amount || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentUser && !selectedConsultant && activeDashboardTab === 'history' && (
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 space-y-6">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-850">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-200">Past Consultation History & Chat Logs</h3>
          </div>

          {!viewingPastSessionMessages ? (
            <div className="space-y-6">
              {/* Search query block */}
              <div className="space-y-2 max-w-xl text-left">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Search Device Consultation Logs</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter display/screen name to search past history..."
                    value={historySearchName}
                    onChange={(e) => setHistorySearchName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                  />
                  <button
                    onClick={async () => {
                      if (!historySearchName.trim()) return;
                      setIsSearchingHistory(true);
                      try {
                        const res = await fetch(`/api/user/sessions?user_name=${encodeURIComponent(historySearchName.trim())}`);
                        if (res.ok) {
                          const data = await res.json();
                          setUserPastSessions(data);
                        }
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsSearchingHistory(false);
                      }
                    }}
                    disabled={isSearchingHistory}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold px-4 rounded-xl transition-all flex items-center justify-center min-w-[80px]"
                  >
                    {isSearchingHistory ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* List of sessions */}
              <div className="space-y-3 text-left">
                <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Consultation log sessions ({userPastSessions.length})</span>
                {userPastSessions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-16 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60 font-sans leading-relaxed">
                    No past consultations logged on this device yet.<br />Use search above with your screen name to fetch history.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userPastSessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between hover:border-slate-750 transition-colors text-left"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-200">{sess.consultant_name}</span>
                            <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">ID: {sess.id}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-sans">
                            Date: {new Date(sess.created_at).toLocaleString()} • Status: <span className="capitalize text-slate-300 font-semibold">{sess.status}</span>
                          </p>
                          <span className="block text-[10px] text-slate-400 font-mono mt-1">Paid: ₹{parseFloat(sess.total_paid || 0).toFixed(2)} ({sess.duration_minutes} mins)</span>
                        </div>
                        
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
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors border border-emerald-500/15 shrink-0"
                        >
                          View Chat
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Past Chat Messages details View */
            <div className="space-y-4 max-w-2xl text-left">
              <button
                onClick={() => {
                  setViewingPastSessionMessages(null);
                  setViewingPastSessionInfo(null);
                }}
                className="text-slate-400 hover:text-white text-xs flex items-center space-x-1.5 font-mono mb-2 transition-colors"
              >
                <span>← Back to list</span>
              </button>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 text-xs text-left">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Consultation with</span>
                <strong className="text-sm text-slate-100">{viewingPastSessionInfo?.consultant_name || 'Expert Advisor'}</strong>
                <span className="block text-[10px] text-slate-400 font-mono mt-0.5">Date: {new Date(viewingPastSessionInfo?.created_at).toLocaleString()}</span>
              </div>

              <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-3.5 h-[350px] overflow-y-auto">
                {viewingPastSessionMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-12">No chat messages were sent in this session.</p>
                ) : (
                  viewingPastSessionMessages.map((msg: any) => {
                    const isMe = msg.sender_type === 'user';
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
          )}
        </div>
      )}

      {/* User History lookup and Transcript Modal popup */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="p-2.5 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 flex items-center justify-center">📜</span>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">My Consultation History</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Past chats and secure transcript records</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setViewingPastSessionMessages(null);
                  setViewingPastSessionInfo(null);
                }}
                className="text-slate-400 hover:text-white bg-slate-950/40 p-2 border border-slate-800 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              
              {!viewingPastSessionMessages ? (
                <>
                  {/* Search query block */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Search Device Consultation Logs</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter display/screen name to search past history..."
                        value={historySearchName}
                        onChange={(e) => setHistorySearchName(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                      />
                      <button
                        onClick={async () => {
                          if (!historySearchName.trim()) return;
                          setIsSearchingHistory(true);
                          try {
                            const res = await fetch(`/api/user/sessions?user_name=${encodeURIComponent(historySearchName.trim())}`);
                            if (res.ok) {
                              const data = await res.json();
                              setUserPastSessions(data);
                            }
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setIsSearchingHistory(false);
                          }
                        }}
                        disabled={isSearchingHistory}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold px-4 rounded-xl transition-all flex items-center justify-center min-w-[80px]"
                      >
                        {isSearchingHistory ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>

                  {/* List of sessions */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Consultation log sessions ({userPastSessions.length})</span>
                    {userPastSessions.length === 0 ? (
                      <p className="text-xs text-slate-500 py-12 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60 font-sans leading-relaxed">
                        No past consultations logged on this device yet.<br />Use search above with your screen name to fetch history.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {userPastSessions.map((sess) => (
                          <div
                            key={sess.id}
                            className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between hover:border-slate-750 transition-colors"
                          >
                            <div className="space-y-1 text-left">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-200">{sess.consultant_name}</span>
                                <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">ID: {sess.id}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-sans">
                                Date: {new Date(sess.created_at).toLocaleString()} • Status: <span className="capitalize text-slate-300 font-semibold">{sess.status}</span>
                              </p>
                            </div>
                            
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
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors border border-emerald-500/15"
                            >
                              View Chat
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Past Chat Messages details View */
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setViewingPastSessionMessages(null);
                      setViewingPastSessionInfo(null);
                    }}
                    className="text-slate-400 hover:text-white text-xs flex items-center space-x-1.5 font-mono mb-2 transition-colors"
                  >
                    <span>← Back to list</span>
                  </button>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 text-xs text-left">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Consultation with</span>
                    <strong className="text-sm text-slate-100">{viewingPastSessionInfo?.consultant_name || 'Expert Advisor'}</strong>
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">Date: {new Date(viewingPastSessionInfo?.created_at).toLocaleString()}</span>
                  </div>

                  <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-xl space-y-3.5 h-[280px] overflow-y-auto">
                    {viewingPastSessionMessages.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-12">No chat messages were sent in this session.</p>
                    ) : (
                      viewingPastSessionMessages.map((msg: any) => {
                        const isMe = msg.sender_type === 'user';
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wallet Recharge Page Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">Recharge Page</h3>
              </div>
              <button
                onClick={() => {
                  setShowRechargeModal(false);
                }}
                className="text-slate-400 hover:text-white bg-slate-950/40 p-2 border border-slate-800 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-5 space-y-5">
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Recharge wallet money safely. Deduct strictly on exact speaking minutes when talking to consultants.
              </p>

              {currentUser ? (
                <div className="space-y-4">
                  {/* Current Balance Display */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block font-mono text-[10px] uppercase">Your Current Balance</span>
                      <strong className="text-emerald-400 text-lg font-mono font-bold">₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}</strong>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-mono">
                      <span>Lifetime Recharges:</span>
                      <span className="block text-slate-300">₹{parseFloat(currentUser.lifetime_recharge || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Select Amount preset</span>
                    <div className="grid grid-cols-4 gap-2">
                      {['100', '250', '500', '1000'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setRechargeAmount(amt)}
                          className={`py-2 px-1 text-xs rounded-xl border text-center font-bold transition-all ${
                            rechargeAmount === amt
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                              : 'border-slate-850 bg-slate-950/40 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Input */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Or Custom Amount (₹)</label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-500 font-bold font-black text-emerald-400">₹</span>
                        <input
                          type="number"
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          placeholder="Enter Custom Amount"
                          className="bg-slate-950 border border-slate-800 rounded-xl pl-6 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none w-full font-mono font-bold text-emerald-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleQuickRecharge(rechargeAmount);
                          setTimeout(() => {
                            setShowRechargeModal(false);
                          }, 1500);
                        }}
                        disabled={rechargeLoading || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
                        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-black px-4 rounded-xl text-xs transition-all shrink-0"
                      >
                        {rechargeLoading ? 'Adding...' : 'Recharge Wallet'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-6 rounded-xl border border-slate-850 text-center space-y-3">
                  <p className="text-xs text-slate-400">Please sign up or login to your account to recharge your wallet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRechargeModal(false);
                      onOpenAuth();
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                  >
                    Login / Sign Up
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 1. SHOW PUBLIC DIRECTORY OF CONSULTANTS */}
      {!selectedConsultant && (!currentUser || activeDashboardTab === 'advisors') && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Meet Professional Advisors</h2>
            <p className="text-sm text-slate-400">
              Browse top-tier specialists and start live chats instantly. Funded per minute speaking time.
            </p>
          </div>

          {/* Category selection tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['All', 'Astrologers', 'Influencers', 'Coaches', 'Consultants', 'Lawyers', 'Mentors'].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                  selectedCategory === category
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {consultants.filter(c => selectedCategory === 'All' || (c as any).category === selectedCategory).length === 0 ? (
              <div className="col-span-3 text-center py-16 text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                No active advisors found in "{selectedCategory}" category at the moment.
              </div>
            ) : (
              consultants.filter(c => selectedCategory === 'All' || (c as any).category === selectedCategory).map((cons) => (
                <div
                  key={cons.id}
                  className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start space-x-4 text-left">
                      {cons.photo_url ? (
                        <img
                          src={cons.photo_url}
                          alt={cons.display_name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-800 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-850 flex items-center justify-center border border-slate-800 text-slate-400 font-bold shrink-0">
                          {cons.display_name.slice(0, 1)}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-lg text-slate-100">{cons.display_name}</h3>
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full">
                            {(cons as any).category || 'Consultants'}
                          </span>
                          {cons.is_online === 1 ? (
                            cons.is_busy === 1 ? (
                              <span className="inline-flex items-center text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                🟢 Busy
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                🟢 Online
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center text-[10px] bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                              🔴 Offline
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed text-left">
                      {cons.bio}
                    </p>
                  </div>

                  <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">Rate</span>
                      <strong className="text-sm font-bold text-emerald-400">₹{cons.price_per_minute}/min</strong>
                    </div>

                    <button
                      id={`consult-btn-${cons.username}`}
                      onClick={() => fetchFullProfile(cons)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Start Chat</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. SHOW SPECIFIC SELECTED PROFILE BOOKING PAGE */}
      {selectedConsultant && (
        <div className="space-y-8">
          
          {/* Back button */}
          {!targetUsername && (
            <button
              onClick={() => {
                setSelectedConsultant(null);
                setReviews([]);
              }}
              className="text-slate-400 hover:text-white flex items-center space-x-1 text-sm font-mono transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Consultant directory</span>
            </button>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
            
            {/* Consultant Profile Metadata */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    {selectedConsultant.photo_url ? (
                      <img
                        src={selectedConsultant.photo_url}
                        alt={selectedConsultant.display_name}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 text-slate-400 font-bold flex items-center justify-center">
                        {selectedConsultant.display_name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight text-slate-100">{selectedConsultant.display_name}</h2>
                      <div className="text-xs text-slate-500 font-mono mt-1">Username: @{selectedConsultant.username}</div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Consultation Fee</span>
                    <strong className="text-xl font-black text-emerald-400 font-mono">₹{selectedConsultant.price_per_minute}/min</strong>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-850/60">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1.5">Expertise & Biography</span>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedConsultant.bio}</p>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400">Status Indicator</span>
                  {selectedConsultant.is_online === 1 ? (
                    selectedConsultant.is_busy === 1 ? (
                      <span className="text-amber-400 font-bold animate-pulse">🟠 Busy (In active consultation)</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">🟢 Online (Ready to join)</span>
                    )
                  ) : (
                    <span className="text-slate-500 font-bold">🔴 Offline</span>
                  )}
                </div>
              </div>

              {/* Reviews section */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Recent Clients Reviews</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Feedbacks and rating logs</p>
                </div>

                <div className="divide-y divide-slate-800/80 space-y-4 max-h-[250px] overflow-y-auto pr-1">
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-sans">No reviews found yet. Be the first to consult!</div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="pt-4 first:pt-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-sm text-slate-200">{rev.user_name}</strong>
                          <div className="flex items-center text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{rev.text}</p>
                        <span className="text-[10px] text-slate-600 block font-mono">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Review submission form */}
                <form onSubmit={handleSubmitReview} className="pt-4 border-t border-slate-800 space-y-4">
                  <span className="block text-xs font-bold text-slate-300">Submit a New Review</span>
                  <div className="grid grid-cols-2 gap-4">
                    {!currentUser && (
                      <div className="col-span-2">
                        <label className="block text-[11px] text-slate-500 mb-1 font-mono">My Name</label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={newReviewName}
                          onChange={(e) => setNewReviewName(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                          required
                        />
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-1 font-mono">Rating Score</label>
                      <select
                        value={newReviewRating}
                        onChange={(e) => setNewReviewRating(parseInt(e.target.value))}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ (5 Star)</option>
                        <option value="4">⭐⭐⭐⭐ (4 Star)</option>
                        <option value="3">⭐⭐⭐ (3 Star)</option>
                        <option value="2">⭐⭐ (2 Star)</option>
                        <option value="1">⭐ (1 Star)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-1 font-mono">My Review Message</label>
                      <textarea
                        placeholder="Share your consultation experience..."
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        rows={2}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full resize-none"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-100 py-1.5 px-4 rounded-xl text-xs font-bold transition-all"
                  >
                    Submit Review Log
                  </button>
                </form>

              </div>

            </div>

            {/* Chat Booking Packages Flow */}
            <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold">Book Chat Duration Package</h3>
              </div>

              <div className="space-y-4">
                
                {/* Package minute selector block */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono text-slate-400">Select consultation duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[5, 10, 15, 30].map((mins) => {
                      const totalInr = mins * selectedConsultant.price_per_minute;
                      return (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setSelectedMinutes(mins)}
                          className={`p-3 border text-left transition-all rounded-xl ${
                            selectedMinutes === mins
                              ? 'border-emerald-500 bg-emerald-500/5'
                              : 'border-slate-800 bg-slate-950/40 hover:border-slate-750'
                          }`}
                        >
                          <span className="text-[9px] font-mono text-slate-500 block uppercase">Package</span>
                          <span className="text-sm font-extrabold text-slate-200 mt-1 block font-sans">{mins} Minutes</span>
                          <span className="text-xs font-bold text-emerald-400 block mt-1">₹{totalInr} INR</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Billing Summary calculation panel */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block border-b border-slate-900 pb-1.5">Billing Calculation</span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expertise Tariff:</span>
                    <span className="text-slate-200">₹{selectedConsultant.price_per_minute}/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Selected Minutes:</span>
                    <span className="text-slate-200 font-mono">{selectedMinutes} mins</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-900 font-bold">
                    <span className="text-slate-300">Total Payable Amount:</span>
                    <span className="text-emerald-400">₹{selectedMinutes * selectedConsultant.price_per_minute} INR</span>
                  </div>
                </div>

                {/* Login state gated button */}
                {!currentUser ? (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3.5 rounded-xl text-xs font-black w-full transition-all flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <span>🔒 Start Chat (Please Sign Up / Login first)</span>
                  </button>
                ) : (
                  <>
                    {/* Logged in User Wallet status */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block">Your Current Balance:</span>
                        <strong className="text-emerald-400 text-sm font-mono">₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}</strong>
                      </div>
                      
                      {currentUser.wallet_balance < (selectedMinutes * selectedConsultant.price_per_minute) && (
                        <div className="text-rose-400 text-[10px] font-bold text-right flex flex-col">
                          <span>Insufficient Balance!</span>
                          <span className="text-slate-500">Need ₹{(selectedMinutes * selectedConsultant.price_per_minute) - currentUser.wallet_balance} more</span>
                        </div>
                      )}
                    </div>

                    {/* Pay with Wallet action button */}
                    <button
                      type="button"
                      onClick={handleInitiateWalletPayment}
                      disabled={isProcessingPayment || currentUser.wallet_balance < (selectedMinutes * selectedConsultant.price_per_minute)}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 py-3.5 rounded-xl text-xs font-black w-full transition-all flex items-center justify-center space-x-2 shadow-sm"
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-950" />
                          <span>Initiating consultation session...</span>
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-4 h-4" />
                          <span>Start Chat (Pay ₹{selectedMinutes * selectedConsultant.price_per_minute} with Wallet)</span>
                        </>
                      )}
                    </button>

                    {/* Wallet Insufficient Warning quick link */}
                    {currentUser.wallet_balance < (selectedMinutes * selectedConsultant.price_per_minute) && (
                      <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/10 text-[10px] text-rose-300 flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p>
                            Aapke wallet me chat booking ke liye paryapt balance nahi hai. Kripya niche click karke Recharge Page se recharge karein.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowRechargeModal(true);
                            }}
                            className="text-emerald-400 hover:underline font-bold text-xs flex items-center space-x-1"
                          >
                            <span>Recharge Page</span>
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
