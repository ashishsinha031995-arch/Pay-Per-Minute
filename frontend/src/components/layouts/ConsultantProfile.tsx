import React, { useState, useEffect } from 'react';
import { Star, ShieldAlert, Sparkles, Clock, MessageCircle, ArrowLeft, Send, CheckCircle, HelpCircle, User, Calendar, DollarSign, AlertTriangle, Edit3, Camera, X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Consultant, Review } from '../../types';
import { downloadInvoice } from '../../utils/invoiceHelper';

const formatToLocalDateString = (dateStr: any) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

interface ConsultantProfileProps {
  onSelectSession: (sessionId: string, username: string, role: 'user' | 'consultant') => void;
  targetUsername?: string; // If navigated from Consultant Panel profile URL
  currentUser: any;
  setCurrentUser: (user: any) => void;
  onOpenAuth: () => void;
  activeSessionId?: string;
}

export function ConsultantProfile({ onSelectSession, targetUsername, currentUser, setCurrentUser, onOpenAuth, activeSessionId }: ConsultantProfileProps) {
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
  const [editLocation, setEditLocation] = useState('');
  const [editLanguages, setEditLanguages] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // 3D Perspective Tilt and Hamburger states
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [heroSettings, setHeroSettings] = useState<any>(null);

  useEffect(() => {
    const fetchHeroSettings = async () => {
      try {
        const res = await fetch('/api/settings/hero');
        if (res.ok) {
          const data = await res.json();
          setHeroSettings(data);
        }
      } catch (err) {
        console.error('Failed to load hero configurations:', err);
      }
    };
    fetchHeroSettings();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size bahot badi hai. Kripya 5MB se choti image upload karein.');
      return;
    }

    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const res = await fetch('/api/user/upload-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64String })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
          
          setEditPhotoUrl(data.photo_url);
          setSuccess('Photo successfully upload ho gayi hai!');
          setTimeout(() => setSuccess(null), 3000);
        } catch (uploadErr: any) {
          setError(uploadErr.message);
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.onerror = () => {
        setError('File read karne me error aaya.');
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message);
      setUploadingPhoto(false);
    }
  };

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
  const [activeDashboardTab, setActiveDashboardTab] = useState<'advisors' | 'profile' | 'wallet' | 'history' | 'support'>('advisors');
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Support ticket states
  const [userTickets, setUserTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [userReplyDrafts, setUserReplyDrafts] = useState<{[ticketId: number]: string}>({});

  const fetchUserTickets = async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingTickets(true);
      const res = await fetch(`/api/tickets?sender_type=user&sender_id=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUserTickets(data.tickets);
        }
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleUserReplySubmit = async (e: React.FormEvent, ticketId: number) => {
    e.preventDefault();
    const replyText = userReplyDrafts[ticketId] || '';
    if (!replyText.trim()) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'user',
          sender_id: currentUser?.id,
          sender_name: currentUser?.display_name || currentUser?.username || 'User',
          message: replyText
        })
      });

      if (res.ok) {
        setUserReplyDrafts(prev => ({ ...prev, [ticketId]: '' }));
        fetchUserTickets();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit reply');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting reply');
    }
  };

  useEffect(() => {
    if (activeDashboardTab === 'support' && currentUser?.id) {
      fetchUserTickets();
      loadPastHistoryFromLocalStorage();
    }
  }, [activeDashboardTab, currentUser?.id]);

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
      setEditDob(currentUser.dob ? formatToLocalDateString(currentUser.dob) : '');
      setEditGender(currentUser.gender || 'Male');
      setEditLocation(currentUser.location || '');
      setEditLanguages(currentUser.languages || '');
      fetchWalletTransactions();
    }
  }, [currentUser?.id]);

  // Load past consultations from both username (if logged in) and localStorage
  const loadPastHistoryFromLocalStorage = async () => {
    try {
      const sessionMap = new Map();

      // 1. Fetch by logged in user's username if available
      if (currentUser?.username) {
        const res = await fetch(`/api/user/sessions?user_name=${encodeURIComponent(currentUser.username)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach(s => sessionMap.set(s.id, s));
          }
        }
      }

      // 2. Fetch by saved session IDs from localStorage
      const savedIdsStr = localStorage.getItem('my_consultation_sessions');
      if (savedIdsStr) {
        try {
          const ids = JSON.parse(savedIdsStr);
          if (ids && ids.length > 0) {
            const res = await fetch(`/api/user/sessions?ids=${ids.join(',')}`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                data.forEach(s => {
                  if (!sessionMap.has(s.id)) {
                    sessionMap.set(s.id, s);
                  }
                });
              }
            }
          }
        } catch (e) {
          console.error('Error parsing localStorage session IDs:', e);
        }
      }

      // Convert map to list and sort by created_at DESC
      const combined = Array.from(sessionMap.values()).sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setUserPastSessions(combined);
    } catch (err) {
      console.error('Error fetching past sessions list:', err);
    }
  };

  // Automatically refresh past sessions when activeSessionId goes from active to inactive
  useEffect(() => {
    if (!activeSessionId) {
      loadPastHistoryFromLocalStorage();
    }
  }, [activeSessionId, currentUser?.username]);

  // Fetch registered consultants directory
  const fetchConsultants = async () => {
    try {
      setLoading(true);
      const url = currentUser?.id ? `/api/consultants?userId=${currentUser.id}` : '/api/consultants';
      const res = await fetch(url);
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
          gender: editGender,
          location: editLocation,
          languages: editLanguages
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

      {/* 🟢 DYNAMIC HAMBURGER NAVIGATION DRAWER */}
      {currentUser && !selectedConsultant && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setHamburgerOpen(!hamburgerOpen)}
            className="bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border border-emerald-300/30 flex items-center justify-center group relative"
            id="hamburger-menu-btn"
          >
            {hamburgerOpen ? (
              <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-300" />
            ) : (
              <Menu className="w-6 h-6 transition-transform duration-300" />
            )}
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow">
              ⚡
            </span>
          </button>

          {/* Hamburger slide-out drawer */}
          <AnimatePresence>
            {hamburgerOpen && (
              <>
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setHamburgerOpen(false)}
                  className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
                />

                {/* Animated Drawer Box */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 50, x: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 50, x: 20 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="absolute bottom-16 right-0 w-72 bg-slate-900/95 border border-slate-800 rounded-3xl p-5 shadow-2xl z-50 space-y-4 backdrop-blur-md text-left"
                >
                  <div className="border-b border-slate-800/80 pb-3">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">CallMint Menu</span>
                    <strong className="text-slate-200 text-sm font-bold block mt-1">{currentUser.display_name}</strong>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-slate-400">
                      <span>Wallet Balance:</span>
                      <span className="text-emerald-400 font-bold font-mono">₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => {
                        setActiveDashboardTab('advisors');
                        setHamburgerOpen(false);
                      }}
                      className={`flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'advisors'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>🔍 Browse Advisors</span>
                    </button>

                    <button
                      id="user-profile-tab"
                      onClick={() => {
                        setActiveDashboardTab('profile');
                        setHamburgerOpen(false);
                      }}
                      className={`flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'profile'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <User className="w-4 h-4 shrink-0" />
                      <span>👤 My Profile Details</span>
                    </button>

                    <button
                      id="wallet-recharge-tab"
                      onClick={() => {
                        setActiveDashboardTab('wallet');
                        fetchWalletTransactions();
                        setHamburgerOpen(false);
                      }}
                      className={`flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'wallet'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <DollarSign className="w-4 h-4 shrink-0" />
                      <span>💳 Wallet Recharge & Ledger</span>
                    </button>

                    <button
                      id="chat-history-tab"
                      onClick={() => {
                        setActiveDashboardTab('history');
                        loadPastHistoryFromLocalStorage();
                        setHamburgerOpen(false);
                      }}
                      className={`flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'history'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>📜 Past Consultation Chats</span>
                    </button>

                    <button
                      id="support-tickets-tab"
                      onClick={() => {
                        setActiveDashboardTab('support');
                        setHamburgerOpen(false);
                      }}
                      className={`flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'support'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      <span>🙋 Help & Customer Support</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
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
                  onClick={(e) => {
                    try {
                      (e.target as any).showPicker();
                    } catch (err) {
                      console.log("showPicker not supported", err);
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full font-mono cursor-pointer"
                  style={{ colorScheme: 'dark' }}
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
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Current Location</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="e.g. Mumbai, Maharashtra"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Languages Spoken</label>
                <input
                  type="text"
                  value={editLanguages}
                  onChange={(e) => setEditLanguages(e.target.value)}
                  placeholder="e.g. Hindi, English, Marathi"
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Profile Photo (Upload file ya direct image link enter karein)</label>
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <div className="relative flex-1">
                    <Camera className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Image link (e.g., https://example.com/photo.jpg) ya photo upload karein"
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full font-mono"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      id="profile-photo-upload"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                    <label
                      htmlFor="profile-photo-upload"
                      className={`cursor-pointer bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 w-full sm:w-auto shrink-0 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <span>{uploadingPhoto ? 'Uploading...' : '📁 Upload Local Photo'}</span>
                    </label>
                  </div>
                </div>
                {editPhotoUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 max-w-sm font-sans">
                    <img src={editPhotoUrl} alt="Preview" className="w-10 h-10 rounded-xl object-cover border border-slate-800" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }} referrerPolicy="no-referrer" />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Live Preview</span>
                      <span className="text-[9px] text-emerald-400 font-mono block truncate max-w-[200px]">{editPhotoUrl}</span>
                    </div>
                  </div>
                )}
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
                  disabled={rechargeLoading || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-black px-4 rounded-xl text-xs transition-all shrink-0"
                >
                  {rechargeLoading ? 'Adding...' : 'Recharge Wallet'}
                </button>
              </div>

              {/* GST breakdown helper */}
              {rechargeAmount && parseFloat(rechargeAmount) > 0 && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/50 text-[11px] space-y-1 text-slate-400 font-mono text-left">
                  <div className="flex justify-between">
                    <span>Base Amount (Wallet Credit):</span>
                    <span className="text-slate-300">₹{parseFloat(rechargeAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span className="text-slate-300">₹{(parseFloat(rechargeAmount) * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 text-emerald-400 font-bold">
                    <span>Total Payable (to pay):</span>
                    <span>₹{(parseFloat(rechargeAmount) * 1.18).toFixed(2)}</span>
                  </div>
                </div>
              )}
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
                {walletTransactions.map((tx) => {
                  const baseAmt = parseFloat(tx.amount || 0);
                  const gstRateVal = tx.gst_rate || 18.0;
                  const gstAmt = tx.gst_amount !== undefined && tx.gst_amount !== null && tx.gst_amount !== 0 ? parseFloat(tx.gst_amount) : parseFloat((baseAmt * 0.18).toFixed(2));
                  const totalPaidVal = tx.total_paid !== undefined && tx.total_paid !== null && tx.total_paid !== 0 ? parseFloat(tx.total_paid) : parseFloat((baseAmt + gstAmt).toFixed(2));

                  return (
                    <div key={tx.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-800 transition-colors">
                      <div className="space-y-1 text-left flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            tx.type === 'recharge' ? 'text-emerald-400 bg-emerald-500/10' :
                            tx.type === 'admin_credit' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' :
                            tx.type === 'refund' ? 'text-blue-400 bg-blue-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}>
                            {tx.type === 'admin_credit' ? 'SPECIAL CREDIT' : tx.type.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold">#{tx.id}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans">{tx.description}</p>
                        
                        {tx.type === 'recharge' && (
                          <div className="text-[10px] text-slate-400 font-mono bg-slate-900/40 p-1.5 rounded border border-slate-800/40 mt-1 max-w-sm space-y-0.5">
                            <div className="flex justify-between">
                              <span>Base Recharge amount:</span>
                              <span className="text-slate-300">₹{baseAmt.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>GST Paid ({gstRateVal}%):</span>
                              <span className="text-slate-300">₹{gstAmt.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-850 pt-0.5 font-bold text-emerald-400">
                              <span>Total Billed Amount:</span>
                              <span>₹{totalPaidVal.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                        <span className="text-[9px] text-slate-500 font-mono block mt-1">{new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto border-t md:border-t-0 border-slate-850 pt-2 md:pt-0 shrink-0">
                        {tx.type === 'recharge' && (
                          <button
                            type="button"
                            onClick={() => downloadInvoice(tx, currentUser)}
                            className="bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded text-[10px] font-bold font-mono flex items-center gap-1 transition-all"
                          >
                            📥 Download Invoice
                          </button>
                        )}
                        <div className={`font-mono text-xs font-bold ${
                          tx.type === 'consultation' ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {tx.type === 'consultation' ? '-' : '+'}₹{baseAmt.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-md font-mono">
                              Deducted: ₹{parseFloat(sess.total_paid || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] bg-slate-900 text-slate-400 font-bold px-2 py-0.5 rounded-md font-mono">
                              Duration: {sess.duration_minutes} mins
                            </span>
                          </div>
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
                        <span className="text-[9px] text-slate-600 font-mono mt-0.5 px-1">
                          {(() => {
                            try {
                              const d = new Date(msg.created_at);
                              return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } catch {
                              return '';
                            }
                          })()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {currentUser && !selectedConsultant && activeDashboardTab === 'support' && (
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 space-y-6 text-left" id="user-support-panel">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-850">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-200">Customer Support & Assistance Panel</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Raise a Ticket */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-widest">Raise a New Support Ticket</h4>
              <p className="text-xs text-slate-400">
                Aapka koi sawal hai ya koi problem aayi hai? Kripya neeche form bharein, hamari support team jald hi respond karegi.
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const subject = (form.elements.namedItem('subject') as HTMLInputElement).value;
                const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value;
                const session_id = (form.elements.namedItem('session_id') as HTMLSelectElement).value;

                try {
                  const res = await fetch('/api/tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sender_type: 'user',
                      sender_id: currentUser.id,
                      sender_name: currentUser.display_name,
                      session_id: session_id || null,
                      subject,
                      message
                    })
                  });

                  if (res.ok) {
                    setSuccess('Ticket raised successfully!');
                    form.reset();
                    fetchUserTickets();
                  } else {
                    const data = await res.json();
                    setError(data.error || 'Failed to raise support ticket');
                  }
                } catch (err: any) {
                  setError(err.message || 'Error creating ticket');
                }
              }} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Subject / Topic *</label>
                  <input
                    type="text"
                    name="subject"
                    required
                    placeholder="Enter short description of the issue..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Select Chat (Optional)</label>
                  <select
                    name="session_id"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full font-mono"
                  >
                    <option value="">-- No Specific Chat / General Query --</option>
                    {userPastSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        Chat with {s.consultant_name} ({new Date(s.created_at).toLocaleDateString()}) - Status: {s.status}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Jis chat mein samasya hai, kripya use select karein taaki hum behtar tarike se help kar sakein.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Message / Detail *</label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    placeholder="Describe your issue or query in detail here..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl transition-all shadow-md w-full uppercase tracking-wider"
                >
                  Submit Support Ticket
                </button>
              </form>
            </div>

            {/* Right: My Tickets List */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-widest">My Raised Tickets</h4>
              
              {loadingTickets ? (
                <div className="text-center py-12 text-slate-500 text-xs font-mono">Loading tickets...</div>
              ) : userTickets.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-mono bg-slate-950/40 rounded-2xl border border-dashed border-slate-800/80">
                  No tickets raised yet by your account.
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {userTickets.map((t: any) => (
                    <div key={t.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{t.subject}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                          t.status === 'closed'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : t.status === 'resolved' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      {t.session_id && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          Reference Chat ID: <strong className="text-slate-300 font-bold">#{t.session_id}</strong>
                        </div>
                      )}

                      <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-850/50">
                        {t.message}
                      </p>

                      {/* Conversation Thread history for User */}
                      {t.replies && t.replies.length > 0 ? (
                        <div className="space-y-2 mt-2 pt-2 border-t border-slate-850/70">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Conversation History:</span>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {t.replies.map((reply: any) => (
                              <div 
                                key={reply.id} 
                                className={`p-2.5 rounded-xl text-xs space-y-0.5 ${
                                  reply.sender_type === 'admin'
                                    ? 'bg-emerald-950/15 border border-emerald-900/10 text-left'
                                    : 'bg-slate-900 border border-slate-850 text-right ml-6'
                                }`}
                              >
                                <div className={`flex items-center gap-1 text-[9px] text-slate-500 font-mono ${reply.sender_type === 'admin' ? 'justify-start' : 'justify-end'}`}>
                                  <span className={reply.sender_type === 'admin' ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold'}>
                                    {reply.sender_type === 'admin' ? '🛡 Admin Support' : '👤 You'}
                                  </span>
                                  <span>•</span>
                                  <span>{new Date(reply.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {reply.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : t.admin_reply ? (
                        <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-3 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
                            <span>🛡 Admin Reply:</span>
                            <span className="font-mono text-slate-500 font-normal">{new Date(t.replied_at).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                            {t.admin_reply}
                          </p>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Pending team response.
                        </div>
                      )}

                      {/* User Reply Back Option */}
                      {t.status !== 'closed' && (
                        (() => {
                          const lastReplyIsAdmin = t.replies && t.replies.length > 0 
                            ? t.replies[t.replies.length - 1].sender_type === 'admin'
                            : !!t.admin_reply;
                          
                          if (lastReplyIsAdmin) {
                            return (
                              <form onSubmit={(e) => handleUserReplySubmit(e, t.id)} className="mt-3 pt-3 border-t border-slate-850/60 flex items-center gap-2">
                                <input
                                  type="text"
                                  required
                                  placeholder="Type a follow-up reply..."
                                  value={userReplyDrafts[t.id] || ''}
                                  onChange={(e) => setUserReplyDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                                />
                                <button
                                  type="submit"
                                  className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition-all uppercase tracking-wider flex items-center gap-1 shrink-0"
                                >
                                  Reply
                                </button>
                              </form>
                            );
                          } else {
                            return (
                              <div className="mt-3 pt-3 border-t border-slate-850/60 text-slate-500 text-[10px] font-mono italic">
                                ⏳ Waiting for administrator reply before you can send another follow-up.
                              </div>
                            );
                          }
                        })()
                      )}
                      
                      {t.status === 'closed' && (
                        <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-2.5 text-center text-[10px] text-slate-500 font-mono">
                          🔒 Closed. No further replies allowed.
                        </div>
                      )}

                      <div className="text-[9px] text-slate-600 font-mono pt-1">
                        Date Raised: {new Date(t.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-[10px] bg-rose-500/10 text-rose-400 font-bold px-2 py-0.5 rounded-md font-mono">
                                  Deducted: ₹{parseFloat(sess.total_paid || 0).toFixed(2)}
                                </span>
                                <span className="text-[10px] bg-slate-900 text-slate-400 font-bold px-2 py-0.5 rounded-md font-mono">
                                  Duration: {sess.duration_minutes} mins
                                </span>
                              </div>
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
                            <span className="text-[9px] text-slate-600 font-mono mt-0.5 px-1">
                              {(() => {
                                try {
                                  const d = new Date(msg.created_at);
                                  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } catch {
                                  return '';
                                }
                              })()}
                            </span>
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

                    {/* GST breakdown helper */}
                    {rechargeAmount && parseFloat(rechargeAmount) > 0 && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/50 text-[11px] space-y-1 text-slate-400 font-mono text-left mt-2">
                        <div className="flex justify-between">
                          <span>Base Amount (Wallet Credit):</span>
                          <span className="text-slate-300">₹{parseFloat(rechargeAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST (18%):</span>
                          <span className="text-slate-300">₹{(parseFloat(rechargeAmount) * 0.18).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-800 pt-1 text-emerald-400 font-bold">
                          <span>Total Payable (to pay):</span>
                          <span>₹{(parseFloat(rechargeAmount) * 1.18).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
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
        <div className="space-y-8">
          
          {/* Resolve and Render Dynamic 3D Hero Section */}
          {(() => {
            const isGlobal = selectedCategory === 'All';
            const globalConfig = heroSettings?.global;
            const catConfig = heroSettings?.categories?.[selectedCategory];

            const resolvedHero = {
              tagline: (isGlobal ? globalConfig?.tagline : catConfig?.tagline) || (isGlobal ? '✨ CHOOSE THE PERFECT EXPERT' : `🔮 TOP-TIER ${selectedCategory.toUpperCase()} EXPERTS`),
              headline: (isGlobal ? globalConfig?.headline : catConfig?.headline) || (isGlobal ? 'Connect with Global Professional Advisors' : `Meet Leading ${selectedCategory} Instantly`),
              description: (isGlobal ? globalConfig?.description : catConfig?.description) || (isGlobal ? 'Browse top-tier handpicked specialists and start secure live chats instantly. Pay-per-minute speaking time with secured transaction ledger.' : `Connect with professional ${selectedCategory.toLowerCase()} for live private 1-on-1 audio chat consultation. Secure per-minute pricing.`)
            };

            return (
              <motion.div
                initial={{ opacity: 0, y: -25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                onMouseMove={(e) => {
                  const card = e.currentTarget;
                  const rect = card.getBoundingClientRect();
                  const x = e.clientX - rect.left - rect.width / 2;
                  const y = e.clientY - rect.top - rect.height / 2;
                  const rx = -(y / rect.height) * 12; // tilt X
                  const ry = (x / rect.width) * 12;   // tilt Y
                  setTilt({ rx, ry });
                }}
                onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.1s ease-out'
                }}
                className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-8 md:p-12 rounded-3xl text-center space-y-4 max-w-4xl mx-auto overflow-hidden shadow-2xl group cursor-default"
              >
                {/* Visual Highlights & Accents */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] pointer-events-none" />
                <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

                <span className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase">
                  {resolvedHero.tagline}
                </span>

                <h2 className="text-3xl md:text-4xl font-black text-slate-100 tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {resolvedHero.headline}
                </h2>

                <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  {resolvedHero.description}
                </p>

                <div className="flex items-center justify-center space-x-2 pt-2 text-[10px] font-mono text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>3D Animated Perspective Active</span>
                </div>
              </motion.div>
            );
          })()}

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
