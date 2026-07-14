import React, { useState, useEffect } from 'react';
import { Star, ShieldAlert, Sparkles, Clock, MessageCircle, ArrowLeft, Send, CheckCircle, HelpCircle, User, Calendar, Wallet, AlertTriangle, Edit3, Camera, X, Menu, LogOut, Phone, CreditCard, Bell, Volume2, Zap, ArrowRight, History, Sun, Moon, Smartphone, ArrowUpRight, ArrowDownLeft, RefreshCw, Download, TrendingUp, Check, FileText, Filter, Crop, Search, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Consultant, Review } from '../../types';
import { downloadInvoice } from '../../utils/invoiceHelper';
import { CallMintLandingPage } from './CallMintLandingPage';
import { ImageEditorModal } from '../modals/ImageEditorModal';
import { ProfileChangesSuccessModal, ProfileChangeItem } from '../modals/ProfileChangesSuccessModal';
import { compressImageBase64 } from '../../utils/helpers';

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

const normalizeCategory = (cat: string) => {
  if (!cat) return 'Consultants';
  const c = cat.trim();
  const mapping: Record<string, string> = {
    'Astrologer': 'Astrologers', 'Astrologers': 'Astrologers',
    'Influencer': 'Influencers', 'Influencers': 'Influencers',
    'Mentor': 'Mentors', 'Mentors': 'Mentors',
    'Doctor': 'Doctors', 'Doctors': 'Doctors',
    'Lawyer': 'Lawyers', 'Lawyers': 'Lawyers',
    'Singer': 'Singers', 'Singers': 'Singers',
    'Advisor': 'Advisors', 'Advisors': 'Advisors',
    'Friend': 'Friends', 'Friends': 'Friends',
    'Coach': 'Coaches', 'Coaches': 'Coaches',
    'Consultant': 'Consultants', 'Consultants': 'Consultants'
  };
  return mapping[c] || c;
};

interface ConsultantProfileProps {
  onSelectSession: (sessionId: string, username: string, role: 'user' | 'consultant', isReadOnly?: boolean) => void;
  targetUsername?: string; // If navigated from Consultant Panel profile URL
  onClearTargetUsername?: () => void;
  currentUser: any;
  setCurrentUser: (user: any) => void;
  onOpenAuth: () => void;
  activeSessionId?: string;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onInstallApp?: () => void;
}

export function ConsultantProfile({ onSelectSession, targetUsername, onClearTargetUsername, currentUser, setCurrentUser, onOpenAuth, activeSessionId, onLogout, theme = 'dark', onToggleTheme, onInstallApp }: ConsultantProfileProps) {
  // Directory or profile selection
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedConsSchedules, setSelectedConsSchedules] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const formatTimeTo12Hour = (timeStr: string): string => {
    if (!timeStr) return '';
    const timeLower = timeStr.toLowerCase();
    if (timeLower.includes('am') || timeLower.includes('pm')) {
      return timeStr.toUpperCase();
    }
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].substring(0, 2);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // hour 0 is 12
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatToYYYYMMDD = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr;
    }
  };
  
  // Active selection states
  const [selectedMinutes, setSelectedMinutes] = useState<number>(10); // Default 10 mins
  const [bookingTab, setBookingTab] = useState<'about' | 'schedule' | 'reviews'>('about');
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<'wallet' | 'razorpay'>('wallet');

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
  const [editPhone, setEditPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Advanced image editor states
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [editorImageBase64, setEditorImageBase64] = useState<string | undefined>(undefined);

  // Profile Success Modal states
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [profileChangesList, setProfileChangesList] = useState<ProfileChangeItem[]>([]);

  // 3D Perspective Tilt and Hamburger states
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [heroSettings, setHeroSettings] = useState<any>(null);
  const [classicAvatars, setClassicAvatars] = useState<string[]>([]);

  // --- REAL-TIME IN-APP ALERTS & BROADCASTS ---
  const [clientNotifications, setClientNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [latestToast, setLatestToast] = useState<{ id: number; title: string; message: string } | null>(null);
  const knownNotifIdsRef = React.useRef<number[]>([]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav");
      audio.volume = 0.55;
      audio.play().catch(err => {
        console.warn("Audio chime autoplay blocked by browser sandbox policy.", err);
      });
    } catch (err) {
      console.error("Failed to play alert sound:", err);
    }
  };

  useEffect(() => {
    if (!currentUser || !currentUser.id) {
      setClientNotifications([]);
      setUnreadNotifCount(0);
      return;
    }

    const fetchNotifications = async (isFirstLoad = false) => {
      try {
        const res = await fetch(`/api/notifications?user_type=user&user_id=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            const list = data.notifications || [];
            setClientNotifications(list);
            
            const unreads = list.filter((n: any) => !n.is_read);
            setUnreadNotifCount(unreads.length);

            const fetchedIds = list.map((n: any) => n.id);

            if (isFirstLoad) {
              knownNotifIdsRef.current = fetchedIds;
            } else {
              // Identify if any active unread notification has an ID we have never seen before
              const newUnread = unreads.find((n: any) => !knownNotifIdsRef.current.includes(n.id));
              if (newUnread) {
                playNotificationSound();
                setLatestToast({
                  id: newUnread.id,
                  title: newUnread.title,
                  message: newUnread.message
                });
                setTimeout(() => setLatestToast(null), 6000);
              }
              knownNotifIdsRef.current = fetchedIds;
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch user notifications (network or server restart):", err);
      }
    };

    fetchNotifications(true);

    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const handleMarkAsRead = async (id: number) => {
    if (!currentUser || !currentUser.id) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: 'user', user_id: currentUser.id })
      });
      if (res.ok) {
        setClientNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadNotifCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error("Error marking read:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser || !currentUser.id) return;
    try {
      const res = await fetch(`/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: 'user', user_id: currentUser.id })
      });
      if (res.ok) {
        setClientNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadNotifCount(0);
      }
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  };

  useEffect(() => {
    const fetchHeroSettings = async () => {
      try {
        const res = await fetch('/api/settings/hero');
        if (res.ok) {
          const data = await res.json();
          setHeroSettings(data);
        }
      } catch (err: any) {
        if (err && err.message && err.message.includes('Failed to fetch')) {
          console.warn('Network connection starting up. Retrying hero settings shortly...');
        } else {
          console.error('Failed to load hero configurations:', err);
        }
      }
    };
    const fetchClassicAvatars = async () => {
      try {
        const res = await fetch('/api/settings/avatars');
        if (res.ok) {
          const data = await res.json();
          setClassicAvatars(data);
        }
      } catch (err: any) {
        if (err && err.message && err.message.includes('Failed to fetch')) {
          console.warn('Network connection starting up. Retrying classic avatars shortly...');
        } else {
          console.error('Failed to load classic avatars:', err);
        }
      }
    };
    fetchHeroSettings();
    fetchClassicAvatars();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size is too large. Please upload an image smaller than 5MB.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditorImageBase64(base64String);
        setIsImageEditorOpen(true);
        // Clear input so selecting the same file triggers onChange again
        e.target.value = '';
      };
      reader.onerror = () => {
        setError('An error occurred while reading the file.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const saveCroppedPhoto = async (croppedBase64: string) => {
    setUploadingPhoto(true);
    setError(null);
    setSuccess(null);
    try {
      console.log('[Image Optimization] Compressing profile photo...');
      const compressedBase64 = await compressImageBase64(croppedBase64, 50 * 1024);

      const res = await fetch('/api/user/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedBase64 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
      
      setEditPhotoUrl(data.photo_url);
      setSuccess('Profile photo saved successfully with crop and alignment!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (uploadErr: any) {
      setError(uploadErr.message || 'Photo upload and crop failed.');
      throw uploadErr;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Quick recharge fields
  const [rechargeAmount, setRechargeAmount] = useState('250');
  const [rechargeLoading, setRechargeLoading] = useState(false);

  // Recharge modal visibility state
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // Consultant Busy & Queue states
  const [showBusyWarningModal, setShowBusyWarningModal] = useState(false);
  const [busyConsultantQueueData, setBusyConsultantQueueData] = useState<any>(null);
  const [busyWarningTickingSeconds, setBusyWarningTickingSeconds] = useState<number>(0);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedConsultantName, setBlockedConsultantName] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showBusyWarningModal && busyWarningTickingSeconds > 0) {
      interval = setInterval(() => {
        setBusyWarningTickingSeconds(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showBusyWarningModal, busyWarningTickingSeconds]);

  // User past chat history states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearchName, setHistorySearchName] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'completed' | 'rejected' | 'cancelled' | 'missed'>('all');
  const [userPastSessions, setUserPastSessions] = useState<any[]>([]);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);
  const [viewingPastSessionMessages, setViewingPastSessionMessages] = useState<any[] | null>(null);
  const [viewingPastSessionInfo, setViewingPastSessionInfo] = useState<any | null>(null);

  // Client tabs navigation state
  const [activeDashboardTab, setActiveDashboardTab] = useState<'advisors' | 'profile' | 'wallet' | 'history' | 'support' | 'following' | 'notifications'>('advisors');
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [walletTxFilter, setWalletTxFilter] = useState<'all' | 'recharge' | 'consultation' | 'refund' | 'admin_credit'>('all');

  // Helper to safely get the consultant's name for a session
  const getConsultantNameOfSession = (sess: any) => {
    if (!sess) return 'Expert Advisor';
    if (sess.consultant_name && sess.consultant_name.trim()) {
      return sess.consultant_name;
    }
    // Try to find in consultants state
    const found = consultants.find(c => Number(c.id) === Number(sess.consultant_id));
    if (found && found.display_name) {
      return found.display_name;
    }
    return `Consultant #${sess.consultant_id || ''}`;
  };

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
    } catch (err: any) {
      if (err && err.message && err.message.includes('Failed to fetch')) {
        console.warn('Network connection starting up. Retrying support tickets shortly...');
      } else {
        console.error('Failed to fetch support tickets:', err);
      }
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
    if (!currentUser?.id) {
      setUserTickets([]);
      return;
    }
    if (activeDashboardTab === 'support' && currentUser?.id) {
      fetchUserTickets();
      loadPastHistoryFromLocalStorage();
    }
  }, [activeDashboardTab, currentUser?.id]);

  const fetchFollowingList = async () => {
    if (!currentUser?.id) return;
    setFollowingLoading(true);
    try {
      const res = await fetch(`/api/user/${currentUser.id}/following`);
      if (res.ok) {
        const data = await res.json();
        setFollowingList(data);
      }
    } catch (err: any) {
      if (err && err.message && err.message.includes('Failed to fetch')) {
        console.warn('Network connection starting up. Retrying following list shortly...');
      } else {
        console.error("Error fetching following:", err);
      }
    } finally {
      setFollowingLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) {
      setFollowingList([]);
      return;
    }
    if (activeDashboardTab === 'following' && currentUser?.id) {
      fetchFollowingList();
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
    } catch (err: any) {
      if (err && err.message && err.message.includes('Failed to fetch')) {
        console.warn('Network connection starting up. Retrying transactions shortly...');
      } else {
        console.error('Error fetching transactions:', err);
      }
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
      setEditPhone(currentUser.phone || '');
      fetchWalletTransactions();
    } else {
      setEditDisplayName('');
      setEditPhotoUrl('');
      setEditDob('');
      setEditGender('Male');
      setEditLocation('');
      setEditLanguages('');
      setEditPhone('');
      setWalletTransactions([]);
    }
  }, [currentUser?.id]);

  // Listen for navigation requests to the wallet tab or logo click
  useEffect(() => {
    const handleNavigateWallet = () => {
      setSelectedConsultant(null);
      setActiveDashboardTab('wallet');
    };
    const handleToggleHamburger = () => {
      setHamburgerOpen(prev => !prev);
    };
    const handleViewUserPhoto = (e: any) => {
      if (e.detail) {
        setLightboxImage(e.detail);
      }
    };
    const handleLogoClick = () => {
      setSelectedConsultant(null);
      setActiveDashboardTab('advisors');
      if (onClearTargetUsername) {
        onClearTargetUsername();
      }
    };
    window.addEventListener('navigate-to-wallet-tab', handleNavigateWallet);
    window.addEventListener('toggle-hamburger-menu', handleToggleHamburger);
    window.addEventListener('view-user-photo', handleViewUserPhoto);
    window.addEventListener('logo-click', handleLogoClick);
    return () => {
      window.removeEventListener('navigate-to-wallet-tab', handleNavigateWallet);
      window.removeEventListener('toggle-hamburger-menu', handleToggleHamburger);
      window.removeEventListener('view-user-photo', handleViewUserPhoto);
      window.removeEventListener('logo-click', handleLogoClick);
    };
  }, [onClearTargetUsername]);

  // Load past consultations from both username (if logged in) and localStorage
  const loadPastHistoryFromLocalStorage = async () => {
    try {
      const sessionMap = new Map();

      // Clear any corrupted my_consultation_sessions from localStorage
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('my_consultation_sessions');
          if (raw) {
            if (raw.trim().startsWith('<') || raw.trim().startsWith('<!doctype')) {
              console.warn('[Validation] Found corrupted HTML inside my_consultation_sessions. Clearing key.');
              localStorage.removeItem('my_consultation_sessions');
            } else {
              JSON.parse(raw);
            }
          }
        } catch (e) {
          console.warn('[Validation] Failed parsing my_consultation_sessions, clearing key.', e);
          localStorage.removeItem('my_consultation_sessions');
        }
      }

      // 1. Fetch by logged in user's username if available
      if (currentUser?.username) {
        const res = await fetch(`/api/user/sessions?user_name=${encodeURIComponent(currentUser.username)}`);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (Array.isArray(data)) {
              data.forEach(s => sessionMap.set(s.id, s));
            }
          } else {
            console.warn('[Notification API] Received non-JSON response for user past sessions on load.');
          }
        }
      }

      // 2. Fetch by saved session IDs from localStorage safely
      const savedIdsStr = localStorage.getItem('my_consultation_sessions');
      if (savedIdsStr) {
        let ids: any[] = [];
        try {
          ids = JSON.parse(savedIdsStr);
          if (!Array.isArray(ids)) {
            throw new Error('Stored session IDs is not an array');
          }
        } catch (parseErr) {
          console.warn('[Notification API] Stored session IDs are corrupted in localStorage. Resetting key.');
          localStorage.removeItem('my_consultation_sessions');
          ids = [];
        }

        if (ids && ids.length > 0) {
          try {
            const res = await fetch(`/api/user/sessions?ids=${ids.join(',')}`);
            if (res.ok) {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                if (Array.isArray(data)) {
                  data.forEach(s => {
                    if (!sessionMap.has(s.id)) {
                      if (currentUser) {
                        const isMatch = s.user_id === currentUser.id || String(s.user_name).toLowerCase() === String(currentUser.username).toLowerCase();
                        if (isMatch) {
                          sessionMap.set(s.id, s);
                        }
                      } else {
                        sessionMap.set(s.id, s);
                      }
                    }
                  });
                }
              } else {
                const textOutput = await res.text();
                console.warn('[Notification API] Received non-JSON response from /api/user/sessions:', textOutput.substring(0, 100));
              }
            }
          } catch (fetchErr: any) {
            if (fetchErr && fetchErr.message && fetchErr.message.includes('Failed to fetch')) {
              console.warn('Network connection starting up. Retrying past sessions list shortly...');
            } else {
              console.error('Error fetching/parsing user sessions from API:', fetchErr);
            }
          }
        }
      }

      // Convert map to list and sort by created_at DESC
      const combined = Array.from(sessionMap.values()).sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setUserPastSessions(combined);
    } catch (err: any) {
      console.warn('Network or connection startup lag: Could not load past sessions temporarily. Will retry shortly.', err);
    }
  };

  // Automatically refresh past sessions when activeSessionId goes from active to inactive
  useEffect(() => {
    if (!activeSessionId) {
      loadPastHistoryFromLocalStorage();
    }
  }, [activeSessionId, currentUser?.username]);

  // Periodic sync of past sessions to check for any active/ongoing sessions
  useEffect(() => {
    const interval = setInterval(() => {
      loadPastHistoryFromLocalStorage();
    }, 10000); // sync every 10 seconds
    return () => clearInterval(interval);
  }, [currentUser?.username]);

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
        } else {
          // If the targetUsername is not in the list of available/permitted consultants, clear it!
          console.warn(`Target username ${targetUsername} is not in your permitted advisor list. Clearing filter.`);
          if (onClearTargetUsername) {
            onClearTargetUsername();
          }
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
  }, [targetUsername, currentUser?.id, currentUser?.locked_consultant_id, currentUser?.admin_allow_others]);

  const getFilteredConsultants = () => {
    let list = consultants;

    // Retrieve clicked history from localStorage safely
    let historyUsernames: string[] = [];
    try {
      const rawHistory = localStorage.getItem('clicked_consultants_history');
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          historyUsernames = parsed.map((u: string) => String(u).toLowerCase().trim()).filter(Boolean);
        } else {
          throw new Error('History is not an array');
        }
      }
    } catch (e) {
      console.error('Error reading clicked_consultants_history, resetting key:', e);
      localStorage.removeItem('clicked_consultants_history');
    }

    if (targetUsername) {
      const normTarget = targetUsername.toLowerCase().trim();
      if (!historyUsernames.includes(normTarget)) {
        historyUsernames.push(normTarget);
      }
    }

    // Parse locked IDs from the logged-in user profile (this includes those assigned by the Super Admin)
    const lockedIds = currentUser?.locked_consultant_id
      ? String(currentUser.locked_consultant_id)
          .split(',')
          .map(s => s.trim())
          .filter(s => s !== '')
          .map(s => parseInt(s, 10))
          .filter(n => !isNaN(n))
      : [];

    const hasLocksOrHistory = historyUsernames.length > 0 || lockedIds.length > 0;

    if (hasLocksOrHistory) {
      list = list.filter(c => {
        const matchesHistory = historyUsernames.includes(c.username.toLowerCase());
        const matchesLocked = lockedIds.includes(c.id);
        return matchesHistory || matchesLocked;
      });
    }

    return list;
  };

  // Load reviews and stats for the selected consultant
  const fetchFullProfile = async (cons: Consultant) => {
    try {
      setSelectedConsultant(cons);
      const revsRes = await fetch(`/api/consultants/${cons.id}/reviews`);
      if (revsRes.ok) {
        const revsData = await revsRes.json();
        setReviews(revsData);
      }
      const schedulesRes = await fetch(`/api/consultants/${cons.id}/schedules`);
      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSelectedConsSchedules(schedulesData);
      } else {
        setSelectedConsSchedules([]);
      }
    } catch (err: any) {
      if (err && err.message && err.message.includes('Failed to fetch')) {
        console.warn('Network connection starting up. Retrying reviews and schedules shortly...');
      } else {
        console.error('Error loading consultant reviews and schedules:', err);
      }
    }
  };

  const handleFollowToggle = async (cons: Consultant) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const isFollowing = !!(cons as any).is_following;
    const endpoint = isFollowing ? 'unfollow' : 'follow';
    try {
      const res = await fetch(`/api/user/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, consultantId: cons.id })
      });
      if (res.ok) {
        const nextIsFollowing = isFollowing ? 0 : 1;
        // Update selectedConsultant state directly
        setSelectedConsultant(prev => {
          if (!prev) return null;
          return {
            ...prev,
            is_following: nextIsFollowing,
            followers_count: isFollowing 
              ? Math.max(0, ((prev as any).followers_count || 1) - 1) 
              : ((prev as any).followers_count || 0) + 1
          };
        });
        
        // Also update the consultant in the master consultants list so the dashboard list stays in sync
        setConsultants(prevList => prevList.map(c => {
          if (c.id === cons.id) {
            return {
              ...c,
              is_following: nextIsFollowing,
              followers_count: isFollowing 
                ? Math.max(0, ((c as any).followers_count || 1) - 1) 
                : ((c as any).followers_count || 0) + 1
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("Error toggling follow status:", err);
    }
  };

  // Save User Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileSaving(true);
    setError(null);
    setSuccess(null);

    const numericPart = editPhone.replace(/\D/g, '');
    const last10 = numericPart.slice(-10);
    if (editPhone && last10.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      setProfileSaving(false);
      return;
    }
    const finalPhone = last10.length === 10 ? '+91' + last10 : null;

    // Track changed fields
    const changes: ProfileChangeItem[] = [];
    if ((currentUser.display_name || '') !== (editDisplayName || '')) {
      changes.push({ field: 'Display Name', oldValue: currentUser.display_name || 'None', newValue: editDisplayName || 'None' });
    }
    if ((currentUser.photo_url || '') !== (editPhotoUrl || '')) {
      changes.push({ field: 'Profile Photo', oldValue: currentUser.photo_url || '', newValue: editPhotoUrl || '', isImage: true });
    }
    const currentDobFormatted = currentUser.dob ? formatToLocalDateString(currentUser.dob) : '';
    if (currentDobFormatted !== (editDob || '')) {
      changes.push({ field: 'Date of Birth', oldValue: currentDobFormatted || 'None', newValue: editDob || 'None' });
    }
    if ((currentUser.gender || 'Male') !== (editGender || 'Male')) {
      changes.push({ field: 'Gender', oldValue: currentUser.gender || 'Male', newValue: editGender || 'Male' });
    }
    if ((currentUser.location || '') !== (editLocation || '')) {
      changes.push({ field: 'Location', oldValue: currentUser.location || 'None', newValue: editLocation || 'None' });
    }
    if ((currentUser.languages || '') !== (editLanguages || '')) {
      changes.push({ field: 'Languages', oldValue: currentUser.languages || 'None', newValue: editLanguages || 'None' });
    }
    if ((currentUser.phone || '') !== (finalPhone || '')) {
      changes.push({ field: 'Phone Number', oldValue: currentUser.phone || 'None', newValue: finalPhone || 'None' });
    }

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
          languages: editLanguages,
          phone: finalPhone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      
      setCurrentUser(data.user);
      setSuccess('Your profile has been updated successfully!');
      setProfileChangesList(changes);
      setIsSuccessModalOpen(true);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Helper to dynamically load the Razorpay checkout script on-demand
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Fast Wallet Recharge via Razorpay Checkout Gateway
  const handleQuickRecharge = async (amountToRecharge: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setRechargeLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 2. Create the order on backend (real or mock depending on env keys)
      const res = await fetch('/api/user/recharge/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          amount: amountToRecharge
        })
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || 'Failed to create recharge order');

      setShowRechargeModal(false);

      // Initialize REAL Razorpay Checkout Modal
      const options: any = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CallMint Wallet Recharge",
        description: `Add ₹${amountToRecharge} to CallMint balance` + (orderData.is_mock ? ' (Test Mode)' : ''),
        handler: async function (response: any) {
          setRechargeLoading(true);
          try {
            const verifyRes = await fetch('/api/user/recharge/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: currentUser.id,
                amount: amountToRecharge,
                order_id: orderData.order_id,
                payment_id: response.razorpay_payment_id || 'mock_payment_id',
                signature: response.razorpay_signature || 'mock_signature',
                is_mock: orderData.is_mock
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Failed to verify payment');

            setCurrentUser(verifyData.user);
            fetchWalletTransactions();
            setSuccess(`Congratulations! ₹${amountToRecharge} successfully added to your wallet.`);
            setTimeout(() => setSuccess(null), 3000);
          } catch (err: any) {
            setError(err.message);
          } finally {
            setRechargeLoading(false);
          }
        },
        prefill: {
          name: currentUser.display_name || '',
          email: currentUser.email || '',
          contact: currentUser.phone || ''
        },
        theme: {
          color: '#10B981'
        },
        modal: {
          ondismiss: function () {
            setRechargeLoading(false);
          }
        }
      };

      // Only pass order_id if it's NOT a mock order to avoid Razorpay validation error
      if (!orderData.is_mock) {
        options.order_id = orderData.order_id;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(`Payment failed: ${resp.error.description || 'Unknown error'}`);
        setRechargeLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message);
      setRechargeLoading(false);
    }
  };

  // Step 1: Create Order and Verify with Wallet instantly
  const handleInitiateWalletPayment = async (bypassBusyCheck?: boolean) => {
    if (!selectedConsultant) return;
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (selectedConsultant.is_online !== 1) {
      setError("Yeh consultant abhi offline hain. Kripya unke online aane ka intezar karein ya kisi aur active consultant se juden. (This consultant is currently offline. Please wait for them to come online or select another active consultant.)");
      setIsProcessingPayment(false);
      return;
    }

    const packagePrice = selectedMinutes * selectedConsultant.price_per_minute;
    if (currentUser.wallet_balance < packagePrice) {
      setError(`Insufficient balance. You need at least ₹${packagePrice} in your wallet to start the chat. Please recharge your wallet.`);
      return;
    }

    setError(null);
    setPendingPaymentMethod('wallet');
    setIsProcessingPayment(true);

    if (!bypassBusyCheck) {
      try {
        const queueRes = await fetch(`/api/consultants/${selectedConsultant.id}/queue-status`);
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          if (queueData.is_busy) {
            setBusyConsultantQueueData(queueData);
            setBusyWarningTickingSeconds(queueData.remaining_seconds || 0);
            setShowBusyWarningModal(true);
            setIsProcessingPayment(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking consultant busy status on connect click:', err);
      }
    }

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
      
      let orderData: any = {};
      const contentType = orderRes.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        orderData = await orderRes.json();
      } else {
        if (orderRes.status === 403) {
          setBlockedConsultantName(selectedConsultant.display_name);
          setShowBlockedModal(true);
          throw new Error(`You cannot connect to "${selectedConsultant.display_name}" due to a privacy restriction.`);
        }
        const text = await orderRes.text();
        throw new Error(text || 'Failed to initialize session order');
      }

      if (!orderRes.ok) {
        if (orderRes.status === 403 || (orderData.error && (orderData.error.toLowerCase().includes('blocked') || orderData.error.toLowerCase().includes('block')))) {
          setBlockedConsultantName(selectedConsultant.display_name);
          setShowBlockedModal(true);
        }
        throw new Error(orderData.error || 'Failed to initialize session order');
      }

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

      let verifyData: any = {};
      const verifyContentType = verifyRes.headers.get('content-type');
      if (verifyContentType && verifyContentType.includes('application/json')) {
        verifyData = await verifyRes.json();
      } else {
        if (verifyRes.status === 403) {
          setBlockedConsultantName(selectedConsultant.display_name);
          setShowBlockedModal(true);
          throw new Error(`You cannot connect to "${selectedConsultant.display_name}" due to a privacy restriction.`);
        }
        const text = await verifyRes.text();
        throw new Error(text || 'Wallet transaction failed');
      }

      if (!verifyRes.ok) {
        if (verifyRes.status === 403 || (verifyData.error && (verifyData.error.toLowerCase().includes('blocked') || verifyData.error.toLowerCase().includes('block')))) {
          setBlockedConsultantName(selectedConsultant.display_name);
          setShowBlockedModal(true);
        }
        throw new Error(verifyData.error || 'Wallet transaction failed');
      }

      setSuccess('Wallet Payment Succeeded! Connecting you to the Expert Consultation room...');
      
      // Save local history reference safely
      try {
        const existing = localStorage.getItem('my_consultation_sessions');
        let idList: any[] = [];
        try {
          idList = existing ? JSON.parse(existing) : [];
          if (!Array.isArray(idList)) idList = [];
        } catch (pe) {
          idList = [];
        }
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

  // Pay directly using Razorpay Gateway
  const handleInitiateDirectRazorpayPayment = async (bypassBusyCheck?: boolean) => {
    if (!selectedConsultant) return;
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (selectedConsultant.is_online !== 1) {
      setError("Yeh consultant abhi offline hain. Kripya unke online aane ka intezar karein ya kisi aur active consultant se juden. (This consultant is currently offline. Please wait for them to come online or select another active consultant.)");
      setIsProcessingPayment(false);
      return;
    }

    setError(null);
    setPendingPaymentMethod('razorpay');
    setIsProcessingPayment(true);

    if (!bypassBusyCheck) {
      try {
        const queueRes = await fetch(`/api/consultants/${selectedConsultant.id}/queue-status`);
        if (queueRes.ok) {
          const queueData = await queueRes.json();
          if (queueData.is_busy) {
            setBusyConsultantQueueData(queueData);
            setBusyWarningTickingSeconds(queueData.remaining_seconds || 0);
            setShowBusyWarningModal(true);
            setIsProcessingPayment(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking consultant busy status on connect click:', err);
      }
    }

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 2. Create the order on backend
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultant_id: selectedConsultant.id,
          duration_minutes: selectedMinutes,
          user_name: currentUser.display_name,
        }),
      });

      let orderData: any = {};
      const contentType = orderRes.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        orderData = await orderRes.json();
      } else {
        if (orderRes.status === 403) {
          setBlockedConsultantName(selectedConsultant.display_name);
          setShowBlockedModal(true);
          throw new Error(`You cannot connect to "${selectedConsultant.display_name}" due to a privacy restriction.`);
        }
        const text = await orderRes.text();
        throw new Error(text || 'Failed to initialize session order');
      }

      if (!orderRes.ok) {
        if (orderRes.status === 403 || (orderData.error && (orderData.error.toLowerCase().includes('blocked') || orderData.error.toLowerCase().includes('block')))) {
          setBlockedConsultantName(selectedConsultant.display_name);
          setShowBlockedModal(true);
        }
        throw new Error(orderData.error || 'Failed to initialize session order');
      }

      // 3. Initialize Razorpay Checkout
      const options: any = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: `Consultation - ${selectedConsultant.display_name}`,
        description: `${selectedMinutes} Mins Session with ${selectedConsultant.display_name}` + (orderData.is_mock ? ' (Test Mode)' : ''),
        handler: async function (response: any) {
          setIsProcessingPayment(true);
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                consultant_id: selectedConsultant.id,
                duration_minutes: selectedMinutes,
                user_name: currentUser.display_name,
                order_id: orderData.order_id,
                payment_id: response.razorpay_payment_id || 'mock_payment_id',
                signature: response.razorpay_signature || 'mock_signature',
                is_mock: orderData.is_mock,
                user_id: currentUser.id,
                payment_method: 'razorpay'
              }),
            });

            let verifyData: any = {};
            const verifyContentType = verifyRes.headers.get('content-type');
            if (verifyContentType && verifyContentType.includes('application/json')) {
              verifyData = await verifyRes.json();
            } else {
              if (verifyRes.status === 403) {
                setBlockedConsultantName(selectedConsultant.display_name);
                setShowBlockedModal(true);
                throw new Error(`You cannot connect to "${selectedConsultant.display_name}" due to a privacy restriction.`);
              }
              const text = await verifyRes.text();
              throw new Error(text || 'Payment verification failed');
            }

            if (!verifyRes.ok) {
              if (verifyRes.status === 403 || (verifyData.error && (verifyData.error.toLowerCase().includes('blocked') || verifyData.error.toLowerCase().includes('block')))) {
                setBlockedConsultantName(selectedConsultant.display_name);
                setShowBlockedModal(true);
              }
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            setSuccess('Payment Succeeded! Connecting you to the Expert Consultation room...');

            // Save local history reference safely
            try {
              const existing = localStorage.getItem('my_consultation_sessions');
              let idList: any[] = [];
              try {
                idList = existing ? JSON.parse(existing) : [];
                if (!Array.isArray(idList)) idList = [];
              } catch (pe) {
                idList = [];
              }
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
        },
        prefill: {
          name: currentUser.display_name || '',
          email: currentUser.email || '',
          contact: currentUser.phone || ''
        },
        theme: {
          color: '#10B981'
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      // Only pass order_id if it's NOT a mock order to avoid Razorpay validation error
      if (!orderData.is_mock) {
        options.order_id = orderData.order_id;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(`Payment failed: ${resp.error.description || 'Unknown error'}`);
        setIsProcessingPayment(false);
      });
      rzp.open();

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
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Recharge Page</span>
                </button>
              </div>
            )}
            {onClearTargetUsername && (
              <button
                onClick={() => {
                  onClearTargetUsername();
                }}
                className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold py-2.5 px-4 rounded-xl transition-all border border-emerald-500/20 shadow-sm"
              >
                ✨ Show All My Advisors
              </button>
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
      {error && activeDashboardTab !== 'profile' && (
        <div className="bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded-r-xl text-rose-200 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && activeDashboardTab !== 'profile' && (
        <div className="bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-r-xl text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ⚡ ACTIVE SESSION REJOIN BANNER */}
      {currentUser && (() => {
        const activeUserSession = userPastSessions.find(s => s.status === 'active');
        if (!activeUserSession) return null;
        return (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-cyan-500/15 border-2 border-cyan-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-cyan-500/5 text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="bg-cyan-500/20 p-2.5 rounded-xl animate-pulse flex-shrink-0">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">⚡ LIVE NOW / ONGOING</span>
                <h4 className="text-sm font-bold text-cyan-200">Aapka active consultation session chal raha hai!</h4>
                <p className="text-xs text-slate-400">Consultant: <strong className="text-slate-200">{getConsultantNameOfSession(activeUserSession)}</strong> (Session ID: #{activeUserSession.id})</p>
              </div>
            </div>
            <button
              onClick={() => onSelectSession(activeUserSession.id, currentUser?.display_name || currentUser?.username || 'User', 'user')}
              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-slate-950 font-black text-xs px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 shrink-0"
            >
              <span>Join Your Chatroom</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        );
      })()}

      {/* 🟢 DYNAMIC HAMBURGER NAVIGATION DRAWER */}
      {currentUser && (
        <>
          <div className="hidden">
            <button
              onClick={() => setHamburgerOpen(!hamburgerOpen)}
              id="hamburger-menu-btn"
            />
          </div>

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
                  className="fixed inset-0 w-full h-full bg-slate-950/70 backdrop-blur-md z-50"
                />

                {/* Animated Drawer Box */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10, x: 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10, x: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-xs bg-slate-950/98 border border-slate-800/80 rounded-3xl p-6 shadow-2xl z-50 space-y-4 backdrop-blur-xl text-left max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  <div className="border-b border-slate-800/80 pb-3 relative">
                    <div className="absolute right-0 top-0 flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          setSelectedConsultant(null);
                          setActiveDashboardTab('notifications');
                          setHamburgerOpen(false);
                        }}
                        className="relative p-1 text-slate-400 hover:text-white bg-slate-900 rounded-lg transition-all border border-slate-800/80 hover:bg-slate-800 active:scale-95 cursor-pointer"
                        title="View Notifications"
                      >
                        <Bell className="w-4 h-4 text-amber-400" />
                        {unreadNotifCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-black font-mono shadow-md border border-slate-950 animate-bounce">
                            {unreadNotifCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setHamburgerOpen(false)}
                        className="p-1 text-slate-400 hover:text-white bg-slate-900 rounded-lg transition-colors border border-slate-800/80 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">CallMint Menu</span>
                    <strong className="text-slate-200 text-sm font-bold block mt-2 pr-12">{currentUser.display_name} (ID: {currentUser.id})</strong>
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-slate-400">
                      <span>Wallet Balance:</span>
                      <span className="text-emerald-400 font-bold font-mono">₹{parseFloat(currentUser.wallet_balance || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 gap-3">
                      <button
                        onClick={onInstallApp}
                        className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-xs font-bold text-slate-950 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-500/10 flex-1 justify-center"
                        title="Download CallMint Web App"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Download Web App</span>
                      </button>

                      <button
                        onClick={onToggleTheme}
                        className="flex items-center justify-center p-2.5 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 transition-all cursor-pointer shadow-sm active:scale-95 h-9.5 w-9.5 shrink-0"
                        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                      >
                        {theme === 'dark' ? (
                          <Sun className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Moon className="w-4 h-4 text-sky-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => {
                        setSelectedConsultant(null);
                        setActiveDashboardTab('advisors');
                        setHamburgerOpen(false);
                      }}
                      className={`group flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'advisors'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <Sparkles className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        activeDashboardTab === 'advisors' ? 'text-slate-950' : 'text-emerald-400'
                      }`} />
                      <span>Browse Advisors</span>
                    </button>

                    <button
                      id="user-profile-tab"
                      onClick={() => {
                        setSelectedConsultant(null);
                        setActiveDashboardTab('profile');
                        setHamburgerOpen(false);
                      }}
                      className={`group flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'profile'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <User className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        activeDashboardTab === 'profile' ? 'text-slate-950' : 'text-emerald-400'
                      }`} />
                      <span>Profile Details</span>
                    </button>

                    <button
                      id="wallet-recharge-tab"
                      onClick={() => {
                        setSelectedConsultant(null);
                        setActiveDashboardTab('wallet');
                        fetchWalletTransactions();
                        setHamburgerOpen(false);
                      }}
                      className={`group flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'wallet'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <Wallet className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        activeDashboardTab === 'wallet' ? 'text-slate-950' : 'text-emerald-400'
                      }`} />
                      <span>Wallet Recharge & Ledger</span>
                    </button>

                    <button
                      id="following-consultants-tab"
                      onClick={() => {
                        setSelectedConsultant(null);
                        setActiveDashboardTab('following');
                        setHamburgerOpen(false);
                      }}
                      className={`group flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'following'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <User className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        activeDashboardTab === 'following' ? 'text-slate-950' : 'text-emerald-400'
                      }`} />
                      <span>Your Following List</span>
                    </button>

                    <button
                      id="chat-history-tab"
                      onClick={() => {
                        setSelectedConsultant(null);
                        setActiveDashboardTab('history');
                        loadPastHistoryFromLocalStorage();
                        setHamburgerOpen(false);
                      }}
                      className={`group flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'history'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <History className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        activeDashboardTab === 'history' ? 'text-slate-950' : 'text-emerald-400'
                      }`} />
                      <span>Consultation History</span>
                    </button>

                    <button
                      id="support-tickets-tab"
                      onClick={() => {
                        setSelectedConsultant(null);
                        setActiveDashboardTab('support');
                        setHamburgerOpen(false);
                      }}
                      className={`group flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'support'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <HelpCircle className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        activeDashboardTab === 'support' ? 'text-slate-950' : 'text-emerald-400'
                      }`} />
                      <span>Customer Support</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedConsultant(null);
                        setActiveDashboardTab('notifications');
                        setHamburgerOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeDashboardTab === 'notifications'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Bell className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeDashboardTab === 'notifications' ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>Notifications</span>
                      </div>
                      {unreadNotifCount > 0 && (
                        <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                          activeDashboardTab === 'notifications' ? 'bg-slate-950 text-emerald-400' : 'bg-rose-500 text-white'
                        }`}>
                          {unreadNotifCount} New
                        </span>
                      )}
                    </button>

                    {onLogout && (
                      <button
                        onClick={() => {
                          setHamburgerOpen(false);
                          onLogout();
                        }}
                        className="flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 border border-transparent hover:border-rose-500/20 mt-2"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Logout</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* TAB CONTENTS */}
      {currentUser && !selectedConsultant && activeDashboardTab === 'profile' && (
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-200">Profile Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDashboardTab('advisors')}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center space-x-1.5 shadow-sm active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
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

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Mobile Number</label>
                <div className="relative flex rounded-xl border border-slate-800 bg-slate-950/60 items-center focus-within:border-emerald-500 transition-colors overflow-hidden opacity-70">
                  <div className="flex items-center pl-3 pr-2 py-2.5 bg-slate-900 border-r border-slate-800 shrink-0 font-mono text-xs font-bold text-slate-500">
                    <Phone className="w-3.5 h-3.5 mr-1" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={editPhone.startsWith('+91') ? editPhone.substring(3) : editPhone}
                    disabled={true}
                    className="w-full bg-transparent border-0 pl-3 pr-4 py-2 text-xs text-slate-400 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-amber-500/80 mt-1 font-mono">
                  🔒 Mobile Number cannot be changed.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Email Address</label>
                <div className="relative flex rounded-xl border border-slate-800 bg-slate-950/60 items-center focus-within:border-emerald-500 transition-colors overflow-hidden opacity-70">
                  <div className="flex items-center pl-3 pr-3 py-2.5 bg-slate-900 border-r border-slate-800 shrink-0 font-mono text-xs font-bold text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={currentUser?.email || ''}
                    disabled={true}
                    className="w-full bg-transparent border-0 pl-3 pr-4 py-2 text-xs text-slate-400 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-amber-500/80 mt-1 font-mono">
                  🔒 Email ID cannot be changed.
                </p>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Profile Photo (Upload a file or enter a direct image link)</label>
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <div className="relative flex-1">
                    <Camera className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Enter image link or upload a file"
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full font-mono"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
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
                    <button
                      type="button"
                      onClick={() => {
                        setEditorImageBase64(undefined);
                        setIsImageEditorOpen(true);
                      }}
                      className="bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 shrink-0"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Crop & Align</span>
                    </button>
                  </div>
                </div>
                {editPhotoUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 max-w-sm font-sans">
                    <img
                      src={editPhotoUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-800 cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => setLightboxImage(editPhotoUrl)}
                      title="Click to view photo"
                      onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }}
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Live Preview</span>
                      <span className="text-[9px] text-emerald-400 font-mono block truncate max-w-[200px]">{editPhotoUrl}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile photos presets bar */}
            <div className="space-y-3.5 text-left bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 max-w-2xl">
              <div>
                <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider mb-1.5">Classic Static Avatars</span>
                <div className="flex flex-wrap gap-2">
                  {(classicAvatars.length > 0 ? classicAvatars : [
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
                  ]).map((preset, idx) => (
                    <button
                      key={`classic-${idx}`}
                      type="button"
                      onClick={() => setEditPhotoUrl(preset)}
                      className={`w-9 h-9 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${editPhotoUrl === preset ? 'border-emerald-500' : 'border-transparent'}`}
                    >
                      <img src={preset} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-3 pt-4 text-center">
              <button
                type="submit"
                disabled={profileSaving}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center space-x-1 shrink-0 shadow-md active:scale-95"
              >
                <span>{profileSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDashboardTab('advisors')}
                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold py-2.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 shadow-md active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Go Back</span>
              </button>
            </div>

            {(error || success) && (
              <div className="flex justify-center pt-2">
                {error && (
                  <div className="bg-rose-500/10 border-l-4 border-rose-500 py-2 px-3 rounded-r-xl text-rose-200 text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-emerald-500/10 border-l-4 border-emerald-500 py-2 px-3 rounded-r-xl text-emerald-200 text-xs flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{success}</span>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {currentUser && !selectedConsultant && activeDashboardTab === 'wallet' && (
        <div className="space-y-6 font-jakarta">
          {/* Second Section: Recharge & Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT Panel: Modern Recharge Gateway */}
            <div className="lg:col-span-5 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 space-y-5 flex flex-col justify-between lg:self-start self-stretch">
              
              {/* Wallet Balance Display Card */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-850 flex items-center justify-between text-left gap-3 w-full shadow-inner">
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <span className="text-[11px] sm:text-xs font-extrabold text-slate-400 block uppercase tracking-wider truncate">Wallet Balance</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight flex items-baseline">
                    <span className="text-emerald-500 font-bold text-sm sm:text-lg mr-1">₹</span>
                    {parseFloat(currentUser.wallet_balance || 0).toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDashboardTab('advisors')}
                  className="text-[9px] sm:text-xs font-bold text-slate-300 hover:text-slate-100 transition-all bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center space-x-1 sm:space-x-1.5 shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                  <span>Back to Advisors</span>
                </button>
              </div>

              {/* Recharge Amount Section Header */}
              <div className="space-y-1.5 text-left border-t border-slate-800/60 pt-4">
                <div className="flex items-center space-x-1.5">
                  <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-100 uppercase tracking-wide">Recharge Amount</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter custom amount or pick a preset below. Balances will be deducted strictly on a per-minute base only.
                </p>
              </div>

              {/* Presets Selection Grid */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Choose Preset Amount</span>
                <div className="grid grid-cols-4 gap-2">
                  {['100', '250', '500', '1000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                        rechargeAmount === amt
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input Panel */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Or Enter Custom Amount</span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-[11px] text-xs font-mono text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      placeholder="Custom Amount"
                      className="bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 w-full font-mono font-bold text-emerald-400"
                    />
                  </div>
                </div>
              </div>

              {/* Live Invoice Breakdown Sheet */}
              {rechargeAmount && parseFloat(rechargeAmount) > 0 ? (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-xs font-mono space-y-2.5 text-left shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/40 to-transparent"></div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block mb-1">Receipt Summary Estimator</span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recharge Amount:</span>
                    <span className="text-slate-300 font-bold">₹{parseFloat(rechargeAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GST (18%):</span>
                    <span className="text-slate-400">₹{(parseFloat(rechargeAmount) * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-800 my-2"></div>
                  <div className="flex justify-between font-black text-emerald-400 text-sm">
                    <span>Total Recharge Amount:</span>
                    <span>₹{(parseFloat(rechargeAmount) * 1.18).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850/50 text-center text-xs text-slate-500 font-mono py-6">
                  Select or enter amount above to calculate GST details
                </div>
              )}

              {/* Proceed Action Button */}
              <button
                type="button"
                onClick={() => handleQuickRecharge(rechargeAmount)}
                disabled={rechargeLoading || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 text-slate-950 font-black py-3 rounded-xl text-xs transition-all tracking-wider shadow-lg hover:shadow-emerald-500/10 active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
              >
                {rechargeLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Launching Payment Gateway...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 text-slate-950" />
                    <span>Proceed To Pay</span>
                  </>
                )}
              </button>
            </div>

            {/* RIGHT Panel: Transaction Ledger */}
            <div className="lg:col-span-7 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 space-y-6 self-stretch">
              <div className="border-b border-slate-850 pb-4 text-left w-full">
                {/* Row for Icon and Title */}
                <div className="flex items-center space-x-3 mb-2.5">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <h4 className="font-black text-lg sm:text-xl text-slate-100 tracking-tight">
                    Transaction Ledger
                  </h4>
                </div>
                {/* Subtitle with professional gap and sizing */}
                <p className="text-xs text-slate-400 font-sans leading-relaxed pl-1 mt-2">
                  All recharges, consultation debits, and refunds logged in audit logs.
                </p>
              </div>

              {/* ledger statement filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
                {(['all', 'recharge', 'consultation', 'refund', 'admin_credit'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setWalletTxFilter(type)}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-sans font-semibold border transition-all shrink-0 cursor-pointer ${
                      walletTxFilter === type
                        ? 'bg-slate-100 text-slate-950 border-slate-200 shadow-sm'
                        : 'bg-slate-950/60 text-slate-400 border-slate-850 hover:text-slate-200'
                    }`}
                  >
                    {type === 'all' ? 'All' :
                     type === 'recharge' ? 'Recharges' :
                     type === 'consultation' ? 'Consultations' :
                     type === 'refund' ? 'Refunds' : 'Special credits'}
                  </button>
                ))}
              </div>

              {/* Transactions list container */}
              {loadingTransactions ? (
                <div className="text-center py-24 text-xs text-slate-500 font-mono flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span>Retrieving secure ledger records...</span>
                </div>
              ) : (() => {
                const filteredTx = walletTransactions.filter(tx => {
                  if (walletTxFilter === 'all') return true;
                  if (walletTxFilter === 'recharge') return tx.type === 'recharge';
                  if (walletTxFilter === 'consultation') return tx.type === 'consultation';
                  if (walletTxFilter === 'refund') return tx.type === 'refund';
                  if (walletTxFilter === 'admin_credit') return tx.type === 'admin_credit';
                  return true;
                });

                if (filteredTx.length === 0) {
                  return (
                    <div className="text-center py-20 text-xs text-slate-500 bg-slate-950/40 border border-slate-850 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center space-y-3">
                      <FileText className="w-8 h-8 text-slate-600" />
                      <div>
                        <span className="font-bold text-slate-400">No matching statement found</span>
                        <p className="text-[10px] text-slate-500 mt-1">There are no records matching your selected filter tab.</p>
                      </div>
                    </div>
                  );
                }

                // Group by date label helper
                const getGroupLabel = (dateStr: string) => {
                  try {
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return "Other";
                    const today = new Date();
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);

                    if (d.toDateString() === today.toDateString()) {
                      return "Today";
                    } else if (d.toDateString() === yesterday.toDateString()) {
                      return "Yesterday";
                    } else {
                      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    }
                  } catch (e) {
                    return "Other";
                  }
                };

                // Group transactions
                const groupedTransactions: { [key: string]: typeof filteredTx } = {};
                filteredTx.forEach(tx => {
                  const label = getGroupLabel(tx.created_at);
                  if (!groupedTransactions[label]) {
                    groupedTransactions[label] = [];
                  }
                  groupedTransactions[label].push(tx);
                });

                return (
                  <div className="space-y-6">
                    {Object.keys(groupedTransactions).map((groupLabel) => (
                      <div key={groupLabel} className="space-y-2.5 text-left">
                        {/* A small muted section label above each date group */}
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pl-1 font-sans">
                          {groupLabel}
                        </div>

                        <div className="space-y-3">
                          {groupedTransactions[groupLabel].map((tx) => {
                            const baseAmt = parseFloat(tx.amount || 0);
                            const gstRateVal = tx.gst_rate || 18.0;
                            const gstAmt = tx.gst_amount !== undefined && tx.gst_amount !== null && tx.gst_amount !== 0 ? parseFloat(tx.gst_amount) : parseFloat((baseAmt * 0.18).toFixed(2));
                            const totalPaidVal = tx.total_paid !== undefined && tx.total_paid !== null && tx.total_paid !== 0 ? parseFloat(tx.total_paid) : parseFloat((baseAmt + gstAmt).toFixed(2));

                            return (
                              <div 
                                key={tx.id} 
                                className="bg-slate-950/45 p-4 rounded-2xl border border-slate-800/80 space-y-3 hover:border-slate-700/80 transition-all shadow-sm"
                              >
                                {/* Top Row: icon badge, short category pill, and tx ID aligned right */}
                                <div className="flex items-center gap-2">
                                  {/* Type Icon Indicator */}
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                                    tx.type === 'recharge' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                                    tx.type === 'admin_credit' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
                                    tx.type === 'refund' ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                                  }`}>
                                    {tx.type === 'recharge' && <ArrowUpRight className="w-3.5 h-3.5" />}
                                    {tx.type === 'admin_credit' && <Sparkles className="w-3.5 h-3.5" />}
                                    {tx.type === 'refund' && <RefreshCw className="w-3.5 h-3.5" />}
                                    {tx.type === 'consultation' && <ArrowDownLeft className="w-3.5 h-3.5" />}
                                  </div>

                                  {/* Sentence case category badge/pill */}
                                  <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${
                                    tx.type === 'recharge' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15' :
                                    tx.type === 'admin_credit' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/15' :
                                    tx.type === 'refund' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/15' : 'text-rose-400 bg-rose-500/10 border border-rose-500/15'
                                  }`}>
                                    {tx.type === 'recharge' ? 'Recharge' :
                                     tx.type === 'consultation' ? 'Consultation' :
                                     tx.type === 'refund' ? 'Refund' :
                                     tx.type === 'admin_credit' ? 'Special credit' : 'Transaction'}
                                  </span>

                                  {/* Tx ID aligned to the right of that same row */}
                                  <span className="ml-auto text-[10px] text-slate-500 font-mono font-bold">
                                    #{tx.id}
                                  </span>
                                </div>

                                {/* Middle Row: Bold one-line description of the transaction */}
                                <p className="text-xs sm:text-sm font-bold text-slate-200 font-sans tracking-tight text-left leading-relaxed">
                                  {tx.description}
                                </p>

                                {/* If recharge, show GST and total breakdowns */}
                                {tx.type === 'recharge' && (
                                  <div className="text-[9px] text-slate-400 font-mono bg-slate-900/40 p-2.5 rounded-xl border border-slate-850 space-y-1">
                                    <div className="flex justify-between">
                                      <span>Base Recharge credit:</span>
                                      <span className="text-slate-300">₹{baseAmt.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>GST ({gstRateVal}%):</span>
                                      <span className="text-slate-300">₹{gstAmt.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-dashed border-slate-800/80 pt-1 font-bold text-emerald-400">
                                      <span>Total Recharge Amount:</span>
                                      <span>₹{totalPaidVal.toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Bottom Row: timestamp on the left and amount on the right */}
                                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-900/60">
                                  {/* Timestamp */}
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                  </span>

                                  {/* Right side controls / amounts */}
                                  <div className="flex items-center gap-3 shrink-0">
                                    {tx.type === 'recharge' && (
                                      <button
                                        type="button"
                                        onClick={() => downloadInvoice(tx, currentUser)}
                                        className="bg-slate-900 hover:bg-slate-850 text-emerald-400 hover:text-emerald-300 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-bold font-sans flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                      >
                                        <Download className="w-3 h-3 text-emerald-400" />
                                        <span>Invoice</span>
                                      </button>
                                    )}
                                    <div className={`font-mono text-xs sm:text-sm font-black ${
                                      tx.type === 'consultation' ? 'text-rose-400' : 'text-emerald-400'
                                    }`}>
                                      {tx.type === 'consultation' ? '-' : '+'}₹{baseAmt.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {currentUser && !selectedConsultant && activeDashboardTab === 'history' && (
        <div className="bg-slate-900/40 p-4 sm:p-6 rounded-3xl border border-slate-800/80 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-200">Consultation History</h3>
            </div>
            <button
              onClick={() => setActiveDashboardTab('advisors')}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {!viewingPastSessionMessages ? (
            <div className="space-y-6">
              {/* Search and Filter query block */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-2xl text-left">
                <div className="space-y-2 flex-1">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Search By Consultant Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter consultant name to search past history..."
                      value={historySearchName}
                      onChange={(e) => setHistorySearchName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                    />
                    <button
                      onClick={() => {
                        setIsSearchingHistory(true);
                        setTimeout(() => {
                          setIsSearchingHistory(false);
                        }, 200);
                      }}
                      disabled={isSearchingHistory}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold px-4 rounded-xl transition-all flex items-center justify-center min-w-[80px]"
                    >
                      {isSearchingHistory ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 min-w-[150px]">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span>Filter Status</span>
                  </label>
                  <div className="relative flex items-center">
                    <select
                      value={historyStatusFilter}
                      onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer pr-8 font-medium"
                    >
                      <option value="all">All</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="missed">Missed</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* List of sessions */}
              {(() => {
                const filteredSessions = userPastSessions.filter(sess => {
                  const matchesName = !historySearchName.trim() || 
                    getConsultantNameOfSession(sess).toLowerCase().includes(historySearchName.trim().toLowerCase());
                  
                  const matchesStatus = historyStatusFilter === 'all' || 
                    String(sess.status).toLowerCase() === historyStatusFilter;

                  return matchesName && matchesStatus;
                });

                return (
                  <div className="space-y-3 text-left">
                    <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Consultation log sessions ({filteredSessions.length})</span>
                    {filteredSessions.length === 0 ? (
                      <p className="text-xs text-slate-500 py-16 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60 font-sans leading-relaxed">
                        {historySearchName.trim() || historyStatusFilter !== 'all' ? "No sessions found matching current search or status filter." : "No past consultations logged."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {filteredSessions.map((sess) => {
                          const consName = getConsultantNameOfSession(sess);
                          return (
                            <div
                              key={sess.id}
                              className="relative overflow-hidden bg-slate-950/80 hover:bg-slate-900 p-4 rounded-2xl border border-slate-850 hover:border-emerald-500/30 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left group"
                            >
                              {/* Details */}
                              <div className="space-y-2 flex-1 min-w-0 w-full">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-black text-slate-100 truncate max-w-[150px] sm:max-w-[200px]" title={consName}>
                                    {consName}
                                  </span>
                                  <span className="text-[9px] font-mono font-bold bg-slate-900 text-emerald-400 px-2 py-0.5 rounded-lg border border-slate-800/50">
                                    ID: #{sess.id}
                                  </span>
                                </div>

                          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-extrabold">Status:</span>
                            {sess.status === 'active' ? (
                              <span className="inline-flex items-center text-[9px] font-mono font-black bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 animate-pulse">
                                ● Live Active
                              </span>
                            ) : sess.status === 'completed' ? (
                              <span className="inline-flex items-center text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                ✓ Completed
                              </span>
                            ) : sess.status === 'missed' ? (
                              <span className="inline-flex items-center text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                                ⚠ Missed
                              </span>
                            ) : sess.status === 'rejected' ? (
                              <span className="inline-flex items-center text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">
                                ✕ Rejected
                              </span>
                            ) : sess.status === 'cancelled' ? (
                              <span className="inline-flex items-center text-[9px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                                ✕ Cancelled
                              </span>
                            ) : sess.status === 'queued' ? (
                              <span className="inline-flex items-center text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                                🕒 Queued
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                                🕒 Pending
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span>{new Date(sess.created_at).toLocaleString()}</span>
                            </span>
                            <span className="text-slate-700 hidden sm:inline">•</span>
                            <span className="flex items-center space-x-1 font-mono text-[10px] bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800/20">
                              <span>Duration:</span>
                              <strong className="text-slate-200">{sess.duration_minutes}m</strong>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="inline-flex items-center space-x-1 text-[10.5px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-lg border border-emerald-500/15 font-mono">
                              <span>₹{parseFloat(sess.total_paid || 0).toFixed(2)} deducted</span>
                            </span>
                          </div>

                          {sess.rating && (
                            <div className="flex items-center space-x-2 mt-2 bg-slate-900/40 p-2 rounded-xl border border-slate-800/40 w-fit max-w-full">
                              <div className="flex items-center text-amber-400 shrink-0">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${i < sess.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-800'}`}
                                  />
                                ))}
                              </div>
                              {sess.review_text && (
                                <span className="text-[10px] text-slate-300 italic font-sans truncate max-w-[140px] sm:max-w-[200px]" title={sess.review_text}>
                                  "{sess.review_text}"
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Side: Action Buttons */}
                        <div className="flex sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                          {!(sess.status === 'rejected' || sess.status === 'cancelled' || sess.status === 'missed') && (
                            <button
                              onClick={() => {
                                onSelectSession(sess.id, currentUser?.display_name || currentUser?.username || 'User', 'user', true);
                              }}
                              className="flex-1 md:flex-none bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-black px-4 py-2.5 rounded-xl transition-all border border-emerald-500/15 hover:border-emerald-500/30 text-center flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>View Chat</span>
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              try {
                                let cons = consultants.find(c => c.id === sess.consultant_id);
                                if (!cons) {
                                  const res = await fetch(`/api/consultants/${sess.consultant_id}/profile`);
                                  if (res.ok) {
                                    cons = await res.json();
                                  }
                                }
                                if (cons) {
                                  fetchFullProfile(cons);
                                } else {
                                  alert("This consultant is no longer active or available.");
                                }
                              } catch (err) {
                                console.error("Error redirecting to consultant profile:", err);
                              }
                            }}
                            className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all text-center flex items-center justify-center space-x-1.5 shadow-md active:scale-95 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Chat Again</span>
                          </button>
                        </div>
                      </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
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
                <strong className="text-sm text-slate-100">{getConsultantNameOfSession(viewingPastSessionInfo)}</strong>
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
                          {msg.text && msg.text.startsWith('[VOICE_NOTE]:') ? (
                            <div className="flex flex-col space-y-1.5 py-1 min-w-[200px] sm:min-w-[240px]">
                              <div className={`flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-wider ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                                <span>🎙️ Voice Note</span>
                              </div>
                              <audio
                                controls
                                controlsList="nodownload"
                                onContextMenu={(e) => e.preventDefault()}
                                src={msg.text.substring('[VOICE_NOTE]:'.length)}
                                className="w-full h-8 outline-none filter invert brightness-100 contrast-125"
                              />
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.text}</p>
                          )}
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
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-200">Customer Support</h3>
            </div>
            <button
              onClick={() => setActiveDashboardTab('advisors')}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Raise a Ticket */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-widest">Raise a New Support Ticket</h4>
              <p className="text-xs text-slate-400">
                Do you have a question or encountered a problem? Please fill out the form below and our support team will respond shortly.
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
                        Chat with {getConsultantNameOfSession(s)} ({new Date(s.created_at).toLocaleDateString()}) - Status: {s.status}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Please select the chat session you need assistance with so we can help you better.
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
                  {/* Search and Filter query block */}
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 text-left">
                    <div className="space-y-2 flex-1">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Search By Consultant Name</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter consultant name to search past history..."
                          value={historySearchName}
                          onChange={(e) => setHistorySearchName(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                        />
                        <button
                          onClick={() => {
                            setIsSearchingHistory(true);
                            setTimeout(() => {
                              setIsSearchingHistory(false);
                            }, 200);
                          }}
                          disabled={isSearchingHistory}
                          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold px-4 rounded-xl transition-all flex items-center justify-center min-w-[80px]"
                        >
                          {isSearchingHistory ? 'Searching...' : 'Search'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 min-w-[150px]">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Filter className="w-3 h-3 text-slate-400" />
                        <span>Filter Status</span>
                      </label>
                      <div className="relative flex items-center">
                        <select
                          value={historyStatusFilter}
                          onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer pr-8 font-medium"
                        >
                          <option value="all">All</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="missed">Missed</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-slate-500">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* List of sessions */}
                  {(() => {
                    const filteredSessions = userPastSessions.filter(sess => {
                      const matchesName = !historySearchName.trim() || 
                        getConsultantNameOfSession(sess).toLowerCase().includes(historySearchName.trim().toLowerCase());
                      
                      const matchesStatus = historyStatusFilter === 'all' || 
                        String(sess.status).toLowerCase() === historyStatusFilter;

                      return matchesName && matchesStatus;
                    });

                    return (
                      <div className="space-y-3">
                        <span className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider text-left">Consultation log sessions ({filteredSessions.length})</span>
                        {filteredSessions.length === 0 ? (
                          <p className="text-xs text-slate-500 py-12 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/60 font-sans leading-relaxed">
                            {historySearchName.trim() || historyStatusFilter !== 'all' ? "No sessions found matching current search or status filter." : "No past consultations logged."}
                          </p>
                        ) : (
                          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                            {filteredSessions.map((sess) => {
                              const consName = getConsultantNameOfSession(sess);
                              return (
                                <div
                                  key={sess.id}
                                  className="relative overflow-hidden bg-slate-950/80 hover:bg-slate-900 p-4 rounded-2xl border border-slate-850 hover:border-emerald-500/30 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left group"
                                >
                                  {/* Details */}
                                  <div className="space-y-2 flex-1 min-w-0 w-full">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-black text-slate-100 truncate max-w-[140px] sm:max-w-[180px]" title={consName}>
                                        {consName}
                                      </span>
                                <span className="text-[9px] font-mono font-bold bg-slate-900 text-emerald-400 px-2 py-0.5 rounded-lg border border-slate-800/50">
                                  ID: #{sess.id}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-extrabold">Status:</span>
                                {sess.status === 'active' ? (
                                  <span className="inline-flex items-center text-[9px] font-mono font-black bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 animate-pulse">
                                    ● Live Active
                                  </span>
                                ) : sess.status === 'completed' ? (
                                  <span className="inline-flex items-center text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    ✓ Completed
                                  </span>
                                ) : sess.status === 'missed' ? (
                                  <span className="inline-flex items-center text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    ⚠ Missed
                                  </span>
                                ) : sess.status === 'rejected' ? (
                                  <span className="inline-flex items-center text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20">
                                    ✕ Rejected
                                  </span>
                                ) : sess.status === 'cancelled' ? (
                                  <span className="inline-flex items-center text-[9px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                                    ✕ Cancelled
                                  </span>
                                ) : sess.status === 'queued' ? (
                                  <span className="inline-flex items-center text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                                    🕒 Queued
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                                    🕒 Pending
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{new Date(sess.created_at).toLocaleString()}</span>
                                </span>
                                <span className="text-slate-700 hidden sm:inline">•</span>
                                <span className="flex items-center space-x-1 font-mono text-[10px] bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800/20">
                                  <span>Duration:</span>
                                  <strong className="text-slate-200">{sess.duration_minutes}m</strong>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <span className="inline-flex items-center space-x-1 text-[10.5px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-lg border border-emerald-500/15 font-mono">
                                  <span>₹{parseFloat(sess.total_paid || 0).toFixed(2)} deducted</span>
                                </span>
                              </div>

                              {sess.rating && (
                                <div className="flex items-center space-x-2 mt-2 bg-slate-900/40 p-2 rounded-xl border border-slate-800/40 w-fit max-w-full">
                                  <div className="flex items-center text-amber-400 shrink-0">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3 h-3 ${i < sess.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-800'}`}
                                      />
                                    ))}
                                  </div>
                                  {sess.review_text && (
                                    <span className="text-[10px] text-slate-300 italic font-sans truncate max-w-[140px] sm:max-w-[180px]" title={sess.review_text}>
                                      "{sess.review_text}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right Side: Action Buttons */}
                            <div className="flex sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                              {!(sess.status === 'rejected' || sess.status === 'cancelled' || sess.status === 'missed') && (
                                <button
                                  onClick={() => {
                                    onSelectSession(sess.id, currentUser?.display_name || currentUser?.username || 'User', 'user', true);
                                  }}
                                  className="flex-1 md:flex-none bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-black px-4 py-2.5 rounded-xl transition-all border border-emerald-500/15 hover:border-emerald-500/30 text-center flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>View Chat</span>
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    setShowHistoryModal(false);
                                    let cons = consultants.find(c => c.id === sess.consultant_id);
                                    if (!cons) {
                                      const res = await fetch(`/api/consultants/${sess.consultant_id}/profile`);
                                      if (res.ok) {
                                        cons = await res.json();
                                      }
                                    }
                                    if (cons) {
                                      fetchFullProfile(cons);
                                    } else {
                                      alert("This consultant is no longer active or available.");
                                    }
                                  } catch (err) {
                                    console.error("Error redirecting to consultant profile:", err);
                                  }
                                }}
                                className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all text-center flex items-center justify-center space-x-1.5 shadow-md active:scale-95 cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Chat Again</span>
                              </button>
                            </div>
                          </div>
                              );
                            })}
                          </div>
                        )}
                  </div>
                );
              })()}
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
                    <strong className="text-sm text-slate-100">{getConsultantNameOfSession(viewingPastSessionInfo)}</strong>
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
                              {msg.text && msg.text.startsWith('[VOICE_NOTE]:') ? (
                                <div className="flex flex-col space-y-1.5 py-1 min-w-[200px] sm:min-w-[240px]">
                                  <div className={`flex items-center space-x-1.5 text-[10px] font-mono uppercase tracking-wider ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                                    <span>🎙️ Voice Note</span>
                                  </div>
                                  <audio
                                    controls
                                    controlsList="nodownload"
                                    onContextMenu={(e) => e.preventDefault()}
                                    src={msg.text.substring('[VOICE_NOTE]:'.length)}
                                    className="w-full h-8 outline-none filter invert brightness-100 contrast-125"
                                  />
                                </div>
                              ) : (
                                <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.text}</p>
                              )}
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

      {/* Consultant Busy & Queue Joining Warning Modal */}
      {showBusyWarningModal && selectedConsultant && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-amber-400">
                <Clock className="w-5 h-5 animate-pulse" />
                <h3 className="font-extrabold text-slate-100 text-base">Consultant is Busy</h3>
              </div>
              <button
                onClick={() => setShowBusyWarningModal(false)}
                className="text-slate-400 hover:text-white bg-slate-950/40 p-2 border border-slate-800 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-5 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-2 text-center">
                <span className="text-amber-400 font-bold block text-sm">⚠️ Your consultant is busy right now!</span>
                <span className="text-slate-300 text-xs block font-semibold leading-relaxed">
                  (Aapke consultant abhi dusre user ke sath busy hain.)
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3.5 text-center">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Current Active Chat Timer:</span>
                  <strong className="text-3xl font-mono text-rose-400 block tracking-widest animate-pulse">
                    {Math.floor(busyWarningTickingSeconds / 60).toString().padStart(2, '0')}:{(busyWarningTickingSeconds % 60).toString().padStart(2, '0')}
                  </strong>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  You will be able to connect once the timer gets over.
                  <span className="text-emerald-400 block mt-1 font-bold">
                    (Jaise hi current chat timer khatam hoga, aap automatic connect ho jayenge.)
                  </span>
                </p>
              </div>

              {busyConsultantQueueData && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">Users in Queue</span>
                    <strong className="text-sm font-mono text-amber-400 block mt-0.5">
                      {busyConsultantQueueData.queue_count} Active
                    </strong>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850 text-center">
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">Est. Wait Time</span>
                    <strong className="text-sm font-mono text-emerald-400 block mt-0.5">
                      {Math.ceil(busyConsultantQueueData.total_wait_time_seconds / 60)} Mins
                    </strong>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed text-center font-sans">
                Aap abhi balance pay karke Queue join kar sakte hain. First chat khatam hone ke 10 seconds baad aapko call request chali jayegi.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowBusyWarningModal(false)}
                  className="bg-slate-950 hover:bg-slate-950/80 border border-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel / Wait
                </button>
                <button
                  onClick={async () => {
                    setShowBusyWarningModal(false);
                    if (pendingPaymentMethod === 'razorpay') {
                      await handleInitiateDirectRazorpayPayment(true);
                    } else {
                      await handleInitiateWalletPayment(true);
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 shadow-md"
                >
                  <span>Pay & Join Queue</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Blocked Consultant Privacy / Policy Warning Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-100">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-rose-500">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <h3 className="font-extrabold text-slate-100 text-base">Privacy Restriction</h3>
              </div>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="text-slate-400 hover:text-white bg-slate-950/40 p-2 border border-slate-800 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-5 space-y-4 text-center">
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-2">
                <span className="text-rose-400 font-bold block text-sm">⚠️ Connection Restricted</span>
                <p className="text-slate-300 text-xs font-semibold leading-relaxed">
                  You cannot connect to <strong className="text-slate-100 font-bold">"{blockedConsultantName}"</strong> due to some privacy breach. Thank you.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  (Aap is consultant ke sath privacy ya policy niyam ke chalte connect nahi kar sakte hain.)
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowBlockedModal(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 py-3 rounded-xl text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
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
                <Wallet className="w-5 h-5 text-emerald-400" />
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

      {currentUser && !selectedConsultant && activeDashboardTab === 'following' && (
        <div className="bg-slate-900/40 p-5 sm:p-6 rounded-3xl border border-slate-800/80 space-y-6 text-left" id="user-following-panel">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">Your following list</h3>
                <p className="text-xs text-slate-500">Consultants whom you follow on CallMint</p>
              </div>
            </div>

            {/* Full-width Browse More Advisors button on mobile, auto on desktop */}
            <button
              onClick={() => setActiveDashboardTab('advisors')}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-extrabold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer sm:w-auto w-full"
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Browse more advisors</span>
            </button>
          </div>

          {/* Loader */}
          {followingLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 font-mono">Loading your following list...</p>
            </div>
          ) : followingList.length === 0 ? (
            /* Empty state */
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-2xl inline-block">
                <User className="w-12 h-12 text-slate-600 mx-auto" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-300">Aap kisi ko follow nahi kar rahe hai</h4>
                <p className="text-xs text-slate-500">Go to Advisor Directory and click "+ Follow" to keep track of your favorite consultants.</p>
              </div>
              <button
                onClick={() => setActiveDashboardTab('advisors')}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Browse Advisors
              </button>
            </div>
          ) : (
            /* Desktop/Mobile Responsive Grid */
            /* Desktop/Mobile Responsive Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {followingList.map((cons: any) => {
                const totalFollowers = (cons.followers_count || 0) + (cons.manual_followers_count || 0);
                return (
                  <div
                    key={cons.id}
                    className={`p-5 rounded-[14px] flex flex-col justify-between gap-4 shadow-md transition-all duration-300 hover:shadow-lg ${
                      theme === 'light'
                        ? 'bg-sky-100/60 border border-sky-200/85 hover:border-sky-300/90 hover:bg-sky-100/85 shadow-sky-100/40'
                        : 'bg-[#0B1528] border border-slate-800/80 hover:border-slate-700/80 shadow-md'
                    }`}
                  >
                    {/* Upper block */}
                    <div className="flex gap-3.5 items-start">
                      {/* Square-rounded avatar with status dot */}
                      <div className="relative shrink-0">
                        {cons.photo_url ? (
                          <img
                            src={cons.photo_url}
                            alt={cons.display_name}
                            className={`w-[52px] h-[52px] rounded-xl object-cover border ${
                              theme === 'light' ? 'border-sky-200/80' : 'border-slate-800/90'
                            }`}
                            referrerPolicy="no-referrer"
                            onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'; }}
                          />
                        ) : (
                          <div className={`w-[52px] h-[52px] rounded-xl font-black text-sm flex items-center justify-center font-mono ${
                            theme === 'light'
                              ? 'bg-sky-200/60 border border-sky-300/60 text-indigo-600'
                              : 'bg-slate-900 border border-slate-800/90 text-indigo-400'
                          }`}>
                            {cons.display_name?.slice(0, 1)}
                          </div>
                        )}
                        {/* status dot */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                          theme === 'light' ? 'border-sky-100' : 'border-[#0B1528]'
                        } ${
                          cons.is_online === 1
                            ? cons.is_busy === 1 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                            : 'bg-slate-600'
                        }`} />
                      </div>

                      {/* Info section */}
                      <div className="min-w-0 flex-1 space-y-0.5 text-left">
                        <div className="flex items-center gap-1">
                          <h4 className={`font-medium text-xs truncate ${
                            theme === 'light' ? 'text-slate-100' : 'text-slate-100'
                          }`}>{cons.display_name}</h4>
                          <span className="bg-sky-500/15 text-sky-400 p-0.5 rounded-full border border-sky-500/25 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-3 h-3 fill-sky-500 text-slate-950" />
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-slate-500">@{cons.username}</p>

                        {/* Pills row */}
                        <div className="flex items-center gap-2 pt-1.5">
                          {/* Soft blue tint role tag */}
                          <span className={`border text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                            theme === 'light'
                              ? 'bg-blue-500/15 text-blue-700 border-blue-400/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {normalizeCategory(cons.category || 'consultant').toLowerCase().replace(/s$/, '')}
                          </span>
                          {/* Neutral gray tint rate */}
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                            theme === 'light'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            ₹{cons.price_per_minute}/min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thin horizontal divider */}
                    <div className={`border-t w-full ${
                      theme === 'light' ? 'border-sky-200/60' : 'border-slate-800/80'
                    }`} />

                    {/* Footer row */}
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      {/* Only the followers count is shown, icon and "followers" text removed */}
                      <span className={`text-[11px] font-bold font-mono shrink-0 ${
                        theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        {totalFollowers}
                      </span>

                      {/* Action buttons nicely aligned with gap */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Outlined unfollow */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(`/api/user/unfollow`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: currentUser.id, consultantId: cons.id })
                              });
                              if (res.ok) {
                                setFollowingList(prev => prev.filter(item => item.id !== cons.id));
                                setConsultants(prevList => prevList.map(c => {
                                  if (c.id === cons.id) {
                                    return {
                                      ...c,
                                      is_following: 0,
                                      followers_count: Math.max(0, ((c as any).followers_count || 1) - 1)
                                    };
                                  }
                                  return c;
                                }));
                              }
                            } catch (err) {
                              console.error("Error unfollowing:", err);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                            theme === 'light'
                              ? 'text-rose-600 hover:text-rose-700 border border-rose-300/50 hover:bg-rose-50'
                              : 'text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/5'
                          }`}
                        >
                          Unfollow
                        </button>

                        {/* Solid indigo view profile (smaller padding so it never overflows or merges) */}
                        <button
                          onClick={() => fetchFullProfile(cons)}
                          className="px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {currentUser && !selectedConsultant && activeDashboardTab === 'notifications' && (
        <div className="bg-slate-900/40 p-6 sm:p-8 rounded-3xl border border-slate-800/80 space-y-6 text-left" id="user-notifications-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850">
            <div className="flex items-center space-x-2.5">
              <div className="bg-amber-500/15 p-2 rounded-xl border border-amber-500/20 text-amber-400">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-100">Notifications</h3>
                <p className="text-xs text-slate-400">Official updates, account announcements, and alert logs.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 px-3.5 py-2 rounded-xl border border-emerald-500/20 cursor-pointer"
                >
                  Mark All As Read ✓
                </button>
              )}
              <button
                onClick={() => setActiveDashboardTab('advisors')}
                className="text-xs font-bold text-slate-300 hover:text-slate-100 transition-all bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl px-4 py-2 flex items-center space-x-2 shadow-md active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Back to Advisors</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {clientNotifications.length === 0 ? (
              <div className="text-center py-20 bg-slate-950/40 border border-slate-850 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center space-y-3">
                <Bell className="w-8 h-8 text-slate-600" />
                <div>
                  <span className="font-bold text-slate-400">No Notifications Yet</span>
                  <p className="text-[10px] text-slate-500 mt-1">We'll alert you here when there are new updates or announcements.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clientNotifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={`p-5 rounded-2xl border transition-all relative ${
                      n.is_read
                        ? 'bg-slate-950/40 border-slate-850/60 opacity-80'
                        : 'bg-slate-900/90 border-emerald-500/20 shadow-lg shadow-emerald-500/[0.02]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[8px] font-black font-mono tracking-wider px-2 py-0.5 rounded-full ${
                          n.is_read
                            ? 'text-slate-500 bg-slate-950 border border-slate-850'
                            : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15'
                        }`}>
                          {n.is_read ? 'READ' : 'NEW UPDATE'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="text-[10px] font-mono font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/15 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                        >
                          Mark as Read ✓
                        </button>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-200 mb-1">{n.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. SHOW PUBLIC DIRECTORY OF CONSULTANTS */}
      {!selectedConsultant && (!currentUser || activeDashboardTab === 'advisors') && (
        currentUser ? (
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
              <>
                {/* Desktop Hero Section */}
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
                  className="hidden md:block relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-8 md:p-12 rounded-3xl text-center space-y-4 max-w-4xl mx-auto overflow-hidden shadow-2xl group cursor-default"
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
                </motion.div>

                {/* Mobile Hero Section (Rounded-2xl/16px, slightly tinted dark-teal background and thin border, centered content) */}
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="block md:hidden bg-[#042424]/45 border border-teal-500/20 p-6 rounded-2xl text-center space-y-3 max-w-md mx-auto overflow-hidden relative"
                >
                  {/* Subtle teal background accent */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.08),transparent_70%)] pointer-events-none" />

                  {/* Centered live chat portal badge */}
                  <div className="inline-flex items-center gap-1.5 bg-teal-500/10 text-teal-300 border border-teal-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mx-auto">
                    <Zap className="w-3.5 h-3.5 text-teal-400 fill-teal-400/25" />
                    <span>Live chat consultation portal</span>
                  </div>

                  {/* Bold headline (24px, medium weight) */}
                  <h2 className="text-2xl font-medium text-slate-100 tracking-tight leading-snug">
                    Consult with India's elite specialists and advisors
                  </h2>

                  {/* Short muted 2-3 line description */}
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Real-time live chat with professional consultants, astrologers, coaches, and legal mentors. Start secure, private sessions instantly.
                  </p>
                </motion.div>
              </>
            );
          })()}

          {/* Category selection tabs (Desktop: wrap row, Mobile: Horizontal scroll) */}
          <div className="hidden md:flex flex-wrap items-center justify-center gap-2">
            {['All', 'Astrologers', 'Influencers', 'Mentors', 'Doctors', 'Lawyers', 'Singers', 'Advisors', 'Friends', 'Coaches', 'Consultants'].map((category) => (
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

          {/* Mobile Category Selection (Horizontal scroll, label, outlined pills, swipe hint) */}
          <div className="block md:hidden space-y-2">
            <div className="text-left px-1">
              <span className="text-[10px] font-extrabold font-mono tracking-wider text-slate-500 uppercase block mb-1.5">
                Browse by category
              </span>
              <div className="flex overflow-x-auto gap-2 py-2 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]">
                {['All', 'Astrologers', 'Influencers', 'Mentors', 'Doctors', 'Lawyers', 'Singers', 'Advisors', 'Friends', 'Coaches', 'Consultants'].map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`shrink-0 py-2 px-4 rounded-full text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-emerald-400 border-emerald-400 text-slate-950 font-black shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[9px] font-mono text-slate-500 mt-1 animate-pulse">
                <span>← swipe to see more →</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getFilteredConsultants().filter(c => selectedCategory === 'All' || normalizeCategory((c as any).category) === selectedCategory).length === 0 ? (
              <div className="col-span-3 text-center py-16 text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                No active advisors found in "{selectedCategory}" category at the moment.
              </div>
            ) : (
              getFilteredConsultants().filter(c => selectedCategory === 'All' || normalizeCategory((c as any).category) === selectedCategory).map((cons) => (
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
                          className="w-16 h-16 rounded-xl object-cover border border-slate-800 flex-shrink-0 cursor-pointer hover:opacity-85 hover:scale-105 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(cons.photo_url);
                          }}
                          title="Click to view photo"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'; }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-850 flex items-center justify-center border border-slate-800 text-slate-400 font-bold shrink-0">
                          {cons.display_name.slice(0, 1)}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <h3 
                          onClick={() => fetchFullProfile(cons)} 
                          className="font-bold text-lg text-slate-100 cursor-pointer hover:text-emerald-400 hover:underline transition-all duration-150"
                        >
                          {cons.display_name}
                        </h3>
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full">
                            {normalizeCategory((cons as any).category || 'Consultants')}
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
        ) : (
          <CallMintLandingPage 
            consultants={consultants} 
            onOpenAuth={onOpenAuth} 
            onSelectConsultant={(cons) => fetchFullProfile(cons)} 
          />
        )
      )}

      {/* 2. SHOW SPECIFIC SELECTED PROFILE BOOKING PAGE */}
      {selectedConsultant && (
        <div className="space-y-3 max-w-md md:max-w-4xl lg:max-w-5xl mx-auto w-full px-2 sm:px-4">
          
          {/* Unified single rounded card (border-radius 16px, hairline border, flat surface, no shadows) */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden text-left shadow-none relative">
            
            {/* Go Back Link inside Card */}
            {!targetUsername && (
              <div className="px-5 pt-3.5 pb-2.5 flex items-center bg-slate-950/20 border-b border-slate-850/50">
                <button
                  onClick={() => {
                    setSelectedConsultant(null);
                    setReviews([]);
                  }}
                  className="group text-slate-400 hover:text-emerald-400 flex items-center space-x-1 text-xs font-mono transition-colors duration-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform duration-200" />
                  <span>Go Back</span>
                </button>
              </div>
            )}
            
            {/* Section 1: Header Section */}
            <div className="p-5 flex items-center justify-between gap-3 bg-slate-900/40">
              {/* Left: Avatar & Name details */}
              <div className="flex items-center space-x-3">
                <div className="relative w-11 h-11 shrink-0">
                  {selectedConsultant.photo_url ? (
                    <img
                      src={selectedConsultant.photo_url}
                      alt={selectedConsultant.display_name}
                      className="w-11 h-11 rounded-full object-cover cursor-pointer hover:opacity-90"
                      onClick={() => setLightboxImage(selectedConsultant.photo_url)}
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'; }}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center font-semibold text-slate-300 text-sm">
                      {selectedConsultant.display_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {/* Small online-status dot on the bottom-right */}
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                    selectedConsultant.is_online === 1
                      ? selectedConsultant.is_busy === 1
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                      : 'bg-slate-500'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-base leading-snug">
                    {selectedConsultant.display_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                    <p className="text-emerald-400 font-bold font-mono">
                      {selectedConsultant.followers_count || 0} Followers
                    </p>
                    <span className="text-slate-600 text-xs">•</span>
                    <button
                      type="button"
                      onClick={() => handleFollowToggle(selectedConsultant)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all border duration-200 cursor-pointer ${
                        (selectedConsultant as any).is_following === 1
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-transparent shadow-sm active:scale-95'
                      }`}
                    >
                      {(selectedConsultant as any).is_following === 1 ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Badges */}
              <div className="flex flex-col items-end justify-center space-y-1">
                {/* Rating (always in one line, no box) */}
                <div className="text-amber-400 font-semibold text-xs flex items-center gap-0.5 whitespace-nowrap">
                  <span>★</span>
                  <span>
                    {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "5.0"} ({reviews.length})
                  </span>
                </div>
                {/* Rate badge */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-emerald-400 font-mono">
                  ₹{selectedConsultant.price_per_minute}/min
                </div>
              </div>
            </div>

            {/* Main Responsive Grid Layout for Desktop vs Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-12 border-t border-slate-850/50">
              
              {/* Left Panel: Tabs + Content + Packages */}
              <div className="md:col-span-7 flex flex-col md:border-r border-slate-850/50">
                {/* Section 2: Tabs Section */}
                <div className="flex border-b border-slate-850/50 bg-slate-950/20">
                  {(['about', 'schedule', 'reviews'] as const).map((tab) => {
                    const isActive = bookingTab === tab;
                    const labels: Record<string, string> = {
                      about: 'About',
                      schedule: 'Schedule shifts',
                      reviews: 'Reviews'
                    };
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setBookingTab(tab)}
                        className={`flex-1 py-3 text-xs sm:text-sm font-medium text-center relative transition-all cursor-pointer ${
                          isActive ? 'text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {labels[tab]}
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Contents */}
                <div className="p-5 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans min-h-[200px] max-h-[360px] overflow-y-auto bg-slate-900/40 flex-1">
                  {bookingTab === 'about' && (
                    <div>
                      <p className="font-sans font-light">
                        {selectedConsultant.bio || "No biography provided yet. Stay tuned for expert insights and updates!"}
                      </p>
                    </div>
                  )}

                  {bookingTab === 'schedule' && (
                    <div className="space-y-2">
                      {selectedConsSchedules.length === 0 ? (
                        <div className="text-slate-500 font-sans text-xs py-1">
                          No specific schedule listed. Connects live based on real-time online status.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {selectedConsSchedules.map((sch) => (
                            <div key={sch.id} className="flex items-center justify-between py-1 border-b border-slate-800/30 text-xs font-mono last:border-0 last:pb-0">
                              <span className="text-emerald-400 font-medium">
                                {sch.date ? formatToYYYYMMDD(sch.date) : sch.day}
                              </span>
                              <span className="text-slate-400">{formatTimeTo12Hour(sch.from_time)} - {formatTimeTo12Hour(sch.to_time)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {bookingTab === 'reviews' && (
                    <div className="space-y-2">
                      {reviews.length === 0 ? (
                        <div className="text-center py-4 text-slate-500 text-xs font-mono">
                          No reviews found yet. Be the first to consult!
                        </div>
                      ) : (
                        reviews.map((rev) => (
                          <div key={rev.id} className="py-2 border-b border-slate-850/30 last:border-0 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[9px] text-emerald-400 shrink-0 select-none">
                                {rev.user_name.slice(0, 1).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-200 shrink-0 truncate max-w-[80px]">{rev.user_name}</span>
                              <span className="text-slate-400 truncate italic">"{rev.text}"</span>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0 text-slate-500 font-mono text-[10px] select-none">
                              <span className="text-amber-400 font-semibold">★{rev.rating}</span>
                              <span>•</span>
                              <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Packages + Billing Breakdown & Action Buttons */}
              <div className="md:col-span-5 bg-slate-950/20 flex flex-col justify-between border-t md:border-t-0 border-slate-850/50">
                <div className="flex-1 flex flex-col divide-y divide-slate-850/50">
                  {/* Section 3: Chat Duration Packages Section */}
                  <div className="p-5 sm:p-6 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Chat duration packages</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Select consultation duration</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                      {[5, 10, 15, 30].map((mins) => {
                        const isSelected = selectedMinutes === mins;
                        return (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setSelectedMinutes(mins)}
                            className={`py-2.5 px-1 rounded-xl text-xs sm:text-sm font-medium border transition-all text-center flex flex-col justify-center items-center cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/10 border border-emerald-500 text-emerald-400 font-semibold shadow-sm'
                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <span>{mins} min</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 4: Billing Breakdown Section */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">Billing breakdown</h4>
                    </div>
                    <div className="space-y-2 text-xs sm:text-sm text-slate-400">
                      <div className="flex justify-between">
                        <span>Advisor rate:</span>
                        <span className="font-mono text-slate-200">₹{selectedConsultant.price_per_minute}/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-mono text-slate-200">{selectedMinutes} mins</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-850/50 pt-2 text-slate-100 font-bold text-sm sm:text-base">
                        <span>Total due:</span>
                        <span className="font-mono text-emerald-400">₹{selectedMinutes * selectedConsultant.price_per_minute} INR</span>
                      </div>
                      {currentUser && (
                        <div className="flex justify-between text-slate-500 pt-1">
                          <span>Your balance:</span>
                          <span className="font-mono text-slate-300">₹{parseFloat(currentUser.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2.5 pt-4">
                      {error && (
                        <div className="text-[11px] text-rose-400 text-center bg-rose-500/10 py-2 px-3 rounded-xl border border-rose-500/20 mb-2 leading-relaxed font-sans">
                          {error}
                        </div>
                      )}

                      {/* Wallet button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedConsultant.is_online !== 1) {
                            setError("Yeh consultant abhi offline hain. Kripya unke online aane ka intezar karein. (This consultant is currently offline. Please wait for them to come online.)");
                            return;
                          }
                          if (!currentUser) {
                            onOpenAuth();
                          } else if (currentUser.wallet_balance < (selectedMinutes * selectedConsultant.price_per_minute)) {
                            setShowRechargeModal(true);
                          } else {
                            handleInitiateWalletPayment();
                          }
                        }}
                        disabled={isProcessingPayment || selectedConsultant.is_online !== 1}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                      >
                        {isProcessingPayment && pendingPaymentMethod === 'wallet' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-950" />
                        ) : selectedConsultant.is_online !== 1 ? (
                          <span>Consultant is Offline</span>
                        ) : (
                          <span>Book chat with wallet · ₹{selectedMinutes * selectedConsultant.price_per_minute}</span>
                        )}
                      </button>

                      {currentUser && currentUser.wallet_balance < (selectedMinutes * selectedConsultant.price_per_minute) && (
                        <div className="text-[11px] text-amber-500/90 text-center bg-amber-500/5 py-2 px-3 rounded-xl border border-amber-500/10 mt-1 leading-relaxed">
                          Insufficient wallet balance to book a chat. Please recharge your wallet above.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Real-time Toast notification */}
      <AnimatePresence>
        {latestToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[100] bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl flex items-start space-x-3 text-left backdrop-blur-md"
          >
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">New Notification</span>
                <button onClick={() => setLatestToast(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="text-xs font-bold text-slate-100">{latestToast.title}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">{latestToast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox / Zoom Photo Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-3 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top close button inside the modal frame */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-950 text-slate-300 hover:text-white p-2 rounded-full border border-slate-800 transition-all z-20"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Image */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              <img
                src={lightboxImage}
                alt="Enlarged Profile"
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'; }}
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="mt-3 text-center">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Profile Picture Preview</p>
            </div>
          </div>
        </div>
      )}

      <ImageEditorModal
        isOpen={isImageEditorOpen}
        onClose={() => setIsImageEditorOpen(false)}
        currentImage={editorImageBase64 || editPhotoUrl}
        initialGender={editGender}
        onSave={saveCroppedPhoto}
      />

      <ProfileChangesSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        changes={profileChangesList}
        onGoToHome={() => {
          setIsSuccessModalOpen(false);
          setActiveDashboardTab('advisors');
        }}
      />

    </div>
  );
}
