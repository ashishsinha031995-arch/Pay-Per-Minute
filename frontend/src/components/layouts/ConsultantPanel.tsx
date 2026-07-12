import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Key, LogIn, LogOut, Wallet, ShieldCheck, UserCheck, RefreshCw, Copy, Check, FileText, Star, Settings2, Globe, Flame, ShieldAlert, ArrowLeft, ArrowRight, Shield, Award, Users, CheckCircle, Zap, Coins, TrendingUp, Menu, X, HelpCircle, Calendar, Lock, Bell, Volume2, Gauge, Sun, Moon, Smartphone, ChevronRight, Wifi, MoreVertical, MessageCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Consultant, Plan, Session } from '../../types';
import { IncomingRequestNotification } from '../IncomingRequestNotification';
import { io } from 'socket.io-client';
import { ImageEditorModal } from '../modals/ImageEditorModal';
import { Crop } from 'lucide-react';
import { ProfileChangesSuccessModal, ProfileChangeItem } from '../modals/ProfileChangesSuccessModal';

interface ConsultantPanelProps {
  onSelectSession: (sessionId: string, username: string, role: 'user' | 'consultant', isReadOnly?: boolean) => void;
  onNavigateToUserView: (username: string) => void;
  activeSessionId?: string;
  onLogout?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onInstallApp?: () => void;
}

const saveConsultantSession = (consultant: any) => {
  if (!consultant) {
    localStorage.removeItem('consultant_session');
    return;
  }
  const cleaned = { ...consultant };
  delete cleaned.aadhaar_photo_url;
  delete cleaned.pan_photo_url;
  delete cleaned.aadhaar_number;
  delete cleaned.pan_number;
  delete cleaned.bank_account_number;
  delete cleaned.bank_account_holder_name;
  delete cleaned.bank_ifsc_code;
  delete cleaned.bank_name;
  
  for (const key of Object.keys(cleaned)) {
    if (key !== 'photo_url' && typeof cleaned[key] === 'string' && cleaned[key].length > 10000) {
      cleaned[key] = cleaned[key].slice(0, 100) + '... (truncated)';
    }
  }
  
  try {
    localStorage.setItem('consultant_session', JSON.stringify(cleaned));
  } catch (err) {
    console.error('Failed to save consultant_session to localStorage:', err);
    try {
      delete cleaned.photo_url;
      delete cleaned.bio;
      localStorage.setItem('consultant_session', JSON.stringify(cleaned));
    } catch (innerErr) {
      console.error('Failed to save minimal consultant_session to localStorage:', innerErr);
    }
  }
};

export function ConsultantPanel({ onSelectSession, onNavigateToUserView, activeSessionId, onLogout, theme = 'dark', onToggleTheme, onInstallApp }: ConsultantPanelProps) {
  // Authentication & Session States
  const [currentConsultant, setCurrentConsultant] = useState<Consultant | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('consultant_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) {
            return parsed;
          }
        }
      } catch (e) {}
    }
    return null;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // Registration States
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [registerDisplayName, setRegisterDisplayName] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pre_filled_consultant_signup');
        if (stored) {
          return JSON.parse(stored).displayName || '';
        }
      } catch (e) {}
    }
    return '';
  });
  const [registerEmail, setRegisterEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pre_filled_consultant_signup');
        if (stored) {
          return JSON.parse(stored).email || '';
        }
      } catch (e) {}
    }
    return '';
  });
  const [registerPhone, setRegisterPhone] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pre_filled_consultant_signup');
        if (stored) {
          return JSON.parse(stored).phone || '';
        }
      } catch (e) {}
    }
    return '';
  });
  const [registerPrice, setRegisterPrice] = useState('20');
  const [registerCategory, setRegisterCategory] = useState<'Astrologers' | 'Influencers' | 'Coaches' | 'Consultants' | 'Lawyers' | 'Mentors' | 'Doctors' | 'Singers' | 'Advisors' | 'Friends'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pre_filled_consultant_signup');
        if (stored) {
          return JSON.parse(stored).category || 'Consultants';
        }
      } catch (e) {}
    }
    return 'Consultants';
  });
  const [credentialsGenerated, setCredentialsGenerated] = useState<{username: string, password: string, displayName: string} | null>(null);
  const [registerUsername, setRegisterUsername] = useState('');
  const [buyingPlan, setBuyingPlan] = useState<Plan | null>(null);
  const [buyDisplayName, setBuyDisplayName] = useState('');
  const [buyUsername, setBuyUsername] = useState('');
  const [buyCategory, setBuyCategory] = useState('Consultants');
  const [buyRate, setBuyRate] = useState('20');
  const isUsernameManuallyEditedRef = useRef(false);
  const [usernameSuffix] = useState(() => Math.floor(1000 + Math.random() * 9000));
  const lastBuyingPlanIdRef = useRef<number | null>(null);
  const isFirstSessionSyncRef = useRef(true);
  const [subscriptionSuccessDetails, setSubscriptionSuccessDetails] = useState<{
    username: string;
    password?: string;
    displayName: string;
    planName: string;
    expiry: string;
  } | null>(null);

  useEffect(() => {
    if (buyingPlan) {
      if (lastBuyingPlanIdRef.current !== buyingPlan.id) {
        if (currentConsultant) {
          setBuyDisplayName(currentConsultant.display_name || '');
          setBuyUsername(currentConsultant.username || '');
          setBuyCategory(currentConsultant.category || 'Consultants');
          
          const maxRate = buyingPlan.max_consultant_rate ?? 1000.0;
          const initialRate = currentConsultant.price_per_minute ?? 20;
          if (initialRate > maxRate) {
            setBuyRate(maxRate.toString());
          } else {
            setBuyRate(initialRate.toString());
          }
        }
        lastBuyingPlanIdRef.current = buyingPlan.id;
      }
    } else {
      lastBuyingPlanIdRef.current = null;
    }
  }, [buyingPlan, currentConsultant]);
  const [isPrefilled, setIsPrefilled] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('pre_filled_consultant_signup');
    }
    return false;
  });

  // Stats & Sessions list
  const [wallet, setWallet] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [manualAdjustments, setManualAdjustments] = useState<any[]>([]);
  const [loginHours, setLoginHours] = useState<{ daily: number, weekly: number, monthly: number } | null>(null);

  // --- REAL-TIME IN-APP ALERTS & BROADCASTS ---
  const [clientNotifications, setClientNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [latestToast, setLatestToast] = useState<{ id: number; title: string; message: string } | null>(null);
  const knownNotifIdsRef = useRef<number[]>([]);

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
    if (!currentConsultant || !currentConsultant.id) return;

    const fetchNotifications = async (isFirstLoad = false) => {
      try {
        const res = await fetch(`/api/notifications?user_type=consultant&user_id=${currentConsultant.id}`);
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
        console.warn("Failed to fetch consultant notifications (network or server restart):", err);
      }
    };

    fetchNotifications(true);

    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentConsultant?.id]);

  const handleMarkAsRead = async (id: number) => {
    if (!currentConsultant || !currentConsultant.id) return;
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: 'consultant', user_id: currentConsultant.id })
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
    if (!currentConsultant || !currentConsultant.id) return;
    try {
      const res = await fetch(`/api/notifications/read-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: 'consultant', user_id: currentConsultant.id })
      });
      if (res.ok) {
        setClientNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadNotifCount(0);
      }
    } catch (e) {
      console.error("Error marking all read:", e);
    }
  };

  // Profile Form States
  const [photoUrl, setPhotoUrl] = useState('');
  const [consultantGender, setConsultantGender] = useState('Male');
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [editorImageBase64, setEditorImageBase64] = useState<string | undefined>(undefined);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [profileChangesList, setProfileChangesList] = useState<ProfileChangeItem[]>([]);
  const [bio, setBio] = useState('');
  const [pricePerMin, setPricePerMin] = useState('20');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Consultants');
  const [experience, setExperience] = useState('5');
  const [languages, setLanguages] = useState('English, Hindi');
  const [specializations, setSpecializations] = useState('General');
  const [newPassword, setNewPassword] = useState('');
  const hasInitializedProfileRef = useRef(false);

  // KYC Form States
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarPhotoUrl, setAadhaarPhotoUrl] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [panPhotoUrl, setPanPhotoUrl] = useState('');
  const [kycStatus, setKycStatus] = useState('unsubmitted'); // unsubmitted, pending, approved, rejected
  const [kycRejectReason, setKycRejectReason] = useState('');
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Bank Form States
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankStatus, setBankStatus] = useState('unsubmitted'); // unsubmitted, pending, approved, rejected
  const [bankRejectReason, setBankRejectReason] = useState('');
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Profile Completion Percentage Helper
  const getProfileCompletionPercentage = () => {
    let filled = 0;
    const total = 11;
    if (photoUrl && photoUrl !== '') filled++;
    if (bio && bio !== '') filled++;
    if (pricePerMin && pricePerMin !== '') filled++;
    if (aadhaarNumber && aadhaarNumber !== '') filled++;
    if (aadhaarPhotoUrl && aadhaarPhotoUrl !== '') filled++;
    if (panNumber && panNumber !== '') filled++;
    if (panPhotoUrl && panPhotoUrl !== '') filled++;
    if (bankAccountHolderName && bankAccountHolderName !== '') filled++;
    if (bankAccountNumber && bankAccountNumber !== '') filled++;
    if (bankIfscCode && bankIfscCode !== '') filled++;
    if (bankName && bankName !== '') filled++;

    return Math.round((filled / total) * 100);
  };

  const getPerformanceMetrics = (consId: number, consSessions: any[]) => {
    const completed = consSessions.filter(s => s.status === 'completed');
    
    // 1. Average Login Hours (Daily, Weekly, Monthly)
    const dailyLogin = loginHours ? loginHours.daily : Number((6.5 + ((consId * 7) % 3.5)).toFixed(1));
    const weeklyLogin = loginHours ? loginHours.weekly : Number((7.2 + ((consId * 4) % 3.1)).toFixed(1));
    const monthlyLogin = loginHours ? loginHours.monthly : Number((7.8 + ((consId * 9) % 2.5)).toFixed(1));

    // 2. Average Chat Minutes (Daily, Weekly, Monthly)
    let baseChatMins = 0;
    if (completed.length > 0) {
      baseChatMins = completed.reduce((acc, s) => acc + s.duration_minutes, 0) / completed.length;
    }
    const dailyChat = Math.round(baseChatMins > 0 ? baseChatMins : (22 + (consId % 15)));
    const weeklyChat = Math.round(baseChatMins > 0 ? baseChatMins * 1.05 : (25 + (consId % 12)));
    const monthlyChat = Math.round(baseChatMins > 0 ? baseChatMins * 1.1 : (28 + (consId % 10)));

    // 3. Repeat User Percentage (Daily, Weekly, Monthly)
    const userCounts: { [key: string]: number } = {};
    consSessions.forEach(s => {
      userCounts[s.user_name] = (userCounts[s.user_name] || 0) + 1;
    });
    const totalUsers = Object.keys(userCounts).length;
    const repeatUsersCount = Object.values(userCounts).filter(count => count > 1).length;
    const actualRepeatPct = totalUsers > 0 ? Math.round((repeatUsersCount / totalUsers) * 100) : 0;

    const dailyRepeat = actualRepeatPct;
    const weeklyRepeat = actualRepeatPct > 0 ? Math.min(100, Math.round(actualRepeatPct * 1.1)) : 0;
    const monthlyRepeat = actualRepeatPct > 0 ? Math.min(100, Math.round(actualRepeatPct * 1.25)) : 0;

    return {
      login: { daily: dailyLogin, weekly: weeklyLogin, monthly: monthlyLogin },
      chat: { daily: dailyChat, weekly: weeklyChat, monthly: monthlyChat },
      repeat: { daily: dailyRepeat, weekly: weeklyRepeat, monthly: monthlyRepeat }
    };
  };

  const getSessionsForWeekOffset = (consSessions: any[], weekOffset: number) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() + distanceToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(mondayThisWeek);
    startOfWeek.setDate(mondayThisWeek.getDate() - (weekOffset * 7));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return consSessions.filter(s => {
      const dStr = s.created_at || s.started_at;
      if (!dStr) return false;
      const d = new Date(dStr);
      return d >= startOfWeek && d < endOfWeek;
    });
  };

  const getWeekRangeString = (weekOffset: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() + distanceToMonday);
    
    const startOfWeek = new Date(mondayThisWeek);
    startOfWeek.setDate(mondayThisWeek.getDate() - (weekOffset * 7));
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday of that week

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startOfWeek.toLocaleDateString('en-US', options)} - ${endOfWeek.toLocaleDateString('en-US', options)}, ${startOfWeek.getFullYear()}`;
  };

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

  const getWeeklyEarningsData = (consId: number, consSessions: any[], pricePerMinute: number, weekOffset: number = 0) => {
    // Filter sessions to the selected offset week first
    const targetWeekSessions = getSessionsForWeekOffset(consSessions, weekOffset);
    const completed = targetWeekSessions.filter(s => s.status === 'completed');
    
    // Group completed sessions by day of week (Mon-Sun)
    const actualEarningsByDay = Array(7).fill(0);
    const callCountByDay = Array(7).fill(0);
    const totalMinutesByDay = Array(7).fill(0);

    completed.forEach(s => {
      const d = new Date(s.created_at || s.started_at || new Date());
      let dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday...
      // Map Sunday (0) to index 6, Monday (1) to index 0, etc.
      let mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      actualEarningsByDay[mappedIndex] += Number(s.consultant_earnings || 0);
      callCountByDay[mappedIndex] += 1;
      totalMinutesByDay[mappedIndex] += Number(s.duration_minutes || 0);
    });

    const days = [
      { label: 'Mon' },
      { label: 'Tue' },
      { label: 'Wed' },
      { label: 'Thu' },
      { label: 'Fri' },
      { label: 'Sat' },
      { label: 'Sun' },
    ];

    const data = days.map((day, idx) => {
      const actual = actualEarningsByDay[idx];
      return {
        label: day.label,
        totalEarningsForDay: actual,
        actual,
        callCount: callCountByDay[idx],
        totalMinutes: totalMinutesByDay[idx]
      };
    });

    // Find max value to compute accurate responsive heights but enforce a minimum benchmark of ₹500 so low earnings don't fill the entire bar.
    const maxEarnings = Math.max(...data.map(d => d.totalEarningsForDay), 500);

    return data.map(d => {
      const percentage = d.totalEarningsForDay > 0 ? Math.round((d.totalEarningsForDay / maxEarnings) * 100) : 0;
      return {
        label: d.label,
        value: `${percentage}%`,
        earnings: `₹${Math.round(d.totalEarningsForDay).toLocaleString()}`,
        actual: d.actual,
        callCount: d.callCount,
        totalMinutes: d.totalMinutes
      };
    });
  };

  const getMonthlyEarningsData = (consId: number, consSessions: any[]) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dailyEarnings = Array(daysInMonth).fill(0);

    consSessions.forEach(s => {
      if (Number(s.consultant_id) !== Number(consId)) return;
      if (s.status !== 'completed') return;
      const date = new Date(s.created_at || s.started_at || new Date());
      if (date.getFullYear() === year && date.getMonth() === month) {
        const day = date.getDate(); // 1-indexed
        dailyEarnings[day - 1] += Number(s.consultant_earnings || 0);
      }
    });

    const maxEarnings = Math.max(...dailyEarnings, 1);

    return dailyEarnings.map((earnings, idx) => {
      const dayNum = idx + 1;
      const percentage = earnings > 0 ? (earnings / maxEarnings) * 100 : 0;
      return {
        day: dayNum,
        earnings,
        percentage
      };
    });
  };

  // Tab Navigation & Mobile Drawer States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'status' | 'profile' | 'sessions' | 'kyc' | 'bank' | 'support' | 'schedules' | 'followers' | 'notifications'>('dashboard');
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [performanceTab, setPerformanceTab] = useState<'weekly' | 'monthly'>('weekly');
  const [performanceWeekOffset, setPerformanceWeekOffset] = useState<number>(0);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('All');
  const [hoveredMonthlyPoint, setHoveredMonthlyPoint] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Real-time fluctuating performance score meter metrics
  const [liveVelocityScore, setLiveVelocityScore] = useState(76);
  const [liveCallFrequency, setLiveCallFrequency] = useState(5.4);

  // Status Toggles
  const [isOnline, setIsOnline] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [buyingPlanId, setBuyingPlanId] = useState<number | null>(null);

  // --- NATIVE OS PUSH NOTIFICATIONS FOR BACKGROUND CALLS ---
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const lastNotifiedRequestIdRef = useRef<string | null>(null);

  const handleRequestNotificationPermission = () => {
    if (typeof Notification === 'undefined') {
      alert('Your browser does not support Web Notifications.');
      return;
    }
    Notification.requestPermission()
      .then(permission => {
        setNotifPermission(permission);
        if (permission === 'granted') {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(() => {
              console.log('[Notification API] Registered Service Worker for ConsultantPanel.');
            });
          }
          new Notification("🎉 CallMint Alerts Active!", {
            body: "You will now receive sound and full-screen alerts for all incoming consultation requests!",
            icon: "/favicon.ico"
          });
        } else {
          alert('Notification permission was denied. Please allow notifications from your browser site settings.');
        }
      })
      .catch(err => {
        console.error('Error requesting permission:', err);
      });
  };

  useEffect(() => {
    const pendingRequest = sessions.find(s => s.status === 'pending');
    if (pendingRequest) {
      if (lastNotifiedRequestIdRef.current !== pendingRequest.id) {
        lastNotifiedRequestIdRef.current = pendingRequest.id;

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const title = `🚨 INCOMING CALL: ${pendingRequest.user_name}`;
          const options = {
            body: `Duration: ${pendingRequest.duration_minutes} Mins | Rate: ₹${pendingRequest.price_per_minute}/min. Tap here to open and accept!`,
            icon: '/favicon.ico',
            tag: `incoming-chat-${pendingRequest.id}`,
            renotify: true,
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300, 100, 300],
            data: {
              url: window.location.origin,
            }
          };

          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, options);
            }).catch(() => {
              new Notification(title, options);
            });
          } else {
            new Notification(title, options);
          }

          if ('vibrate' in navigator) {
            navigator.vibrate([300, 100, 300, 100, 300, 100, 300]);
          }
        }
      }
    } else {
      lastNotifiedRequestIdRef.current = null;
    }
  }, [sessions]);

  // Common UI feedback
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Specific local feedback for KYC & Bank forms (displayed directly under buttons)
  const [kycFeedbackError, setKycFeedbackError] = useState<string | null>(null);
  const [kycFeedbackSuccess, setKycFeedbackSuccess] = useState<string | null>(null);
  const [bankFeedbackError, setBankFeedbackError] = useState<string | null>(null);
  const [bankFeedbackSuccess, setBankFeedbackSuccess] = useState<string | null>(null);
  const [profileFeedbackError, setProfileFeedbackError] = useState<string | null>(null);
  const [profileFeedbackSuccess, setProfileFeedbackSuccess] = useState<string | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Interactive Landing Page Funnel States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [simulatedMinutes, setSimulatedMinutes] = useState(45);
  const [simulatedRate, setSimulatedRate] = useState(30);

  // Helper to determine if the consultant has an active plan
  const hasActivePlan = !!(wallet?.plan_id || (currentConsultant && currentConsultant.plan_id));

  const handleScrollToPlans = () => {
    setActiveTab('dashboard');
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById(currentConsultant ? 'pricing-section-active' : 'pricing-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size is too large. Please upload an image smaller than 5MB.');
      return;
    }

    // Check file format - strictly PNG, JPG, JPEG
    const allowedExtensions = ['png', 'jpg', 'jpeg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    
    if (!allowedExtensions.includes(fileExtension || '') || !allowedMimeTypes.includes(file.type)) {
      setError('Only PNG and JPG/JPEG image formats are allowed for upload.');
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
        // Reset input value so same file can be chosen again
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
      const res = await fetch('/api/user/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: croppedBase64 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo');
      
      setPhotoUrl(data.photo_url);
      
      // Sync with local consultant state and local storage immediately
      if (currentConsultant) {
        const updated = { ...currentConsultant, photo_url: data.photo_url };
        setCurrentConsultant(updated);
        saveConsultantSession(updated);

        // IMMEDIATELY write back to database profile so it persists on reload and doesn't disappear
        const rateVal = parseFloat(pricePerMin) || 10.0;
        await fetch(`/api/consultants/${currentConsultant.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_url: data.photo_url,
            bio: bio || '',
            price_per_minute: rateVal
          })
        });
      }
      
      setSuccess('Profile photo saved successfully with crop and alignment!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (uploadErr: any) {
      setError(uploadErr.message || 'Photo upload and crop failed.');
      throw uploadErr;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Past session lookup states
  const [viewingPastSessionMessages, setViewingPastSessionMessages] = useState<any[] | null>(null);
  const [viewingPastSessionInfo, setViewingPastSessionInfo] = useState<any | null>(null);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  // Schedules state
  const [schedules, setSchedules] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newDay, setNewDay] = useState('');
  const [newFromTime, setNewFromTime] = useState('');
  const [newToTime, setNewToTime] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);

  const isTimeOrderInvalid = newFromTime && newToTime && newToTime <= newFromTime;
  const isSaveDisabled = (!newDate && !newDay) || !newFromTime || !newToTime || !!isTimeOrderInvalid;

  const fetchSchedules = async (consultantId: number, silent = false) => {
    try {
      if (!silent) setScheduleLoading(true);
      const res = await fetch(`/api/consultants/${consultantId}/schedules`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setSchedules(data);
      } else if (res.ok) {
        console.warn('Received non-JSON response from schedules endpoint, skipping parsing.');
      }
    } catch (err: any) {
      if (err && err.message && err.message.includes('Failed to fetch')) {
        console.warn('Network connection is starting up or temporarily disconnected. Retrying schedules shortly...');
      } else {
        console.error('Failed to load schedules:', err);
      }
    } finally {
      if (!silent) setScheduleLoading(false);
    }
  };

  const handleDateChange = (val: string) => {
    setNewDate(val);
    if (val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        setNewDay(days[dateObj.getDay()]);
      }
    } else {
      setNewDay('');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConsultant) return;
    if (!newFromTime || !newToTime) {
      setError('Please fill in both From Time and To Time.');
      return;
    }

    // Validate that End Time is not earlier than Start Time
    const fromParts = newFromTime.split(':').map(Number);
    const toParts = newToTime.split(':').map(Number);
    if (fromParts.length === 2 && toParts.length === 2) {
      const fromMins = fromParts[0] * 60 + fromParts[1];
      const toMins = toParts[0] * 60 + toParts[1];
      if (toMins < fromMins) {
        setError('End Time (To Time) cannot be earlier than Start Time (From Time).');
        setTimeout(() => setError(null), 4000);
        return;
      }
    }

    try {
      const url = editingScheduleId 
        ? `/api/consultants/${currentConsultant.id}/schedules/${editingScheduleId}`
        : `/api/consultants/${currentConsultant.id}/schedules`;
      const method = editingScheduleId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newDate || null,
          day: newDay || null,
          from_time: newFromTime,
          to_time: newToTime
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save schedule');
      }

      setSuccess(editingScheduleId ? 'Schedule has been updated successfully!' : 'New schedule slot has been added successfully!');
      setNewDate('');
      setNewDay('');
      setNewFromTime('');
      setNewToTime('');
      setEditingScheduleId(null);
      fetchSchedules(currentConsultant.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!currentConsultant) return;
    if (!window.confirm('Are you sure you want to delete this schedule slot?')) return;
    try {
      const res = await fetch(`/api/consultants/${currentConsultant.id}/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete schedule');
      }
      setSuccess('Schedule slot deleted successfully.');
      fetchSchedules(currentConsultant.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Support ticket states
  const [consultantTickets, setConsultantTickets] = useState<any[]>([]);
  const [loadingConsultantTickets, setLoadingConsultantTickets] = useState(false);
  const [consultantReplyDrafts, setConsultantReplyDrafts] = useState<{[ticketId: number]: string}>({});

  const fetchConsultantTickets = async () => {
    if (!currentConsultant?.id) return;
    try {
      setLoadingConsultantTickets(true);
      const res = await fetch(`/api/tickets?sender_type=consultant&sender_id=${currentConsultant.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConsultantTickets(data.tickets);
        }
      }
    } catch (err: any) {
      if (err && err.message && err.message.includes('Failed to fetch')) {
        console.warn('Network connection is starting up or temporarily disconnected. Retrying tickets shortly...');
      } else {
        console.error('Failed to fetch consultant support tickets:', err);
      }
    } finally {
      setLoadingConsultantTickets(false);
    }
  };

  const handleConsultantReplySubmit = async (e: React.FormEvent, ticketId: number) => {
    e.preventDefault();
    const replyText = consultantReplyDrafts[ticketId] || '';
    if (!replyText.trim()) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'consultant',
          sender_id: currentConsultant?.id,
          sender_name: currentConsultant?.name || 'Consultant',
          message: replyText
        })
      });

      if (res.ok) {
        setConsultantReplyDrafts(prev => ({ ...prev, [ticketId]: '' }));
        fetchConsultantTickets();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit reply');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting reply');
    }
  };

  useEffect(() => {
    if (activeTab === 'support' && currentConsultant?.id) {
      fetchConsultantTickets();
    }
  }, [activeTab, currentConsultant?.id]);

  const fetchConsultantFollowers = async () => {
    if (!currentConsultant?.id) return;
    setFollowersLoading(true);
    try {
      const res = await fetch(`/api/consultants/${currentConsultant.id}/followers`);
      if (res.ok) {
        const data = await res.json();
        setFollowersList(data);
      }
    } catch (err) {
      console.error("Error fetching followers:", err);
    } finally {
      setFollowersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'followers' && currentConsultant?.id) {
      fetchConsultantFollowers();
    }
  }, [activeTab, currentConsultant?.id]);

  // Pre-fill consultant details from pre-signup form
  useEffect(() => {
    const syncPreSignupDetails = () => {
      const stored = localStorage.getItem('pre_filled_consultant_signup');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.displayName) setRegisterDisplayName(parsed.displayName);
          if (parsed.email) setRegisterEmail(parsed.email);
          if (parsed.phone) setRegisterPhone(parsed.phone);
          if (parsed.category) setRegisterCategory(parsed.category);
          setIsPrefilled(true);
        } catch (e) {
          console.error('Error parsing pre-filled consultant signup:', e);
        }
      } else {
        setIsPrefilled(false);
      }
    };

    syncPreSignupDetails();

    window.addEventListener('storage', syncPreSignupDetails);
    return () => window.removeEventListener('storage', syncPreSignupDetails);
  }, []);

  // Sync pre-filled login credentials for newly registered consultants
  useEffect(() => {
    const syncPrefilledLogin = () => {
      const prefilled = localStorage.getItem('prefilled_consultant_login');
      if (prefilled) {
        try {
          const parsed = JSON.parse(prefilled);
          if (parsed.username) {
            setUsernameInput(parsed.username);
          }
          if (parsed.password) {
            setPasswordInput(parsed.password);
          }
          if (parsed.username && parsed.password) {
            setCredentialsGenerated({
              username: parsed.username,
              password: parsed.password,
              displayName: parsed.displayName || 'Advisor',
            });
          }
        } catch (e) {
          console.error('Error parsing prefilled login credentials:', e);
        }
      }
    };
    syncPrefilledLogin();
    window.addEventListener('storage', syncPrefilledLogin);
    return () => window.removeEventListener('storage', syncPrefilledLogin);
  }, []);

  // Reactive username generation based on display name
  useEffect(() => {
    if (!isUsernameManuallyEditedRef.current) {
      const cleanName = registerDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanName) {
        setRegisterUsername(`expert_${cleanName}_${usernameSuffix}`);
      } else {
        setRegisterUsername('');
      }
    }
  }, [registerDisplayName, usernameSuffix]);

  // Hamburger drawer toggling event from global Header
  useEffect(() => {
    const handleToggle = () => {
      setIsMobileMenuOpen(prev => !prev);
    };
    window.addEventListener('toggle-hamburger-menu', handleToggle);
    return () => window.removeEventListener('toggle-hamburger-menu', handleToggle);
  }, []);

  // Sync currentConsultant state with localStorage and notify global AppPage Header
  useEffect(() => {
    if (isFirstSessionSyncRef.current) {
      isFirstSessionSyncRef.current = false;
      // Skip clearing the session if we are booting up and currentConsultant is null,
      // because the mount useEffect or other mechanisms will parse/load it soon.
      if (!currentConsultant) {
        const saved = localStorage.getItem('consultant_session');
        if (saved) {
          window.dispatchEvent(new CustomEvent('consultant-session-updated'));
          return;
        }
      }
    }

    if (currentConsultant) {
      saveConsultantSession(currentConsultant);
    } else {
      localStorage.removeItem('consultant_session');
    }
    window.dispatchEvent(new CustomEvent('consultant-session-updated'));
  }, [currentConsultant]);

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
      } catch (err: any) {
        if (err && err.message && err.message.includes('Failed to fetch')) {
          console.warn('Network connection is starting up or temporarily disconnected. Retrying plans shortly...');
        } else {
          console.error('Failed to load plans:', err);
        }
      }
    };
    fetchPlans();

    // Check if consultant already logged in during active session
    const saved = localStorage.getItem('consultant_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentConsultant(parsed);
          loadConsultantStatsAndStatus(parsed.id);
        } else {
          localStorage.removeItem('consultant_session');
        }
      } catch (e) {
        localStorage.removeItem('consultant_session');
      }
    }
  }, []);

  // Reset hasInitializedProfileRef whenever consultant changes or logs in/out
  useEffect(() => {
    hasInitializedProfileRef.current = false;
  }, [currentConsultant?.id]);

  // Sync registration price with selected plan's max rate on selection
  useEffect(() => {
    if (selectedPlanId && plans.length > 0) {
      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      if (selectedPlan) {
        const maxRate = selectedPlan.max_consultant_rate ?? 25;
        setRegisterPrice(maxRate.toString());
      }
    }
  }, [selectedPlanId, plans]);

  // Poll stats and sessions list every 4 seconds for incoming chat requests
  useEffect(() => {
    if (!currentConsultant) return;
    const interval = setInterval(() => {
      loadConsultantStatsAndStatus(currentConsultant.id, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentConsultant?.id]);

  // Fluctuating real-time earning index & performance values
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveVelocityScore(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return Math.max(68, Math.min(94, next));
      });
      setLiveCallFrequency(prev => {
        const fluctuation = (Math.random() * 0.4 - 0.2);
        const next = Number((prev + fluctuation).toFixed(1));
        return Math.max(4.2, Math.min(7.2, next));
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Real-time instant notification via WebSockets
  useEffect(() => {
    if (!currentConsultant) return;
    const socket = io({ transports: ['websocket'] });
    socket.on('session:created', (data) => {
      if (Number(data.consultant_id) === Number(currentConsultant.id)) {
        console.log('[WebSocket] Instant incoming chat request detected! Refreshing sessions immediately...');
        loadConsultantStatsAndStatus(currentConsultant.id, true);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [currentConsultant?.id]);

  // Trigger immediate refresh when a session finishes (activeSessionId transitions to falsy)
  useEffect(() => {
    if (currentConsultant && !activeSessionId) {
      loadConsultantStatsAndStatus(currentConsultant.id, true);
    }
  }, [activeSessionId, currentConsultant?.id]);

  // Logout handler
  function handleLogout() {
    localStorage.removeItem('consultant_session');
    localStorage.removeItem('current_role');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('current_role');
    }
    setCurrentConsultant(null);
    setWallet(null);
    setSessions([]);
    setCredentialsGenerated(null);
    setUsernameInput('');
    setPasswordInput('');
    hasInitializedProfileRef.current = false;
    if (onLogout) {
      onLogout();
    }
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

  const loadConsultantStatsAndStatus = async (id: number, isPolling = false, forceRefreshInputs = false) => {
    if (!id || isNaN(id)) {
      console.warn('loadConsultantStatsAndStatus bypassed due to invalid id:', id);
      return;
    }
    try {
      const res = await fetch(`/api/consultants/${id}/stats`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setWallet(data.wallet);
        setSessions(data.sessions);
        setSalaryInfo(data.salaryInfo);
        setManualAdjustments(data.manualAdjustments || []);
        if (data.loginHours) {
          setLoginHours(data.loginHours);
        }
      } else if (res.status === 404 || res.status === 401) {
        // Stale session, clean it up!
        handleLogout();
        return;
      }

      // Fetch blocked users
      const blockedRes = await fetch(`/api/consultants/${id}/blocked`);
      const blockedContentType = blockedRes.headers.get('content-type');
      if (blockedRes.ok && blockedContentType && blockedContentType.includes('application/json')) {
        const blockedData = await blockedRes.json();
        setBlockedUsers(blockedData);
      }

      // Fetch availability schedules only when not polling
      if (!isPolling) {
        fetchSchedules(id);
      }

      // Fetch complete profile info (including KYC and Bank statuses)
      const profileRes = await fetch(`/api/consultants/${id}/profile`);
      const profileContentType = profileRes.headers.get('content-type');
      if (profileRes.ok && profileContentType && profileContentType.includes('application/json')) {
        const matching = await profileRes.json() as Consultant;
        if (matching) {
          setIsOnline(matching.is_online === 1);
          setIsBusy(matching.is_busy === 1);
          
          // Always sync verification statuses
          setKycStatus(matching.kyc_status || 'unsubmitted');
          setKycRejectReason(matching.kyc_reject_reason || '');
          setBankStatus(matching.bank_status || 'unsubmitted');
          setBankRejectReason(matching.bank_reject_reason || '');

          setCurrentConsultant(matching);
          saveConsultantSession(matching);

          // Sync input states with server-side values on first load only so typing isn't interrupted
          if (!hasInitializedProfileRef.current || forceRefreshInputs) {
            setPhotoUrl(matching.photo_url || '');
            setBio(matching.bio || '');
            setPricePerMin(matching.price_per_minute !== undefined && matching.price_per_minute !== null ? matching.price_per_minute.toString() : '10');
            
            setAadhaarNumber(matching.aadhaar_number || '');
            setAadhaarPhotoUrl(matching.aadhaar_photo_url || '');
            setPanNumber(matching.pan_number || '');
            setPanPhotoUrl(matching.pan_photo_url || '');
            
            setBankAccountHolderName(matching.bank_account_holder_name || '');
            setBankAccountNumber(matching.bank_account_number || '');
            setBankIfscCode(matching.bank_ifsc_code || '');
            setBankName(matching.bank_name || '');

            setDisplayName(matching.display_name || '');
            setEmail(matching.email || '');
            setPhone((matching as any).phone || '');
            setCategory((matching as any).category || 'Consultants');
            setExperience((matching as any).experience?.toString() || '5');
            setLanguages((matching as any).languages || 'English, Hindi');
            setSpecializations((matching as any).specializations || 'General');

            hasInitializedProfileRef.current = true;
          }
        }
      }
    } catch (err: any) {
      if (err && err.message && err.message.includes('Failed to fetch')) {
        console.warn('Network connection is starting up or temporarily disconnected. Retrying consultant dataset shortly...');
      } else {
        console.error('Error fetching consultant dataset:', err);
      }
    }
  };

  // Login handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/consultants/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      setCurrentConsultant(data.consultant);
      saveConsultantSession(data.consultant);
      localStorage.removeItem('prefilled_consultant_login');
      setCredentialsGenerated(null);
      hasInitializedProfileRef.current = false;
      loadConsultantStatsAndStatus(data.consultant.id, false, true);
      setSuccess('Logged in successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBuyPlanDirect = async (planId: number, customDetails?: { username?: string; display_name?: string; category?: string; price_per_minute?: number }) => {
    if (!currentConsultant) return;
    setBuyingPlanId(planId);
    setError(null);
    setSuccess(null);

    try {
      // 1. Create the order on the backend
      const orderRes = await fetch('/api/consultants/register/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          email: currentConsultant.email,
          phone: currentConsultant.phone,
          consultant_id: currentConsultant.id,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initiate plan subscription order.');
      }

      // If the plan is free (is_free === true)
      if (orderData.is_free) {
        const buyRes = await fetch('/api/consultants/buy-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consultant_id: currentConsultant.id,
            plan_id: planId,
            is_mock: true,
            ...customDetails,
          }),
        });
        const buyData = await buyRes.json();
        if (!buyRes.ok) throw new Error(buyData.error || 'Failed to activate plan.');
        
        setSuccess('🎉 Plan activated successfully!');
        
        // Immediately sync local state with newly activated plan details
        if (buyData.consultant) {
          setCurrentConsultant(buyData.consultant);
          saveConsultantSession(buyData.consultant);
          setPricePerMin(buyData.consultant.price_per_minute !== undefined && buyData.consultant.price_per_minute !== null ? buyData.consultant.price_per_minute.toString() : '10');
          setPhotoUrl(buyData.consultant.photo_url || '');
          setBio(buyData.consultant.bio || '');

          const activatedPlan = plans.find(p => p.id === planId);
          setSubscriptionSuccessDetails({
            username: buyData.consultant.username,
            password: buyData.consultant.password,
            displayName: buyData.consultant.display_name,
            planName: activatedPlan ? activatedPlan.name : 'Partner Plan',
            expiry: buyData.consultant.plan_expiry ? new Date(buyData.consultant.plan_expiry).toLocaleDateString() : 'N/A'
          });
        }

        // Force refresh inputs to sync price and updated profile settings
        loadConsultantStatsAndStatus(buyData.consultant?.id || currentConsultant.id, false, true);
        setBuyingPlanId(null);
        return;
      }

      // Paid plan: Razorpay checkout
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // Initialize Razorpay Options
      const options: any = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CallMint Partner Subscription",
        description: `Activate Plan: ${orderData.plan_name || 'Partner Plan'}` + (orderData.is_mock ? ' (Test Mode)' : ''),
        handler: async function (response: any) {
          try {
            setSuccess('Payment successful! Activating your subscription plan...');
            const buyRes = await fetch('/api/consultants/buy-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                consultant_id: currentConsultant.id,
                plan_id: planId,
                order_id: response.razorpay_order_id || orderData.order_id,
                payment_id: response.razorpay_payment_id || 'pay_mock_' + Math.random().toString(36).slice(2, 11),
                signature: response.razorpay_signature || 'sig_mock',
                is_mock: orderData.is_mock,
                ...customDetails,
              }),
            });
            const buyData = await buyRes.json();
            if (!buyRes.ok) throw new Error(buyData.error || 'Failed to activate plan.');

            setSuccess('🎉 Plan activated successfully!');
            
            // Immediately sync local state with newly activated plan details
            if (buyData.consultant) {
              setCurrentConsultant(buyData.consultant);
              saveConsultantSession(buyData.consultant);
              setPricePerMin(buyData.consultant.price_per_minute !== undefined && buyData.consultant.price_per_minute !== null ? buyData.consultant.price_per_minute.toString() : '10');
              setPhotoUrl(buyData.consultant.photo_url || '');
              setBio(buyData.consultant.bio || '');

              const activatedPlan = plans.find(p => p.id === planId);
              setSubscriptionSuccessDetails({
                username: buyData.consultant.username,
                password: buyData.consultant.password,
                displayName: buyData.consultant.display_name,
                planName: activatedPlan ? activatedPlan.name : 'Partner Plan',
                expiry: buyData.consultant.plan_expiry ? new Date(buyData.consultant.plan_expiry).toLocaleDateString() : 'N/A'
              });
            }

            // Force refresh inputs to sync price and updated profile settings
            loadConsultantStatsAndStatus(buyData.consultant?.id || currentConsultant.id, false, true);
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBuyingPlanId(null);
          }
        },
        prefill: {
          name: customDetails?.display_name || currentConsultant.display_name,
          email: currentConsultant.email,
          contact: currentConsultant.phone,
        },
        theme: {
          color: '#10B981',
        },
      };

      if (!orderData.is_mock) {
        options.order_id = orderData.order_id;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(`Plan Payment failed: ${resp.error.description || 'Unknown error'}`);
        setBuyingPlanId(null);
      });
      rzp.open();

      // If it is mock, immediately auto-trigger success helper to simulate seamless flow
      if (orderData.is_mock) {
        setTimeout(() => {
          options.handler({
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).slice(2, 11),
            razorpay_signature: 'sig_mock',
          });
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message);
      setBuyingPlanId(null);
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

  // Register / Purchase Plan
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    if (!registerDisplayName) {
      setError('Please provide your Display Name');
      return;
    }
    if (!registerEmail) {
      setError('Please provide your Email Address');
      return;
    }
    const numericPhone = registerPhone.replace(/\D/g, '');
    if (numericPhone.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }
    const rateVal = parseFloat(registerPrice);
    if (isNaN(rateVal) || rateVal < 5) {
      setError('Minimum consultation fee limit is ₹5/min. Isse below price set nahi ho sakta.');
      return;
    }
    const selectedPlan = plans.find(p => p.id === selectedPlanId);
    if (selectedPlan && selectedPlan.max_consultant_rate !== undefined && rateVal > selectedPlan.max_consultant_rate) {
      setError(`Your rate cannot be higher than the selected plan's maximum rate of ₹${selectedPlan.max_consultant_rate}/minute.`);
      return;
    }
    try {
      // 1. Create order on the backend with pre-verification of credentials
      const orderRes = await fetch('/api/consultants/register/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan_id: selectedPlanId,
          email: registerEmail,
          phone: '+91' + numericPhone,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to initiate plan order');

      if (orderData.is_free) {
        // Direct free registration
        const res = await fetch('/api/consultants/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan_id: selectedPlanId,
            display_name: registerDisplayName,
            username: registerUsername,
            email: registerEmail,
            phone: '+91' + numericPhone,
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
        localStorage.setItem('prefilled_consultant_login', JSON.stringify({
          username: data.username,
          password: data.password,
          displayName: data.display_name,
        }));
        setRegisterDisplayName('');
        setRegisterEmail('');
        setRegisterPhone('');
        setUsernameInput(data.username);
        setPasswordInput(data.password);
        localStorage.removeItem('pre_filled_consultant_signup');
        setIsPrefilled(false);
      } else {
        // Paid plan: Razorpay flow (Mock or Real)
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
        }

        // Initialize REAL Razorpay Checkout Modal
        const options: any = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "CallMint Consultant Partnership",
          description: `Subscribe to plan: ${orderData.plan_name || 'Partner Plan'}` + (orderData.is_mock ? ' (Test Mode)' : ''),
          handler: async function (response: any) {
            try {
              const res = await fetch('/api/consultants/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  plan_id: selectedPlanId,
                  display_name: registerDisplayName,
                  username: registerUsername,
                  email: registerEmail,
                  phone: '+91' + numericPhone,
                  initial_price_per_minute: parseFloat(registerPrice),
                  category: registerCategory,
                  order_id: orderData.order_id,
                  payment_id: response.razorpay_payment_id || 'mock_payment_id',
                  signature: response.razorpay_signature || 'mock_signature',
                  is_mock: orderData.is_mock
                })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Verification & registration failed');

              setCredentialsGenerated({
                username: data.username,
                password: data.password,
                displayName: data.display_name,
              });
              localStorage.setItem('prefilled_consultant_login', JSON.stringify({
                username: data.username,
                password: data.password,
                displayName: data.display_name,
              }));
              setRegisterDisplayName('');
              setRegisterEmail('');
              setRegisterPhone('');
              setUsernameInput(data.username);
              setPasswordInput(data.password);
              localStorage.removeItem('pre_filled_consultant_signup');
              setIsPrefilled(false);
            } catch (err: any) {
              setError(err.message);
            }
          },
          prefill: {
            name: registerDisplayName,
            email: registerEmail,
            contact: '+91' + numericPhone,
          },
          theme: {
            color: '#10B981'
          }
        };

        // Only pass order_id if it's NOT a mock order to avoid Razorpay validation error
        if (!orderData.is_mock) {
          options.order_id = orderData.order_id;
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setError(`Registration Payment failed: ${resp.error.description || 'Unknown error'}`);
        });
        rzp.open();
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('already registered') || errMsg.toLowerCase().includes('email is already registered')) {
        setEmailError(errMsg);
      } else {
        setError(errMsg);
      }
    }
  };



  // Update Profile Settings
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConsultant) return;
    setError(null);
    setProfileFeedbackError(null);
    setProfileFeedbackSuccess(null);
    try {
      const activePlan = plans.find(p => p.id === wallet?.plan_id);
      const maxRate = activePlan?.max_consultant_rate ?? 1000.0;
      const priceVal = parseFloat(pricePerMin);
      
      if (!isNaN(priceVal) && priceVal < 5) {
        throw new Error('Minimum consultation fee limit is ₹5/min. Isse below price set nahi ho sakta.');
      }

      if (!isNaN(priceVal) && priceVal > maxRate) {
        throw new Error(`you can set max price (₹${maxRate}/min) in this Plan.`);
      }

      // Track changes before the PUT request
      const changes: ProfileChangeItem[] = [];
      if ((currentConsultant.photo_url || '') !== (photoUrl || '')) {
        changes.push({ field: 'Profile Photo', oldValue: currentConsultant.photo_url || '', newValue: photoUrl || '', isImage: true });
      }
      if ((currentConsultant.bio || '') !== (bio || '')) {
        changes.push({ field: 'Bio', oldValue: currentConsultant.bio || 'None', newValue: bio || 'None' });
      }
      const oldPrice = currentConsultant.price_per_minute !== undefined ? currentConsultant.price_per_minute : 0;
      if (oldPrice !== priceVal) {
        changes.push({ field: 'Rate per Minute', oldValue: `₹${oldPrice}/min`, newValue: `₹${priceVal}/min` });
      }

      const updateBody: any = {
        photo_url: photoUrl,
        bio: bio,
        price_per_minute: priceVal,
        display_name: displayName,
        email: email,
        phone: phone,
        category: category,
        experience: experience !== '' ? parseInt(experience) : 5,
        languages: languages,
        specializations: specializations,
      };
      if (newPassword && newPassword !== '') {
        updateBody.password = newPassword;
      }

      const res = await fetch(`/api/consultants/${currentConsultant.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile changes');
      
      setSuccess('Profile updated successfully!');
      setProfileFeedbackSuccess('profile saved successfully');
      setProfileFeedbackError(null);
      
      // Sync local state inputs immediately with updated values from server
      if (data.photo_url !== undefined) setPhotoUrl(data.photo_url || '');
      if (data.bio !== undefined) setBio(data.bio || '');
      if (data.price_per_minute !== undefined) setPricePerMin(data.price_per_minute !== null ? data.price_per_minute.toString() : '10');
      if (data.display_name !== undefined) setDisplayName(data.display_name || '');
      if (data.email !== undefined) setEmail(data.email || '');
      if (data.phone !== undefined) setPhone(data.phone || '');
      if (data.category !== undefined) setCategory(data.category || 'Consultants');
      if (data.experience !== undefined) setExperience(data.experience !== null ? data.experience.toString() : '5');
      if (data.languages !== undefined) setLanguages(data.languages || 'English, Hindi');
      if (data.specializations !== undefined) setSpecializations(data.specializations || 'General');
      setNewPassword('');

      // Persist to currentConsultant state and local storage so UI doesn't revert
      const updatedConsultant = { ...currentConsultant, ...data };
      setCurrentConsultant(updatedConsultant);
      saveConsultantSession(updatedConsultant);

      // Force loadConsultantStatsAndStatus to re-fetch and update
      await loadConsultantStatsAndStatus(currentConsultant.id);
      
      setProfileChangesList(changes);
      setIsSuccessModalOpen(true);

      setTimeout(() => {
        setSuccess(null);
        setProfileFeedbackSuccess(null);
      }, 4000);
    } catch (err: any) {
      setError(err.message);
      setProfileFeedbackError(err.message);
      setProfileFeedbackSuccess(null);
    }
  };

  // Upload and submit KYC Handlers
  const handleAadhaarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size is too large. Please select a photo below 5MB.');
      setKycFeedbackError('File size is too large. Please select a photo below 5MB.');
      return;
    }

    const allowedExtensions = ['png', 'jpg', 'jpeg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension || '')) {
      setError('Only PNG and JPG/JPEG files are supported.');
      setKycFeedbackError('Only PNG and JPG/JPEG files are supported.');
      return;
    }

    setUploadingAadhaar(true);
    setError(null);
    setSuccess(null);
    setKycFeedbackError(null);
    setKycFeedbackSuccess(null);

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
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          
          setAadhaarPhotoUrl(data.photo_url);
          setSuccess('Aadhaar card photo successfully uploaded!');
          setKycFeedbackSuccess('Aadhaar card photo successfully uploaded!');
          setTimeout(() => {
            setSuccess(null);
            setKycFeedbackSuccess(null);
          }, 3000);
        } catch (uploadErr: any) {
          setError(uploadErr.message);
          setKycFeedbackError(uploadErr.message);
        } finally {
          setUploadingAadhaar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message);
      setKycFeedbackError(err.message);
      setUploadingAadhaar(false);
    }
  };

  const handlePanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size is too large. Please select a photo below 5MB.');
      setKycFeedbackError('File size is too large. Please select a photo below 5MB.');
      return;
    }

    const allowedExtensions = ['png', 'jpg', 'jpeg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension || '')) {
      setError('Only PNG and JPG/JPEG files are supported.');
      setKycFeedbackError('Only PNG and JPG/JPEG files are supported.');
      return;
    }

    setUploadingPan(true);
    setError(null);
    setSuccess(null);
    setKycFeedbackError(null);
    setKycFeedbackSuccess(null);

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
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          
          setPanPhotoUrl(data.photo_url);
          setSuccess('PAN card photo successfully uploaded!');
          setKycFeedbackSuccess('PAN card photo successfully uploaded!');
          setTimeout(() => {
            setSuccess(null);
            setKycFeedbackSuccess(null);
          }, 3000);
        } catch (uploadErr: any) {
          setError(uploadErr.message);
          setKycFeedbackError(uploadErr.message);
        } finally {
          setUploadingPan(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message);
      setKycFeedbackError(err.message);
      setUploadingPan(false);
    }
  };

  const handleUpdateKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConsultant) return;
    setError(null);
    setSuccess(null);
    setKycFeedbackError(null);
    setKycFeedbackSuccess(null);
    try {
      if (!aadhaarNumber || !aadhaarPhotoUrl || !panNumber || !panPhotoUrl) {
        throw new Error("Aadhaar card number, Aadhaar photo, PAN number, and PAN photo are all required to submit KYC.");
      }

      const trimmedAadhaar = aadhaarNumber.trim();
      const trimmedPan = panNumber.trim().toUpperCase();

      setAadhaarNumber(trimmedAadhaar);
      setPanNumber(trimmedPan);
      
      const res = await fetch(`/api/consultants/${currentConsultant.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaar_number: trimmedAadhaar,
          aadhaar_photo_url: aadhaarPhotoUrl,
          pan_number: trimmedPan,
          pan_photo_url: panPhotoUrl,
          kyc_status: 'pending'
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit KYC details');
      
      const successMsg = 'KYC successfully submitted! Under Admin review now.';
      setSuccess(successMsg);
      setKycFeedbackSuccess(successMsg);
      setKycStatus('pending');
      
      await loadConsultantStatsAndStatus(currentConsultant.id);
      setTimeout(() => {
        setSuccess(null);
        setKycFeedbackSuccess(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message);
      setKycFeedbackError(err.message);
    }
  };

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConsultant) return;
    setError(null);
    setSuccess(null);
    setBankFeedbackError(null);
    setBankFeedbackSuccess(null);
    try {
      if (!bankAccountHolderName || !bankAccountNumber || !bankIfscCode || !bankName) {
        throw new Error("All fields (Account Holder Name, Account Number, IFSC code, Bank Name) are required.");
      }

      const trimmedHolder = bankAccountHolderName.trim();
      const trimmedNumber = bankAccountNumber.trim();
      const trimmedIfsc = bankIfscCode.trim().toUpperCase();
      const trimmedBank = bankName.trim();

      setBankAccountHolderName(trimmedHolder);
      setBankAccountNumber(trimmedNumber);
      setBankIfscCode(trimmedIfsc);
      setBankName(trimmedBank);

      // 1. Holder Name Validation: Only alphabets and spaces
      const holderNameRegex = /^[A-Za-z\s]+$/;
      if (!holderNameRegex.test(trimmedHolder)) {
        throw new Error("Account Holder Name must contain only alphabets and spaces.");
      }
      if (trimmedHolder.length < 2) {
        throw new Error("Account Holder Name must be at least 2 characters long.");
      }

      // 2. Account Number Validation: Max length 18, Min length 9
      if (trimmedNumber.length > 18) {
        throw new Error("Account Number cannot be longer than 18 digits.");
      }
      if (trimmedNumber.length < 9) {
        throw new Error("Account Number must be at least 9 digits long.");
      }

      // 3. IFSC Code Validation: Standard Indian 11-character format
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(trimmedIfsc)) {
        throw new Error("Invalid IFSC Code format. It must be an 11-character alphanumeric code matching the standard format (e.g., SBIN0001234): 4 letters, followed by '0', followed by 6 alphanumeric characters.");
      }

      // 4. Bank Name Validation: Prevent invalid or random values
      const bankNameRegex = /^[A-Za-z\s.\-&()]+$/;
      if (trimmedBank.length < 3) {
        throw new Error("Bank Name must be at least 3 characters long.");
      }
      if (!bankNameRegex.test(trimmedBank)) {
        throw new Error("Bank Name must contain only alphabets, spaces, dots, hyphens, ampersands, or parentheses.");
      }
      if (/(.)\1\1\1/.test(trimmedBank.toLowerCase())) {
        throw new Error("Please enter a valid Bank Name (avoid repetitive keyboard spam).");
      }
      const lowerBankName = trimmedBank.toLowerCase();
      const gibberishWords = ["asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop", "zxcv", "xcvb", "cvbn", "vbnm"];
      for (const word of gibberishWords) {
        if (lowerBankName.includes(word)) {
          throw new Error("Please enter a valid, standard Bank Name.");
        }
      }
      
      const res = await fetch(`/api/consultants/${currentConsultant.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_account_holder_name: trimmedHolder,
          bank_account_number: trimmedNumber,
          bank_ifsc_code: trimmedIfsc,
          bank_name: trimmedBank,
          bank_status: 'pending'
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit Bank details');
      
      const successMsg = 'Bank details successfully updated! Under Admin review now.';
      setSuccess(successMsg);
      setBankFeedbackSuccess(successMsg);
      setBankStatus('pending');
      
      await loadConsultantStatsAndStatus(currentConsultant.id);
      setTimeout(() => {
        setSuccess(null);
        setBankFeedbackSuccess(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message);
      setBankFeedbackError(err.message);
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
        <div className="space-y-16 py-4 animate-in fade-in duration-300 text-slate-100">
          
          {/* Funnel Navigation Bar */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 shadow-inner">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-sans font-bold tracking-widest text-emerald-400 uppercase">Consultant Suite</span>
                <h1 className="text-sm font-black font-sans text-slate-100 uppercase tracking-tight">Expert Partner Network</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-[11px] text-slate-400 hidden md:inline font-sans">Already a registered expert?</span>
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-4.5 py-2.5 rounded-xl transition-all flex items-center space-x-2 shadow-lg hover:shadow-emerald-500/10"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login to Dashboard</span>
              </button>
            </div>
          </div>

          {/* Premium Hero Section with 3D Kinetic Animation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-4">
            {/* Hero Text & Value Proposition */}
            <div className="lg:col-span-7 text-left space-y-6">
              <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-400">
                  India's #1 Pay-Per-Minute Chat Portal
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-sans text-slate-100 tracking-tight leading-tight">
                Scale Your Passion into a <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">Pro Consulting</span> Business
              </h2>

              <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                Create your personalized, secure chat channel in less than 2 minutes. Charge global clients per minute to consult in Astrology, Business Coaching, Health, Law, or Mentorship. Every chat session is fully pre-paid by clients so you never lose a rupee to unpaid invoices.
              </p>

              {/* Value Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-200">100% Pre-Paid</span>
                    <span className="text-[10px] text-slate-500 block">Clients pay upfront</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                  <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-200">Instant Payouts</span>
                    <span className="text-[10px] text-slate-500 block">Direct wallet sync</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-sky-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-slate-200">Your Share Link</span>
                    <span className="text-[10px] text-slate-500 block">Share on social media</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <a
                  href="#pricing-section"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider text-center transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2"
                >
                  <span>Select Plan & Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#calculator-section"
                  className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center space-x-2"
                >
                  <span>Estimate My Revenue</span>
                </a>
              </div>
            </div>

            {/* 3D Kinetic Animated Hero Visual */}
            <div className="lg:col-span-5 relative flex items-center justify-center [perspective:1200px] overflow-visible py-8 lg:py-0">
              <motion.div
                animate={{
                  y: [0, -12, 0],
                  rotateY: [-12, -8, -12],
                  rotateX: [12, 16, 12],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative w-full max-w-[340px] aspect-[3/4] bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800/80 shadow-[0_25px_60px_rgba(16,185,129,0.15)] flex flex-col justify-between overflow-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Background decorative cosmic grids */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(0,0,0,0))] pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0)_0%,rgba(15,23,42,0.9)_90%)] pointer-events-none" />

                {/* Simulated Portal Top Header */}
                <div className="flex items-center justify-between border-b border-slate-850 pb-3 z-10">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-sans font-bold tracking-wider text-slate-400">EXPERT CONSOLE</span>
                  </div>
                  <span className="text-[9px] bg-slate-850 text-emerald-400 px-2 py-0.5 rounded-full font-mono border border-emerald-500/10">
                    ONLINE
                  </span>
                </div>

                {/* Floating Earnings card with shimmer (3D Layered) */}
                <motion.div
                  style={{ translateZ: 50 }}
                  animate={{
                    y: [0, -6, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-2 z-10"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 font-sans uppercase">Live Wallet Balance</span>
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <strong className="text-2xl font-black font-mono text-emerald-400 tracking-tight">₹32,450.00</strong>
                    <span className="text-[9px] text-slate-500 font-sans">Synced</span>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 w-3/4 rounded-full animate-pulse" />
                  </div>
                </motion.div>

                {/* Floating live active chat bubble (3D Layered) */}
                <motion.div
                  style={{ translateZ: 80 }}
                  animate={{
                    y: [0, 8, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                  className="bg-slate-900/90 backdrop-blur border border-slate-800 p-3.5 rounded-xl shadow-2xl flex items-start space-x-3 z-10 self-end w-11/12 border-l-4 border-l-emerald-500"
                >
                  <div className="bg-emerald-500/10 p-1.5 rounded text-emerald-400 shrink-0">
                    <Flame className="w-3.5 h-3.5 animate-bounce" />
                  </div>
                  <div className="space-y-1 text-left flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-200">Aman (Client)</span>
                      <span className="text-[8px] text-slate-500 font-sans">1:45 remaining</span>
                    </div>
                    <p className="text-[9px] text-slate-400 italic truncate">"Highly accurate predictions! Saved my job decision..."</p>
                  </div>
                </motion.div>

                {/* Floating Pro Badges (3D Layered) */}
                <motion.div
                  style={{ translateZ: 40 }}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between z-10"
                >
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-300 block">Pro Verified Status</span>
                      <span className="text-[8px] text-slate-500 block">Priority feed activated</span>
                    </div>
                  </div>
                  <div className="flex space-x-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Interactive Dynamic Earnings Potential Calculator */}
          <div id="calculator-section" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-left space-y-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <TrendingUp className="w-48 h-48 text-emerald-400" />
            </div>
            
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-400">💡 Profit Simulator</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-100">Calculate Your Potential Monthly Earnings</h3>
              <p className="text-xs text-slate-400">Set your customized per-minute call fee and average chat duration per day to estimate profits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4 items-center relative z-10">
              <div className="md:col-span-7 space-y-6">
                {/* Rate Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <label className="text-slate-400 font-bold uppercase">My Custom Per-Minute Rate (₹)</label>
                    <span className="text-emerald-400 font-bold">₹{simulatedRate} / minute</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="5"
                    value={simulatedRate}
                    onChange={(e) => {
                      setSimulatedRate(parseInt(e.target.value));
                      setRegisterPrice(e.target.value);
                    }}
                    className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                    <span>₹10 / min</span>
                    <span>₹80 / min</span>
                    <span>₹150 / min</span>
                  </div>
                </div>

                {/* Duration Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <label className="text-slate-400 font-bold uppercase">Average Active Minutes Per Day</label>
                    <span className="text-sky-400 font-bold">{simulatedMinutes} Minutes / day</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="240"
                    step="15"
                    value={simulatedMinutes}
                    onChange={(e) => setSimulatedMinutes(parseInt(e.target.value))}
                    className="w-full accent-sky-500 h-2 bg-slate-950 rounded-lg cursor-pointer appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                    <span>15 mins</span>
                    <span>2 hours</span>
                    <span>4 hours</span>
                  </div>
                </div>
              </div>

              {/* Estimate Output Panel */}
              <div className="md:col-span-5 bg-slate-950 p-6 rounded-2xl border border-slate-850 text-center space-y-4">
                <div>
                  <span className="text-[9px] text-slate-500 font-sans uppercase tracking-widest block">Projected Monthly Profit</span>
                  <strong className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight block mt-1">
                    ₹{(simulatedRate * simulatedMinutes * 30).toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-slate-500 block mt-1">Based on 30 active billing days</span>
                </div>

                <div className="h-px bg-slate-900" />

                <div className="grid grid-cols-2 gap-2 text-left text-[10px] font-sans">
                  <div>
                    <span className="text-slate-500 block">Daily Revenue:</span>
                    <strong className="text-slate-200">₹{(simulatedRate * simulatedMinutes).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Yearly Forecast:</span>
                    <strong className="text-slate-200">₹{(simulatedRate * simulatedMinutes * 365).toLocaleString()}</strong>
                  </div>
                </div>

                <a
                  href="#pricing-section"
                  className="block bg-slate-900 hover:bg-slate-850 text-emerald-400 border border-slate-800 hover:border-emerald-500/20 text-xs py-2 rounded-xl font-bold transition-all"
                >
                  ⚡ Claim Your Direct Listing Now
                </a>
              </div>
            </div>
          </div>

          {/* Bento Grid: Why Join Our Partner Network */}
          <div className="space-y-8 text-center">
            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-400">📦 Key Benefits</span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-100">Engineered for Modern Professional Consultants</h3>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">No complex invoicing, no client follow-ups, and no technical headaches. Focus purely on your advice.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 w-fit">
                  <Globe className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Instant Share Link</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-normal">Get your dedicated URL like "/u/expert_raj". Embed it directly in your Instagram Bio, YouTube descriptions, or send via WhatsApp.</p>
                </div>
              </div>

              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                <div className="bg-sky-500/10 p-3 rounded-xl border border-sky-500/20 w-fit">
                  <ShieldCheck className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Zero Payment Risks</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-normal">Sessions are pre-authorized. We verify the client has active wallet balance before starting, automatically billing them per minute.</p>
                </div>
              </div>

              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 w-fit">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Automated Analytics</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-normal">Track active chats, session statistics, client satisfaction ratings, and daily/monthly earning trends from one integrated dashboard.</p>
                </div>
              </div>

              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 w-fit">
                  <Settings2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Complete Rate Control</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-normal">You are the boss. Set and modify your calling rate per minute at any time, instantly updating the dynamic booking button on your page.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription pricing packages with elaborate pointers */}
          <div id="pricing-section" className="space-y-8 text-center pt-4">
            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-400">📊 STEP 1: CHOOSE A PARTNER PLAN</span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-100">Simple, Predictable Subscription Packages</h3>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">Select a subscription duration below to instantly generate your portal credentials and activate your direct chat booking link.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto items-stretch">
              {plans.map((plan, index) => {
                const isGold = plan.name.toLowerCase().includes('gold');
                const isPlatinum = plan.name.toLowerCase().includes('platinum');
                
                // Detailed pointers/features based on plan
                let featurePointers: string[] = [];
                if (plan.name.toLowerCase().includes('silver')) {
                  featurePointers = [
                    "Standard profile listing in chosen category",
                    "Live Chat & Pay-Per-Minute Integration",
                    "Real-Time Daily Analytics & Wallet Hub",
                    "Custom Shareable Booking Address (/u/username)",
                    "Standard email delivery for portal credentials",
                    "Standard ticket-based partner support"
                  ];
                } else if (plan.name.toLowerCase().includes('gold')) {
                  featurePointers = [
                    "All Silver features included",
                    "🔥 High Visibility priority in browse feeds",
                    "⚡ Featured 'Pro Partner' badge on listing",
                    "Priority search page ranking placement",
                    "Extended 90-day continuous subscription",
                    "Standard support ticket assistance priority"
                  ];
                } else {
                  featurePointers = [
                    "All Gold features included",
                    "💎 Elite top-carousel homepage promotion placement",
                    "⚡ Premium 'Star Verified Expert' tickmark",
                    "🎧 Dedicated account manager & 24/7 support channel",
                    "Instant payout processing priority options",
                    "Ultimate 180-day subscription for peak cost savings"
                  ];
                }

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all ${
                      selectedPlanId === plan.id
                        ? 'bg-slate-900 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/5'
                        : isGold
                        ? 'bg-slate-900/60 border border-slate-800 hover:border-emerald-500/20 shadow-md'
                        : 'bg-slate-900/40 border border-slate-800 hover:border-slate-700 shadow-md'
                    }`}
                  >
                    {isGold && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[10px] font-mono font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                        Best Value
                      </span>
                    )}
                    {isPlatinum && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-mono font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                        Elite VIP Partner
                      </span>
                    )}

                    <div className="space-y-6">
                      {/* Card Header */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                          {plan.name}
                        </span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-3xl font-black text-slate-100">₹{plan.price}</span>
                          <span className="text-xs text-slate-500">/ {plan.duration_days} Days</span>
                        </div>
                        <p className="text-xs text-slate-400 font-sans leading-relaxed min-h-[40px]">
                          {plan.description}
                        </p>
                      </div>

                      <div className="h-px bg-slate-850" />

                      {/* Feature Pointers */}
                      <ul className="space-y-3">
                        {featurePointers.map((feat, i) => (
                          <li key={i} className="flex items-start space-x-2 text-xs">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-slate-300 leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          const el = document.getElementById('signup-form-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                          selectedPlanId === plan.id
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg'
                            : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {selectedPlanId === plan.id ? '⚡ Package Selected' : 'Choose Plan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Registration form Funnel Step 3 */}
          <div id="signup-form-section" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-left max-w-4xl mx-auto space-y-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-850">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                <UserCheck className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-sans font-bold tracking-widest text-emerald-400 uppercase">STEP 2: REGISTER PROFILE</span>
                <h3 className="text-xl font-black text-slate-100">Activate Consultant Credentials</h3>
                <p className="text-xs text-slate-400">Fill your professional details to simulate payment and generate portal credentials immediately.</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* Plan Selection Summary badge */}
              {(() => {
                const selectedPlan = plans.find(p => p.id === selectedPlanId);
                const basePrice = selectedPlan?.price || 0;
                const gstAmount = basePrice * 0.18;
                const totalPrice = basePrice + gstAmount;
                return (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-500 font-sans uppercase block">Active Choice:</span>
                        <strong className="text-sm font-bold text-slate-200">
                          {selectedPlan?.name || 'Loading Subscription Plan...'}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 font-sans block">Base Price:</span>
                        <strong className="text-sm font-black text-slate-300 font-mono">
                          ₹{basePrice.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-xs">
                      <div className="text-slate-400">
                        GST (Exclusive 18%)
                      </div>
                      <div className="text-amber-500 font-mono">
                        +₹{gstAmount.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-900 pt-2">
                      <div className="text-xs font-bold text-slate-300">
                        Total Amount Payable
                      </div>
                      <div className="text-base font-black text-emerald-400 font-mono">
                        ₹{totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Form Input fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-wide">
                    Consultant Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acharya Raj Shastri"
                    value={registerDisplayName}
                    onChange={(e) => setRegisterDisplayName(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all"
                    required
                  />
                  <span className="text-[9px] text-slate-500 block">Name visible to clients on the portal listing.</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-wide">
                    Custom Advisor Username
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. expert_raj"
                    value={registerUsername}
                    onChange={(e) => {
                      isUsernameManuallyEditedRef.current = true;
                      setRegisterUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    }}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all font-mono"
                    required
                  />
                  <span className="text-[9px] text-slate-500 block">Your public listing profile URL will be <strong className="text-slate-300">/u/{registerUsername || 'username'}</strong>.</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-wide">
                    Consultant Email Address (for Credentials)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. raj.astrologer@gmail.com"
                    value={registerEmail}
                    onChange={(e) => {
                      if (isPrefilled) return;
                      setRegisterEmail(e.target.value);
                      setEmailError(null);
                    }}
                    readOnly={isPrefilled}
                    className={`bg-slate-950 border rounded-xl px-4 py-2.5 text-sm w-full transition-all ${
                      isPrefilled ? 'cursor-not-allowed bg-slate-900/50 text-slate-400 border-slate-800' :
                      emailError ? 'border-rose-500 text-slate-100 focus:outline-none focus:ring-1 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-850 text-slate-100 focus:outline-none focus:ring-1 focus:border-emerald-500 focus:ring-emerald-500'
                    }`}
                    required
                  />
                  {emailError ? (
                    <span className="text-[11px] text-rose-400 font-bold block mt-1 animate-pulse">{emailError}</span>
                  ) : (
                    <span className="text-[9px] text-slate-500 block">
                      {isPrefilled ? 'This field is locked as verified from signup form.' : 'We will use this email to associate your security record.'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-wide">
                    Consultant Phone Number (Mandatory)
                  </label>
                  <div className={`relative flex rounded-xl border items-center transition-colors overflow-hidden ${
                    isPrefilled ? 'border-slate-800 bg-slate-900/50 cursor-not-allowed' : 'border-slate-850 bg-slate-950 focus-within:border-emerald-500'
                  }`}>
                    <div className="flex items-center pl-3.5 pr-2 py-2.5 bg-slate-900 border-r border-slate-850 shrink-0">
                      <span className="text-xs font-bold text-slate-300 font-mono">+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={registerPhone}
                      onChange={(e) => {
                        if (isPrefilled) return;
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) {
                          setRegisterPhone(val);
                        }
                      }}
                      readOnly={isPrefilled}
                      className={`w-full bg-transparent border-0 pl-3 pr-4 py-2.5 text-xs focus:outline-none ${
                        isPrefilled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-100'
                      }`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block">
                    {isPrefilled ? 'This field is locked as verified from signup form.' : 'Required for authentication and communication.'}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                    <span>My Custom Audio/Chat Rate (₹ / Minute)</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full font-bold">Capped by Plan</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    placeholder="25"
                    value={registerPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selectedPlan = plans.find(p => p.id === selectedPlanId);
                      const maxRate = selectedPlan?.max_consultant_rate ?? 1000.0;
                      if (val === '') {
                        setRegisterPrice('');
                      } else {
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                          if (num <= maxRate) {
                            setRegisterPrice(val);
                          } else {
                            setRegisterPrice(maxRate.toString());
                          }
                        }
                      }
                    }}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-sm w-full transition-all font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  <div className="flex items-center space-x-1 text-emerald-400 font-semibold text-[10px] mt-1">
                    <span>Max rate allowed by chosen plan: ₹{plans.find(p => p.id === selectedPlanId)?.max_consultant_rate ?? 25}/minute. You can type any rate up to this.</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-sans font-bold text-slate-400 uppercase tracking-wide">
                    My Professional Category
                  </label>
                  <select
                    value={registerCategory}
                    onChange={(e: any) => setRegisterCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all"
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
                  <span className="text-[9px] text-slate-500 block">Correct categorisation helps clients search you faster.</span>
                </div>
              </div>

              {/* Secure transaction disclaimer */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs text-slate-400 flex items-start space-x-3">
                <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">
                  By clicking register, you will pay using our secure Razorpay gateway checkout. This instantly deploys your public bio page at <strong className="text-slate-200">/u/[username]</strong> and prepares secure login credentials.
                </span>
              </div>

              {/* Submit CTA button */}
              <button
                type="submit"
                id="consultant-register-btn"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded-xl font-bold text-xs uppercase tracking-widest w-full transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Pay & Register Account</span>
              </button>
            </form>

            {/* Generated Credentials Area (shown right below the form) */}
            {credentialsGenerated && (
              <div className="bg-emerald-950/80 border border-emerald-800 p-6 rounded-2xl space-y-4 animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <UserCheck className="w-5 h-5 animate-bounce" />
                  <span className="uppercase tracking-widest font-sans">🌟 PORTAL ACCOUNT ACTIVE & REGISTERED!</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Your registration is complete. We have auto-filled your credentials below. Save these securely so you can log into your consultant dashboard anytime:
                </p>
                
                <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs space-y-2 text-slate-200 border border-slate-900 relative">
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      onClick={() => {
                        const copyTxt = `Username: ${credentialsGenerated.username}\nPassword: ${credentialsGenerated.password}`;
                        navigator.clipboard.writeText(copyTxt);
                        alert('Credentials copied to clipboard securely!');
                      }}
                      className="text-slate-500 hover:text-white p-1 hover:bg-slate-900 rounded transition-all flex items-center space-x-1"
                      title="Copy All Credentials"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Copy</span>
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-500">Platform Username:</span> <strong className="text-slate-100 select-all">{credentialsGenerated.username}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Secure Password:</span> <strong className="text-slate-100 select-all">{credentialsGenerated.password}</strong>
                  </div>
                </div>

                <div className="bg-slate-900/40 p-3 rounded-xl border border-emerald-500/10 text-[10px] text-emerald-400 font-mono">
                  💡 We have loaded your username/password above. Simply click the "Login to Dashboard" button to start managing your consulting channel.
                </div>

                <button
                  type="button"
                  id="instant-dashboard-login-btn"
                  onClick={() => handleLogin()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 w-full shadow-lg border border-emerald-400/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login to Dashboard</span>
                </button>
              </div>
            )}
          </div>

          {/* Secure Login Overlay Modal */}
          {showLoginModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop blur */}
              <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={() => setShowLoginModal(false)}
              />

              {/* Modal Box */}
              <div className="relative w-full max-w-md bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-5 overflow-hidden animate-in zoom-in-95 duration-200 z-10 text-left">
                
                {/* Header row with Icon, Title, and Close Button */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-850 gap-4">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="bg-emerald-500/10 p-2 rounded-xl shrink-0">
                      <Key className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h2 className="text-base font-bold text-slate-100 truncate">Consultant Login</h2>
                  </div>
                  
                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="text-slate-500 hover:text-slate-300 font-sans text-xs px-2.5 py-1 bg-slate-950 border border-slate-850 rounded-lg hover:border-slate-750 transition-all shrink-0"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Secure login helper / description shown on separate line below the header */}
                <p className="text-xs text-slate-400 font-sans leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-850/40">
                  Sign in to manage chats & withdraw live earnings
                </p>

                <form 
                  onSubmit={async (e) => {
                    await handleLogin(e);
                    // Close modal on successful login
                    setShowLoginModal(false);
                  }} 
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-sans text-slate-400 mb-2 uppercase tracking-wide">
                      Platform Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. expert_raj_4920"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 w-full font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-sans text-slate-400 mb-2 uppercase tracking-wide">
                      Secure Account Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 w-full"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    id="consultant-login-btn"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded-xl font-bold text-xs uppercase tracking-wider w-full transition-all flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Log In to Portal</span>
                  </button>
                </form>

                {credentialsGenerated && (
                  <div className="bg-emerald-950/80 border border-emerald-850 p-4 rounded-xl space-y-2">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-[10px] uppercase font-mono">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Copied Account Auto-Fill Ready</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded font-mono text-[10px] space-y-1 text-slate-300 border border-slate-900">
                      <div><span className="text-slate-500">User:</span> {credentialsGenerated.username}</div>
                      <div><span className="text-slate-500">Pass:</span> {credentialsGenerated.password}</div>
                    </div>
                    <span className="text-[9px] text-slate-500 block">Username and password have been preset in the form. Just click "Log In to Portal".</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
            className="text-xs text-rose-400 hover:underline hover:text-rose-300 font-bold font-sans mt-4"
          >
            Reset Session / Login Again
          </button>
        </div>
      )}

      {currentConsultant && wallet && (
        <div className="space-y-6 text-slate-100">
          
          {/* GLOBAL INCOMING CHAT BANNER - Always visible across all tabs for instant response */}
          {(() => {
            const pendingRequest = sessions.find(s => s.status === 'pending');
            const activeLiveChat = sessions.find(s => s.status === 'active');
            
            if (pendingRequest) {
              return (
                <IncomingRequestNotification
                  request={pendingRequest}
                  onAccept={async () => {
                    try {
                      const res = await fetch(`/api/sessions/${pendingRequest.id}/accept`, { method: 'POST' });
                      if (res.ok) {
                        loadConsultantStatsAndStatus(currentConsultant.id);
                        onSelectSession(pendingRequest.id, currentConsultant.display_name, 'consultant');
                      } else {
                        const data = await res.json();
                        alert(data.error || 'Failed to accept request');
                      }
                    } catch (err) {
                      console.error('Accept error:', err);
                    }
                  }}
                  onReject={async () => {
                    try {
                      const res = await fetch(`/api/sessions/${pendingRequest.id}/reject`, { method: 'POST' });
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
                  onTimeout={async () => {
                    try {
                      const res = await fetch(`/api/sessions/${pendingRequest.id}/timeout`, { method: 'POST' });
                      if (res.ok) {
                        loadConsultantStatsAndStatus(currentConsultant.id);
                      } else {
                        const data = await res.json();
                        console.error('Timeout API error:', data.error || 'Failed to timeout request');
                      }
                    } catch (err) {
                      console.error('Timeout error:', err);
                    }
                  }}
                />
              );
            }
            
            if (activeLiveChat) {
              return (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-cyan-500/10 border-2 border-cyan-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-cyan-500/5"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-cyan-500/20 p-2 rounded-xl animate-pulse">
                      <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">⚡ LIVE NOW</span>
                      <h4 className="text-sm font-bold text-cyan-200">Active chat session is currently running!</h4>
                      <p className="text-xs text-slate-400">Consulting with client: <strong className="text-slate-200">{activeLiveChat.user_name}</strong></p>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectSession(activeLiveChat.id, currentConsultant.display_name, 'consultant')}
                    className="bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-2"
                  >
                    <span>Join Consultation Room</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            }
            return null;
          })()}

          {/* UNIVERSAL HAMBURGER DRAWER OVERLAY (For both mobile & desktop) */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                {/* Backdrop overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
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
                          setActiveTab('notifications');
                          setIsMobileMenuOpen(false);
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
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-1 text-slate-400 hover:text-white bg-slate-900 rounded-lg transition-colors border border-slate-800/80 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">CallMint Menu</span>
                    <strong className="text-slate-200 text-sm font-bold block mt-2 pr-12">{currentConsultant.display_name} (ID: {currentConsultant.id})</strong>
                    <div className="mt-3">
                      <button
                        onClick={handleCopyProfileUrl}
                        className="w-full flex items-center justify-between px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-emerald-400 hover:text-emerald-300 transition-all active:scale-95 text-[11px] font-bold font-sans cursor-pointer"
                        title="Copy Shareable Booking Link"
                      >
                        <div className="flex items-center space-x-1.5">
                          <Copy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Copy Share Link</span>
                        </div>
                        <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md uppercase font-bold">
                          {copiedUrl ? 'Copied!' : 'Copy'}
                        </span>
                      </button>
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

                  {/* Navigation Menu List */}
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        setActiveTab('dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeTab === 'dashboard'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <TrendingUp className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        activeTab === 'dashboard' ? 'text-slate-950' : 'text-emerald-400'
                      }`} />
                      <span>Home</span>
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        if (!hasActivePlan) {
                          setError("Please purchase a partner plan first to unlock Presence Settings.");
                          handleScrollToPlans();
                        } else {
                          setActiveTab('status');
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        !hasActivePlan 
                          ? 'text-slate-500 cursor-not-allowed opacity-60' 
                          : activeTab === 'status'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Flame className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeTab === 'status' && hasActivePlan ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>My Current Plan</span>
                      </div>
                      {!hasActivePlan && <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />}
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        if (!hasActivePlan) {
                          setError("Please purchase a partner plan first to unlock Profile Settings.");
                          handleScrollToPlans();
                        } else {
                          setActiveTab('profile');
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        !hasActivePlan 
                          ? 'text-slate-500 cursor-not-allowed opacity-60' 
                          : activeTab === 'profile'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Settings2 className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeTab === 'profile' && hasActivePlan ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>Profile Settings</span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold font-mono ${
                          activeTab === 'profile'
                            ? 'bg-slate-950/80 text-emerald-400'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                        }`}>
                          {getProfileCompletionPercentage()}%
                        </span>
                        {!hasActivePlan && <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />}
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        if (!hasActivePlan) {
                          setError("Please purchase a partner plan first to unlock Availability Schedule.");
                          handleScrollToPlans();
                        } else {
                          setActiveTab('schedules');
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        !hasActivePlan 
                          ? 'text-slate-500 cursor-not-allowed opacity-60' 
                          : activeTab === 'schedules'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Calendar className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeTab === 'schedules' && hasActivePlan ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>Availability Schedule</span>
                      </div>
                      {!hasActivePlan && <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />}
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        if (!hasActivePlan) {
                          setError("Please purchase a partner plan first to unlock KYC Verification.");
                          handleScrollToPlans();
                        } else {
                          setActiveTab('kyc');
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        !hasActivePlan 
                          ? 'text-slate-500 cursor-not-allowed opacity-60' 
                          : activeTab === 'kyc'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <UserCheck className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeTab === 'kyc' && hasActivePlan ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>KYC Verification</span>
                      </div>
                      {hasActivePlan ? (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${kycStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : kycStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-slate-800 text-slate-400'}`}>
                          {kycStatus === 'approved' ? 'Approved' : kycStatus === 'pending' ? 'Review' : 'Update'}
                        </span>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        if (!hasActivePlan) {
                          setError("Please purchase a partner plan first to unlock Bank Details.");
                          handleScrollToPlans();
                        } else {
                          setActiveTab('bank');
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        !hasActivePlan 
                          ? 'text-slate-500 cursor-not-allowed opacity-60' 
                          : activeTab === 'bank'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Wallet className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeTab === 'bank' && hasActivePlan ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>Bank Details</span>
                      </div>
                      {hasActivePlan ? (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${bankStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : bankStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' : 'bg-slate-800 text-slate-400'}`}>
                          {bankStatus === 'approved' ? 'Verified' : bankStatus === 'pending' ? 'Review' : 'Update'}
                        </span>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        if (!hasActivePlan) {
                          setError("Please purchase a partner plan first to unlock Consultation History.");
                          handleScrollToPlans();
                        } else {
                          setActiveTab('sessions');
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        !hasActivePlan 
                          ? 'text-slate-500 cursor-not-allowed opacity-60' 
                          : activeTab === 'sessions'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeTab === 'sessions' && hasActivePlan ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>Consultation History</span>
                      </div>
                      {!hasActivePlan && <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />}
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        if (!hasActivePlan) {
                          setError("Please purchase a partner plan first to view Followers.");
                          handleScrollToPlans();
                        } else {
                          setActiveTab('followers');
                        }
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        !hasActivePlan 
                          ? 'text-slate-500 cursor-not-allowed opacity-60' 
                          : activeTab === 'followers'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Users className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeTab === 'followers' && hasActivePlan ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>Your Followers</span>
                      </div>
                      {!hasActivePlan && <Lock className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />}
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        setActiveTab('support');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeTab === 'support'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <HelpCircle className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                        activeTab === 'support' ? 'text-slate-950' : 'text-emerald-400'
                      }`} />
                      <span>Customer Support</span>
                    </button>

                    <button
                      onClick={() => {
                        setError(null);
                        setSuccess(null);
                        setActiveTab('notifications');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left ${
                        activeTab === 'notifications'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Bell className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                          activeTab === 'notifications' ? 'text-slate-950' : 'text-emerald-400'
                        }`} />
                        <span>Notifications</span>
                      </div>
                      {unreadNotifCount > 0 && (
                        <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                          activeTab === 'notifications' ? 'bg-slate-950 text-emerald-400' : 'bg-rose-500 text-white'
                        }`}>
                          {unreadNotifCount} New
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center space-x-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-left text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 border border-transparent hover:border-rose-500/20 mt-2"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>



          {/* TWO-COLUMN SIDEBAR LAYOUT (For Desktop lg+) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* DESKTOP SIDEBAR COLUMN */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              
              {/* Consultant Short Identity Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-4 shadow-lg">
                <div className="relative inline-block">
                  <img
                    src={photoUrl || currentConsultant.photo_url}
                    alt={currentConsultant.display_name}
                    className="w-20 h-20 mx-auto rounded-2xl object-cover border-2 border-emerald-500 shadow-md transition-transform hover:scale-105 duration-300 cursor-pointer"
                    onClick={() => setLightboxImage(photoUrl || currentConsultant.photo_url)}
                    title="Click to view photo"
                    onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300'; }}
                  />
                  <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] shadow ${isOnline ? (isBusy ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-600'}`} title={isOnline ? (isBusy ? 'Busy' : 'Online') : 'Offline'}>
                    ⚡
                  </span>
                </div>
                
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight">{currentConsultant.display_name}</h3>
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                    </span>
                    <span className="text-[9px] font-mono font-black text-emerald-400">
                      ₹{currentConsultant.price_per_minute || 0}/min
                    </span>
                  </motion.div>
                  <span className="text-[10px] font-mono text-emerald-400 block mt-1">👥 {currentConsultant.followers_count || 0} Followers</span>
                  <span className="text-[9px] font-sans text-slate-500 block mt-0.5">ID: #{currentConsultant.id}</span>
                </div>

                {/* Unique Profile Booking URL */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-left space-y-1.5">
                  <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-500">My Shareable Link</span>
                  {hasActivePlan ? (
                    <div className="flex items-center justify-between space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                      <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[120px]">{`/u/${currentConsultant.username}`}</span>
                      <div className="flex items-center space-x-0.5">
                        <button
                          onClick={handleCopyProfileUrl}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all"
                          title="Copy Profile URL"
                        >
                          {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => onNavigateToUserView(currentConsultant.username)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-all"
                          title="Open Booking Page"
                        >
                          <Globe className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => {
                        setError("Please purchase a partner plan first to unlock your shareable booking link.");
                        handleScrollToPlans();
                      }}
                      className="flex items-center justify-between space-x-1 bg-slate-900/60 border border-slate-850/50 rounded-lg p-2 cursor-pointer hover:border-slate-800 transition-colors"
                    >
                      <span className="text-[10px] font-sans text-slate-500 italic select-none">Link Locked 🔒</span>
                      <span className="text-[9px] font-mono bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-black">Buy Plan</span>
                    </div>
                  )}
                </div>
              </div>



              {/* Sidebar Navigation Links */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 px-2 mb-3">Navigation Menu</span>
                
                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setActiveTab('dashboard');
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <TrendingUp className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'dashboard' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>Home</span>
                </button>
                
                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    if (!hasActivePlan) {
                      setError("Please purchase a partner plan first to unlock Presence Settings.");
                      handleScrollToPlans();
                    } else {
                      setActiveTab('status');
                    }
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${!hasActivePlan ? 'text-slate-500 hover:bg-slate-850/40 cursor-not-allowed' : activeTab === 'status' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <Flame className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'status' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>My Current Plan</span>
                  {!hasActivePlan && <Lock className="w-3.5 h-3.5 ml-auto text-amber-500/80 shrink-0" />}
                </button>
                
                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    if (!hasActivePlan) {
                      setError("Please purchase a partner plan first to unlock Profile Settings.");
                      handleScrollToPlans();
                    } else {
                      setActiveTab('profile');
                    }
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${!hasActivePlan ? 'text-slate-500 hover:bg-slate-850/40 cursor-not-allowed' : activeTab === 'profile' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <Settings2 className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'profile' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>Profile Settings</span>
                  <span className={`ml-auto text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${activeTab === 'profile' ? 'bg-slate-950/80 text-emerald-400' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {getProfileCompletionPercentage()}%
                  </span>
                  {!hasActivePlan && <Lock className="w-3.5 h-3.5 ml-1.5 text-amber-500/80 shrink-0" />}
                </button>

                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    if (!hasActivePlan) {
                      setError("Please purchase a partner plan first to unlock Availability Schedule.");
                      handleScrollToPlans();
                    } else {
                      setActiveTab('schedules');
                    }
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${!hasActivePlan ? 'text-slate-500 hover:bg-slate-850/40 cursor-not-allowed' : activeTab === 'schedules' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <Calendar className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'schedules' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>Availability Schedule</span>
                  {!hasActivePlan && <Lock className="w-3.5 h-3.5 ml-auto text-amber-500/80 shrink-0" />}
                </button>

                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    if (!hasActivePlan) {
                      setError("Please purchase a partner plan first to unlock KYC Verification.");
                      handleScrollToPlans();
                    } else {
                      setActiveTab('kyc');
                    }
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${!hasActivePlan ? 'text-slate-500 hover:bg-slate-850/40 cursor-not-allowed' : activeTab === 'kyc' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <UserCheck className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'kyc' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>KYC Verification</span>
                  {hasActivePlan ? (
                    <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded font-bold ${kycStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : kycStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                      {kycStatus === 'approved' ? 'Approved' : kycStatus === 'pending' ? 'Review' : 'Update'}
                    </span>
                  ) : (
                    <Lock className="w-3.5 h-3.5 ml-auto text-amber-500/80 shrink-0" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    if (!hasActivePlan) {
                      setError("Please purchase a partner plan first to unlock Bank Details.");
                      handleScrollToPlans();
                    } else {
                      setActiveTab('bank');
                    }
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${!hasActivePlan ? 'text-slate-500 hover:bg-slate-850/40 cursor-not-allowed' : activeTab === 'bank' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <Wallet className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'bank' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>Bank Details</span>
                  {hasActivePlan ? (
                    <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded font-bold ${bankStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : bankStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                      {bankStatus === 'approved' ? 'Verified' : bankStatus === 'pending' ? 'Review' : 'Update'}
                    </span>
                  ) : (
                    <Lock className="w-3.5 h-3.5 ml-auto text-amber-500/80 shrink-0" />
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    if (!hasActivePlan) {
                      setError("Please purchase a partner plan first to unlock Consultation History.");
                      handleScrollToPlans();
                    } else {
                      setActiveTab('sessions');
                    }
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${!hasActivePlan ? 'text-slate-500 hover:bg-slate-850/40 cursor-not-allowed' : activeTab === 'sessions' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <FileText className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'sessions' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>Consultation History</span>
                  {!hasActivePlan && <Lock className="w-3.5 h-3.5 ml-auto text-amber-500/80 shrink-0" />}
                </button>

                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    if (!hasActivePlan) {
                      setError("Please purchase a partner plan first to view Followers.");
                      handleScrollToPlans();
                    } else {
                      setActiveTab('followers');
                    }
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${!hasActivePlan ? 'text-slate-500 hover:bg-slate-850/40 cursor-not-allowed' : activeTab === 'followers' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <Users className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'followers' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>Your Followers</span>
                  {!hasActivePlan && <Lock className="w-3.5 h-3.5 ml-auto text-amber-500/80 shrink-0" />}
                </button>

                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setActiveTab('support');
                  }}
                  className={`group w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'support' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <HelpCircle className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'support' ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span>Customer Support</span>
                </button>

                <button
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setActiveTab('notifications');
                  }}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'notifications' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <div className="flex items-center space-x-3">
                    <Bell className={`w-4 h-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${activeTab === 'notifications' ? 'text-slate-950' : 'text-emerald-400'}`} />
                    <span>Notifications</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                      activeTab === 'notifications' ? 'bg-slate-950 text-emerald-400' : 'bg-rose-500 text-white'
                    }`}>
                      {unreadNotifCount} New
                    </span>
                  )}
                </button>

                <div className="border-t border-slate-800/80 pt-4 mt-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all border border-rose-500/15"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Log Out Portal</span>
                  </button>
                </div>
              </div>

            </div>

            {/* DYNAMIC CONTENT WRAPPER */}
            <div className="col-span-1 lg:col-span-9 space-y-6">
              
              {/* TAB 1: DASHBOARD HOME (Highly Animated Professional Homepage) */}
              {activeTab === 'dashboard' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {/* Alert Enable Banner */}
                  {notifPermission !== 'granted' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-lg animate-pulse-subtle"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-amber-500/15 rounded-xl border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                          <Bell className="w-5 h-5 animate-bounce" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-sans">Turn On Sound & Push Notifications! 🔔</h4>
                          <p className="text-[11px] text-slate-300 leading-normal max-w-xl">
                            Aapki screen lock hone ya background mai hone par bhi incoming requests ki ring bajegi aur accept/reject notification screen par pop-up hoga. Please alerts enable kijiye.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestNotificationPermission}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0 shadow-md shadow-amber-500/10 cursor-pointer"
                      >
                        Enable Alerts Now
                      </button>
                    </motion.div>
                  )}
                  {!hasActivePlan ? (
                    /* LANDING/ONBOARDING VIEW FOR UN-SUBSCRIBED LOGGED-IN CONSULTANTS */
                    <div className="space-y-12 animate-in fade-in duration-300">
                      
                      {/* Sundar Banner */}
                      <div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/20 rounded-3xl p-8 sm:p-12 overflow-hidden shadow-2xl text-left">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-amber-500/[0.02] rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="relative z-10 max-w-2xl space-y-5">
                          <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/35 px-3.5 py-1.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                              ⚠️ Partnership Plan Required
                            </span>
                          </div>

                          <h2 className="text-3xl sm:text-4xl font-black font-sans text-white tracking-tight leading-tight">
                            Namaste, <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">{currentConsultant.display_name}!</span> <br />
                            Activate Your Partner Channel to <span className="text-emerald-400">Start Earning</span>
                          </h2>

                          {/* Highly Animated Current Price Indicator */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-500/10 to-sky-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-2xl shadow-lg shadow-emerald-500/5 mt-1"
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-sans font-bold text-slate-200">
                              Configured Rate: <motion.span
                                animate={{ color: ["#34d399", "#38bdf8", "#34d399"] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="font-black text-emerald-400 font-mono"
                              >₹{currentConsultant.price_per_minute || 0}/minute</motion.span>
                            </span>
                          </motion.div>

                          <p className="text-sm text-slate-300 leading-relaxed">
                            Your consultant account has been created! Currently, your public bio link <strong className="text-emerald-400 font-mono">/u/{currentConsultant.username}</strong> is inactive. To receive calls, answer chats, and start real-time earnings, please choose and subscribe to a suitable partner plan below.
                          </p>

                          <div className="flex flex-wrap gap-4 pt-2">
                            <a
                              href="#pricing-section-active"
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('pricing-section-active')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 hover:scale-105"
                            >
                              ⚡ View Subscriptions Plans
                            </a>
                            <a
                              href="#calculator-section"
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('calculator-section')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-extrabold text-xs px-6 py-3 rounded-xl transition-all hover:scale-105"
                            >
                              📊 Calculate Potential Earnings
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* 3 PLANS DISPLAY */}
                      <div id="pricing-section-active" className="space-y-8 text-center pt-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-400">🔥 STEP 1: CHOOSE A PARTNER PLAN</span>
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-100">Simple, Predictable Subscription Packages</h3>
                          <p className="text-xs text-slate-400 max-w-xl mx-auto">Select a subscription duration below to instantly activate your direct chat booking link and start earning.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto items-stretch">
                          {plans.map((plan, index) => {
                            const isGold = plan.name.toLowerCase().includes('gold');
                            const isPlatinum = plan.name.toLowerCase().includes('platinum');
                            
                            // Detailed pointers/features based on plan
                            let featurePointers: string[] = [];
                            if (plan.name.toLowerCase().includes('silver')) {
                              featurePointers = [
                                "Standard profile listing in chosen category",
                                "Live Chat & Pay-Per-Minute Integration",
                                "Real-Time Daily Analytics & Wallet Hub",
                                "Custom Shareable Booking Address (/u/username)",
                                "Standard email delivery for portal credentials",
                                "Standard ticket-based partner support"
                              ];
                            } else if (plan.name.toLowerCase().includes('gold')) {
                              featurePointers = [
                                "All Silver features included",
                                "🔥 High Visibility priority in browse feeds",
                                "⚡ Featured 'Pro Partner' badge on listing",
                                "Priority search page ranking placement",
                                "Extended 90-day continuous subscription",
                                "Standard support ticket assistance priority"
                              ];
                            } else {
                              featurePointers = [
                                "All Gold features included",
                                "💎 Elite top-carousel homepage promotion placement",
                                "⚡ Premium 'Star Verified Expert' tickmark",
                                "🎧 Dedicated account manager & 24/7 support channel",
                                "Instant payout processing priority options",
                                "Ultimate 180-day subscription for peak cost savings"
                              ];
                            }

                            return (
                              <div
                                key={plan.id}
                                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all ${
                                  isGold
                                    ? 'bg-slate-900 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/5'
                                    : 'bg-slate-900/60 border border-slate-800 hover:border-emerald-500/20 shadow-md'
                                }`}
                              >
                                {isGold && (
                                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-[10px] font-mono font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                    Best Value
                                  </span>
                                )}
                                {isPlatinum && (
                                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-mono font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                    Elite VIP Partner
                                  </span>
                                )}

                                <div className="space-y-6">
                                  {/* Card Header */}
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                                      {plan.name}
                                    </span>
                                    <div className="flex items-baseline space-x-1">
                                      <span className="text-3xl font-black text-slate-100 font-mono">₹{plan.price}</span>
                                      <span className="text-xs text-slate-500">/ {plan.duration_days} Days</span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-sans leading-relaxed min-h-[40px]">
                                      {plan.description}
                                    </p>
                                  </div>

                                  <div className="h-px bg-slate-850" />

                                  {/* Feature Pointers */}
                                  <ul className="space-y-3">
                                    {featurePointers.map((feat, i) => (
                                      <li key={i} className="flex items-start space-x-2 text-xs">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <span className="text-slate-300 leading-tight">{feat}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="pt-6">
                                  <button
                                    type="button"
                                    disabled={buyingPlanId !== null}
                                    onClick={() => {
                                      if (currentConsultant) {
                                        setBuyingPlan(plan);
                                      } else {
                                        handleBuyPlanDirect(plan.id);
                                      }
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs uppercase tracking-widest py-3 px-4 rounded-xl transition-all w-full flex items-center justify-center space-x-2 shadow-md"
                                  >
                                    {buyingPlanId === plan.id ? (
                                      <span>Activating...</span>
                                    ) : (
                                      <>
                                        <Zap className="w-4 h-4" />
                                        <span>Buy Plan Now</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Interactive Earnings Potential Calculator */}
                      <div id="calculator-section" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-left space-y-6 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <TrendingUp className="w-48 h-48 text-emerald-400" />
                        </div>
                        
                        <div className="space-y-2 relative z-10">
                          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-400">💡 Profit Simulator</span>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-100">Calculate Your Potential Monthly Earnings</h3>
                          <p className="text-xs text-slate-400">Set your customized per-minute call fee and average chat duration per day to estimate profits.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4 items-center relative z-10">
                          <div className="md:col-span-7 space-y-6">
                            {/* Rate Slider */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <label className="text-slate-400 font-bold uppercase">My Custom Per-Minute Rate (₹)</label>
                                <span className="text-emerald-400 font-bold">₹{simulatedRate} / minute</span>
                              </div>
                              <input
                                type="range"
                                min="10"
                                max="150"
                                step="5"
                                value={simulatedRate}
                                onChange={(e) => {
                                  setSimulatedRate(parseInt(e.target.value));
                                }}
                                className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer appearance-none"
                              />
                              <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                                <span>₹10 / min</span>
                                <span>₹80 / min</span>
                                <span>₹150 / min</span>
                              </div>
                            </div>

                            {/* Duration Slider */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs font-mono">
                                <label className="text-slate-400 font-bold uppercase">Average Active Minutes Per Day</label>
                                <span className="text-sky-400 font-bold">{simulatedMinutes} Minutes / day</span>
                              </div>
                              <input
                                type="range"
                                min="15"
                                max="240"
                                step="15"
                                value={simulatedMinutes}
                                onChange={(e) => setSimulatedMinutes(parseInt(e.target.value))}
                                className="w-full accent-sky-500 h-2 bg-slate-950 rounded-lg cursor-pointer appearance-none"
                              />
                              <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                                <span>15 mins</span>
                                <span>2 hours</span>
                                <span>4 hours</span>
                              </div>
                            </div>
                          </div>

                          {/* Estimate Output Panel */}
                          <div className="md:col-span-5 bg-slate-950 p-6 rounded-2xl border border-slate-850 text-center space-y-4">
                            <div>
                              <span className="text-[9px] text-slate-500 font-sans uppercase tracking-widest block">Projected Monthly Profit</span>
                              <strong className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight block mt-1">
                                ₹{(simulatedRate * simulatedMinutes * 30).toLocaleString()}
                              </strong>
                              <span className="text-[10px] text-slate-500 block mt-1">Based on 30 active billing days</span>
                            </div>

                            <div className="h-px bg-slate-900" />

                            <div className="grid grid-cols-2 gap-2 text-left text-[10px] font-sans">
                              <div>
                                <span className="text-slate-500 block">Daily Revenue:</span>
                                <strong className="text-slate-200">₹{(simulatedRate * simulatedMinutes).toLocaleString()}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Yearly Forecast:</span>
                                <strong className="text-slate-200">₹{(simulatedRate * simulatedMinutes * 365).toLocaleString()}</strong>
                              </div>
                            </div>

                            <a
                              href="#pricing-section-active"
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('pricing-section-active')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="block bg-slate-900 hover:bg-slate-850 text-emerald-400 border border-slate-800 hover:border-emerald-500/20 text-xs py-2.5 rounded-xl font-bold transition-all uppercase"
                            >
                              ⚡ Get Instant Direct Listing Now
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Bento Grid: Why Join Our Partner Network */}
                      <div className="space-y-8 text-center pt-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-400">📦 Key Benefits</span>
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-100">Engineered for Modern Professional Consultants</h3>
                          <p className="text-xs text-slate-400 max-w-xl mx-auto">No complex invoicing, no client follow-ups, and no technical headaches. Focus purely on your advice.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 w-fit">
                              <Globe className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-200">Instant Share Link</h4>
                              <p className="text-xs text-slate-500 mt-1.5 leading-normal">Get your dedicated URL like "/u/expert_raj". Embed it directly in your Instagram Bio, YouTube descriptions, or send via WhatsApp.</p>
                            </div>
                          </div>

                          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                            <div className="bg-sky-500/10 p-3 rounded-xl border border-sky-500/20 w-fit">
                              <ShieldCheck className="w-5 h-5 text-sky-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-200">Zero Payment Risks</h4>
                              <p className="text-xs text-slate-500 mt-1.5 leading-normal">Sessions are pre-authorized. We verify the client has active wallet balance before starting, automatically billing them per minute.</p>
                            </div>
                          </div>

                          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 w-fit">
                              <TrendingUp className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-200">Automated Analytics</h4>
                              <p className="text-xs text-slate-500 mt-1.5 leading-normal">Track active chats, session statistics, client satisfaction ratings, and daily/monthly earning trends from one integrated dashboard.</p>
                            </div>
                          </div>

                          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
                            <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 w-fit">
                              <Settings2 className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-200">Operational Autonomy</h4>
                              <p className="text-xs text-slate-500 mt-1.5 leading-normal">Switch online presence on/off with one button. Control your exact per-minute rates based on active consulting category limits.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* STANDARD ENHANCED DASHBOARD WHEN THEY HAVE ACTIVE PLAN */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left Column: The high-fidelity starting cards styled exactly like the HTML snippet */}
                      <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-start w-full">
                        <div 
                          id="starting-cards-container"
                          style={{
                            background: theme === 'light' ? '#f8fafc' : '#0b1220',
                            borderRadius: '20px',
                            padding: '20px 18px',
                            maxWidth: '340px',
                            width: '100%',
                            margin: '0 auto',
                            border: theme === 'light' ? '1px solid #e2e8f0' : 'none',
                            fontFamily: 'var(--font-sans)'
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '20px', color: theme === 'light' ? '#0f172a' : '#e8ecf1', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                            Namaste, {currentConsultant?.display_name || 'Lakhan'}
                          </p>
                          <p style={{ margin: '6px 0 20px', fontSize: '13px', color: theme === 'light' ? '#475569' : '#7a8699', lineHeight: 1.6, fontFamily: 'var(--font-sans)' }}>
                            Welcome to your dashboard.
                          </p>

                          {/* Rate & Mode Card */}
                          <div style={{ 
                            background: theme === 'light' ? '#ffffff' : '#111a29', 
                            border: theme === 'light' ? '1px solid #e2e8f0' : '0.5px solid #1e2a3a', 
                            borderRadius: '18px', 
                            overflow: 'hidden', 
                            marginBottom: '22px' 
                          }}>
                            {/* Part 1: Current Rate */}
                            <div style={{ padding: '16px', borderBottom: theme === 'light' ? '1px solid #f1f5f9' : '0.5px solid #1e2a3a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '9px', 
                                  background: theme === 'light' ? '#e6f4ea' : '#0f2a24', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }}>
                                  <TrendingUp style={{ color: theme === 'light' ? '#10b981' : '#5dcaa5', fontSize: '16px', width: '16px', height: '16px' }} />
                                </div>
                                <div>
                                  <p style={{ margin: 0, fontSize: '11px', color: theme === 'light' ? '#64748b' : '#7a8699', fontFamily: 'var(--font-sans)' }}>Current Rate</p>
                                  <p style={{ margin: '3px 0 0', fontSize: '16px', color: theme === 'light' ? '#0f172a' : '#e8ecf1', fontWeight: 500, fontFamily: 'var(--font-mono)' }} className="font-mono">
                                    ₹{currentConsultant?.price_per_minute || 0}/min
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Part 2: Online/Offline Mode */}
                            <div style={{ padding: '16px', borderBottom: theme === 'light' ? '1px solid #f1f5f9' : '0.5px solid #1e2a3a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '9px', 
                                  background: isOnline 
                                    ? (isBusy 
                                        ? (theme === 'light' ? '#fff9db' : '#2d2006') 
                                        : (theme === 'light' ? '#e6f4ea' : '#0f2a24')) 
                                    : (theme === 'light' ? '#fce8e6' : '#221515'), 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }}>
                                  <Wifi style={{ 
                                    color: isOnline 
                                      ? (isBusy 
                                          ? (theme === 'light' ? '#f59e0b' : '#f59e0b') 
                                          : (theme === 'light' ? '#10b981' : '#5dcaa5')) 
                                      : (theme === 'light' ? '#ef4444' : '#e08a8a'), 
                                    width: '16px', 
                                    height: '16px' 
                                  }} className={isOnline ? 'animate-pulse' : ''} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <p style={{ 
                                    margin: 0, 
                                    fontSize: '14px', 
                                    color: isOnline 
                                      ? (isBusy 
                                          ? (theme === 'light' ? '#f59e0b' : '#f59e0b') 
                                          : (theme === 'light' ? '#10b981' : '#5dcaa5')) 
                                      : (theme === 'light' ? '#ef4444' : '#e08a8a'), 
                                    fontWeight: 500,
                                    fontFamily: 'var(--font-sans)',
                                    lineHeight: '1'
                                  }}>
                                    {isOnline ? (isBusy ? 'Busy Mode' : 'Online Mode') : 'Offline Mode'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Part 3: Online/Offline Button */}
                            <div 
                              onClick={handleToggleOnline}
                              className={`cursor-pointer transition-all duration-200 ${theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/30'}`}
                              style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: theme === 'light' ? '1px solid #f1f5f9' : '0.5px solid #1e2a3a' }}
                            >
                              <span style={{ fontSize: '12px', color: theme === 'light' ? '#64748b' : '#7a8699', fontFamily: 'var(--font-sans)' }}>Online/Offline Button</span>
                              <div style={{ 
                                width: '36px', 
                                height: '21px', 
                                borderRadius: '11px', 
                                backgroundColor: isOnline ? (theme === 'light' ? '#10b981' : '#1d9e75') : (theme === 'light' ? '#cbd5e1' : '#1e2a3a'), 
                                position: 'relative',
                                transition: 'all 0.2s ease'
                              }}>
                                <div style={{ 
                                  width: '15px', 
                                  height: '15px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#fff', 
                                  position: 'absolute', 
                                  top: '3px', 
                                  left: isOnline ? 'auto' : '3px',
                                  right: isOnline ? '3px' : 'auto',
                                  transition: 'all 0.2s ease'
                                }}></div>
                              </div>
                            </div>

                            {/* Part 4: Busy Button */}
                            <div 
                              onClick={handleToggleBusy}
                              className={`cursor-pointer transition-all duration-200 ${theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-slate-900/30'}`}
                              style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                              <span style={{ fontSize: '12px', color: theme === 'light' ? '#64748b' : '#7a8699', fontFamily: 'var(--font-sans)' }}>Busy Button</span>
                              <div style={{ 
                                width: '36px', 
                                height: '21px', 
                                borderRadius: '11px', 
                                backgroundColor: isBusy ? (theme === 'light' ? '#f59e0b' : '#d97706') : (theme === 'light' ? '#cbd5e1' : '#1e2a3a'), 
                                position: 'relative',
                                transition: 'all 0.2s ease'
                              }}>
                                <div style={{ 
                                  width: '15px', 
                                  height: '15px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#fff', 
                                  position: 'absolute', 
                                  top: '3px', 
                                  left: isBusy ? 'auto' : '3px',
                                  right: isBusy ? '3px' : 'auto',
                                  transition: 'all 0.2s ease'
                                }}></div>
                              </div>
                            </div>
                          </div>

                          {/* Your Wallet & Rolling Monthly Earnings Card */}
                          <div style={{ 
                            background: theme === 'light' ? '#ffffff' : '#111a29', 
                            border: theme === 'light' ? '1px solid #e2e8f0' : '0.5px solid #1e2a3a', 
                            borderRadius: '16px', 
                            padding: '16px', 
                            marginBottom: '16px' 
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <p style={{ margin: 0, fontSize: '11px', color: theme === 'light' ? '#64748b' : '#7a8699', fontFamily: 'var(--font-sans)' }}>Your wallet</p>
                              <p style={{ margin: 0, fontSize: '12px', color: theme === 'light' ? '#0f172a' : '#e8ecf1', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                                This month ({new Date().toLocaleString('default', { month: 'long' })})
                              </p>
                            </div>
                            <p style={{ margin: 0, fontSize: '22px', color: theme === 'light' ? '#0f172a' : '#e8ecf1', fontWeight: 500, fontFamily: 'var(--font-mono)' }} className="font-mono">
                              ₹{wallet?.wallet_monthly ? wallet.wallet_monthly.toFixed(2) : '0.00'}
                            </p>
                          </div>

                          {/* Earnings Overview */}
                          <p style={{ margin: '0 0 8px', fontSize: '12px', color: theme === 'light' ? '#475569' : '#7a8699', paddingLeft: '2px', fontFamily: 'var(--font-sans)' }}>Earnings overview</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ 
                              background: theme === 'light' ? '#ffffff' : '#111a29', 
                              borderRadius: '14px', 
                              padding: '14px', 
                              border: theme === 'light' ? '1px solid #e2e8f0' : '0.5px solid #1e2a3a33' 
                            }}>
                              <p style={{ margin: '0 0 6px', fontSize: '11px', color: theme === 'light' ? '#64748b' : '#7a8699', fontFamily: 'var(--font-sans)' }}>Today's earnings</p>
                              <p style={{ margin: 0, fontSize: '16px', color: theme === 'light' ? '#10b981' : '#5dcaa5', fontWeight: 500, fontFamily: 'var(--font-mono)' }} className="font-mono">
                                ₹{wallet?.wallet_today ? wallet.wallet_today.toFixed(2) : '0.00'}
                              </p>
                            </div>
                            <div style={{ 
                              background: theme === 'light' ? '#ffffff' : '#111a29', 
                              borderRadius: '14px', 
                              padding: '14px', 
                              border: theme === 'light' ? '1px solid #e2e8f0' : '0.5px solid #1e2a3a33' 
                            }}>
                              <p style={{ margin: '0 0 6px', fontSize: '11px', color: theme === 'light' ? '#64748b' : '#7a8699', fontFamily: 'var(--font-sans)' }}>Life time earnings</p>
                              <p style={{ margin: 0, fontSize: '16px', color: theme === 'light' ? '#2563eb' : '#7f9be0', fontWeight: 500, fontFamily: 'var(--font-mono)' }} className="font-mono">
                                ₹{wallet?.wallet_total ? wallet.wallet_total.toFixed(2) : '0.00'}
                              </p>
                            </div>
                          </div>

                          {/* Activity Summary */}
                          <p style={{ margin: '0 0 8px', fontSize: '12px', color: theme === 'light' ? '#475569' : '#7a8699', paddingLeft: '2px', fontFamily: 'var(--font-sans)' }}>Activity summary</p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ 
                              background: theme === 'light' ? '#ffffff' : '#111a29', 
                              borderRadius: '14px', 
                              padding: '14px', 
                              border: theme === 'light' ? '1px solid #e2e8f0' : '0.5px solid #1e2a3a33' 
                            }}>
                              <p style={{ margin: '0 0 6px', fontSize: '11px', color: theme === 'light' ? '#64748b' : '#7a8699', fontFamily: 'var(--font-sans)' }}>Consultations</p>
                              <p style={{ margin: 0, fontSize: '16px', color: theme === 'light' ? '#0f172a' : '#e8ecf1', fontWeight: 500, fontFamily: 'var(--font-mono)' }} className="font-mono">
                                {sessions.filter((s: any) => s.status === 'completed').length}
                              </p>
                            </div>
                            <div style={{ 
                              background: theme === 'light' ? '#ffffff' : '#111a29', 
                              borderRadius: '14px', 
                              padding: '14px', 
                              border: theme === 'light' ? '1px solid #e2e8f0' : '0.5px solid #1e2a3a33' 
                            }}>
                              <p style={{ margin: '0 0 6px', fontSize: '11px', color: theme === 'light' ? '#64748b' : '#7a8699', fontFamily: 'var(--font-sans)' }}>Total refunded</p>
                              <p style={{ margin: 0, fontSize: '16px', color: theme === 'light' ? '#ef4444' : '#e08a8a', fontWeight: 500, fontFamily: 'var(--font-mono)' }} className="font-mono">
                                ₹{sessions.reduce((acc: any, s: any) => acc + (s.refunded_amount || 0), 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Earning Performance, Chart, and subsequent sections, aligned beautifully next to the mobile panel */}
                      <div className="lg:col-span-7 xl:col-span-8 space-y-6 w-full">
                        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 ${
                          theme === 'light' ? 'border-slate-200' : 'border-slate-800'
                        }`}>
                          <div className="flex flex-col gap-1.5 text-left w-full sm:w-auto">
                            <div className="flex items-center space-x-3">
                              <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 shrink-0">
                                <Gauge className="w-5 h-5 animate-pulse" />
                              </div>
                              <h3 className={`font-extrabold text-base flex items-center gap-2 ${
                                theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                              }`}>
                                Earning Performance
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              </h3>
                            </div>
                            <p className={`text-xs pl-1 mt-0.5 ${
                              theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                            }`}>Peak call/consultation frequency and earnings potential indicators</p>
                          </div>
                          <div className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border ${
                            theme === 'light'
                              ? 'text-emerald-600 bg-slate-50 border-slate-200'
                              : 'text-emerald-400 bg-slate-950 border-slate-850'
                          }`}>
                            Active Rate Cap: ₹{plans.find(p => p.id === wallet.plan_id)?.max_consultant_rate ?? 25}/min
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-2 text-left">
                          {/* Left: Dynamic Weekly/Monthly Earnings Performance Chart */}
                          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                            <div className={`p-5 rounded-2xl border relative flex flex-col justify-between h-full min-h-[220px] ${
                              theme === 'light'
                                ? 'bg-white border-slate-200 shadow-sm text-slate-800'
                                : 'bg-slate-950/60 border-slate-850/85 text-slate-100'
                            }`}>
                              <div className="flex items-center justify-between mb-4">
                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                  theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                                }`}>
                                  {performanceTab === 'weekly' ? 'Weekly Performance' : 'Monthly Performance'}
                                </span>
                                <div className={`flex rounded-lg p-0.5 border ${
                                  theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/90 border-slate-800'
                                }`}>
                                  <button
                                    type="button"
                                    onClick={() => setPerformanceTab('weekly')}
                                    className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-all ${
                                      performanceTab === 'weekly'
                                        ? 'bg-emerald-500 text-white shadow-sm font-extrabold'
                                        : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
                                    }`}
                                  >
                                    Weekly
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPerformanceTab('monthly')}
                                    className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-all ${
                                      performanceTab === 'monthly'
                                        ? 'bg-emerald-500 text-white shadow-sm font-extrabold'
                                        : (theme === 'light' ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200')
                                    }`}
                                  >
                                    Monthly
                                  </button>
                                </div>
                              </div>
                              
                              {performanceTab === 'weekly' ? (
                                <>
                                  {/* Week-wise and Day-wise Filters */}
                                  <div className={`flex flex-col gap-3 mb-5 border-b pb-4 ${
                                    theme === 'light' ? 'border-slate-100' : 'border-slate-900'
                                  }`}>
                                    {/* Week-wise Slider and Selector */}
                                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border ${
                                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/50 border-slate-850'
                                    }`}>
                                      <div className="flex flex-col text-left">
                                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-extrabold">Performance Week</span>
                                        <span className={`text-xs font-bold mt-0.5 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>{getWeekRangeString(performanceWeekOffset)}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                        <div className="flex items-center h-8">
                                          <input 
                                            type="range" 
                                            min="0" 
                                            max="3" 
                                            value={performanceWeekOffset} 
                                            onChange={(e) => setPerformanceWeekOffset(parseInt(e.target.value))}
                                            className={`w-24 sm:w-32 h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none ${
                                              theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'
                                            }`}
                                          />
                                        </div>
                                        <select
                                          value={performanceWeekOffset}
                                          onChange={(e) => setPerformanceWeekOffset(parseInt(e.target.value))}
                                          className={`h-8 border rounded-lg text-xs font-sans font-bold px-3 focus:border-emerald-500 outline-none cursor-pointer transition-all ${
                                            theme === 'light' ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                                          }`}
                                        >
                                          <option value="0">This Week</option>
                                          <option value="1">1 Week Ago</option>
                                          <option value="2">2 Weeks Ago</option>
                                          <option value="3">3 Weeks Ago</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* Day-wise Filter segmented buttons */}
                                    <div className="flex flex-col text-left">
                                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-extrabold mb-1.5">Filter by Specific Day</span>
                                      <div className={`flex flex-wrap gap-1 p-1 rounded-xl border ${
                                        theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-850'
                                      }`}>
                                        {['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                          <button
                                            key={day}
                                            type="button"
                                            onClick={() => setSelectedDayFilter(day)}
                                            className={`flex-1 min-w-[38px] py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                                              selectedDayFilter === day
                                                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-extrabold'
                                                : (theme === 'light' 
                                                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent' 
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent')
                                            }`}
                                          >
                                            {day}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="h-44 flex items-end justify-between gap-3 relative px-1 pb-1">
                                    {/* Y axis lines removed per user request */}
                                    
                                    {/* Animated Bars */}
                                    {getWeeklyEarningsData(currentConsultant.id, sessions, currentConsultant.price_per_minute, performanceWeekOffset).map((bar, i) => {
                                      const isSelectedDay = selectedDayFilter === bar.label;
                                      const isAllDays = selectedDayFilter === 'All';
                                      const isDimmed = !isAllDays && !isSelectedDay;

                                      return (
                                        <div 
                                          key={bar.label} 
                                          className={`flex-1 flex flex-col items-center group relative z-10 transition-all duration-300 ${
                                            isDimmed ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
                                          }`}
                                          onMouseEnter={() => setActiveBarIndex(i)}
                                          onMouseLeave={() => setActiveBarIndex(null)}
                                          onTouchStart={(e) => {
                                            e.stopPropagation();
                                            setActiveBarIndex(i);
                                            setSelectedDayFilter(bar.label);
                                          }}
                                          onClick={() => setSelectedDayFilter(isSelectedDay ? 'All' : bar.label)}
                                        >
                                          {/* Hover/Touch tooltip */}
                                          <span className={`text-[9px] font-mono transition-opacity absolute -top-10 px-2 py-1 rounded-lg border text-center font-bold z-20 shadow-xl whitespace-nowrap pointer-events-none ${
                                            theme === 'light' ? 'bg-white border-slate-200 text-emerald-600' : 'bg-slate-950 border-slate-880 text-emerald-400'
                                          } ${
                                            activeBarIndex === i || isSelectedDay ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                          }`}>
                                            {bar.earnings}
                                          </span>
                                          
                                          <div className={`w-full h-32 rounded-lg flex items-end justify-center overflow-hidden transition-all ${
                                            theme === 'light' 
                                              ? (isSelectedDay ? 'bg-emerald-50/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-50/50') 
                                              : (isSelectedDay ? 'bg-slate-900/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-900/10')
                                          }`}>
                                            <motion.div
                                              initial={{ height: 0 }}
                                              animate={{ height: bar.value }}
                                              transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                                              className={`w-full max-w-[16px] rounded-t-md cursor-pointer transition-all ${
                                                isSelectedDay 
                                                  ? 'bg-gradient-to-t from-emerald-500 to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.6)]' 
                                                  : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                              }`}
                                            />
                                          </div>
                                          <span className={`text-[10px] font-mono font-bold mt-2 transition-colors ${
                                            isSelectedDay 
                                              ? (theme === 'light' ? 'text-emerald-600 font-extrabold' : 'text-emerald-400 font-extrabold') 
                                              : (theme === 'light' ? 'text-slate-600' : 'text-slate-400')
                                          }`}>{bar.label}</span>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Detailed Insights Card based on Day / Week filter */}
                                  {(() => {
                                    const weeklyData = getWeeklyEarningsData(currentConsultant.id, sessions, currentConsultant.price_per_minute, performanceWeekOffset);
                                    
                                    // If a specific day is selected, show that day's stats, otherwise show week totals
                                    let displayedEarnings = 0;
                                    let displayedCalls = 0;
                                    let displayedMinutes = 0;
                                    let displayLabel = "";

                                    if (selectedDayFilter === 'All') {
                                      displayLabel = "Weekly Summary";
                                      displayedEarnings = weeklyData.reduce((acc, d) => acc + d.actual, 0);
                                      displayedCalls = weeklyData.reduce((acc, d) => acc + d.callCount, 0);
                                      displayedMinutes = weeklyData.reduce((acc, d) => acc + d.totalMinutes, 0);
                                    } else {
                                      const matched = weeklyData.find(d => d.label === selectedDayFilter);
                                      displayLabel = matched ? `${matched.label}day Insights` : `${selectedDayFilter} Insights`;
                                      displayedEarnings = matched ? matched.actual : 0;
                                      displayedCalls = matched ? matched.callCount : 0;
                                      displayedMinutes = matched ? matched.totalMinutes : 0;
                                    }

                                    return (
                                      <div className={`mt-4 p-3 rounded-xl border grid grid-cols-3 gap-2.5 text-center ${
                                        theme === 'light'
                                          ? 'bg-slate-50 border-slate-200 text-slate-800'
                                          : 'bg-slate-900/50 border-slate-850/80 text-slate-100'
                                      }`}>
                                        <div className="flex flex-col justify-center">
                                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block font-bold">{displayLabel}</span>
                                          <span className={`text-[10px] font-bold block mt-0.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>Earnings</span>
                                          <span className={`text-xs font-mono font-black mt-0.5 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>₹{Math.round(displayedEarnings).toLocaleString()}</span>
                                        </div>
                                        <div className={`flex flex-col justify-center border-x ${theme === 'light' ? 'border-slate-200' : 'border-slate-850'}`}>
                                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block font-bold">{displayLabel}</span>
                                          <span className={`text-[10px] font-bold block mt-0.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>Consultations</span>
                                          <span className={`text-xs font-mono font-black mt-0.5 ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}`}>{displayedCalls} calls</span>
                                        </div>
                                        <div className="flex flex-col justify-center">
                                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block font-bold">{displayLabel}</span>
                                          <span className={`text-[10px] font-bold block mt-0.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>Total Time</span>
                                          <span className={`text-xs font-mono font-black mt-0.5 ${theme === 'light' ? 'text-sky-600' : 'text-sky-400'}`}>{displayedMinutes} mins</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </>
                              ) : (
                                // Beautiful Monthly Line Chart
                                (() => {
                                  const monthlyData = getMonthlyEarningsData(currentConsultant.id, sessions);
                                  const width = 500;
                                  const height = 150;
                                  const paddingLeft = 25;
                                  const paddingRight = 25;
                                  const paddingTop = 15;
                                  const paddingBottom = 25;
                                  
                                  const chartWidth = width - paddingLeft - paddingRight;
                                  const chartHeight = height - paddingTop - paddingBottom;
                                  
                                  const points = monthlyData.map((d, i) => {
                                    const x = paddingLeft + (i / (monthlyData.length - 1)) * chartWidth;
                                    const y = (paddingTop + chartHeight) - (d.percentage / 100) * chartHeight;
                                    return { x, y, ...d };
                                  });
                                  
                                  const linePathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                  const areaPathStr = points.length > 0 
                                    ? `${linePathStr} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
                                    : '';
                                  
                                  return (
                                    <div className="relative h-44 w-full flex flex-col justify-end">
                                      {/* Y axis lines */}
                                      <div className="absolute inset-x-0 top-1/4 border-t border-slate-900/40 pointer-events-none" />
                                      <div className="absolute inset-x-0 top-2/4 border-t border-slate-900/40 pointer-events-none" />
                                      <div className="absolute inset-x-0 top-3/4 border-t border-slate-900/40 pointer-events-none" />
                                      
                                      {/* Line Graph Tooltip */}
                                      {hoveredMonthlyPoint && (
                                        <div 
                                          className="absolute bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-xl z-20 pointer-events-none text-left flex flex-col"
                                          style={{
                                            left: `${Math.min(85, Math.max(2, (hoveredMonthlyPoint.x / width) * 100))}%`,
                                            top: '0px'
                                          }}
                                        >
                                          <span className="text-[8px] font-sans text-slate-500 uppercase tracking-wider font-bold">
                                            Day {hoveredMonthlyPoint.day}
                                          </span>
                                          <span className="text-[11px] font-mono text-emerald-400 font-extrabold">
                                            ₹{Math.round(hoveredMonthlyPoint.earnings).toLocaleString()}
                                          </span>
                                        </div>
                                      )}
                                      
                                      <svg 
                                        viewBox={`0 0 ${width} ${height}`} 
                                        className="w-full h-full overflow-visible"
                                        onMouseMove={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const mouseX = e.clientX - rect.left;
                                          const ratio = mouseX / rect.width;
                                          const index = Math.round(ratio * (monthlyData.length - 1));
                                          if (index >= 0 && index < monthlyData.length) {
                                            setHoveredMonthlyPoint({ ...points[index], index });
                                          }
                                        }}
                                        onMouseLeave={() => setHoveredMonthlyPoint(null)}
                                      >
                                        <defs>
                                          <linearGradient id="monthlyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                          </linearGradient>
                                        </defs>
                                        
                                        {/* Filled Area */}
                                        {areaPathStr && (
                                          <path 
                                            d={areaPathStr} 
                                            fill="url(#monthlyAreaGrad)"
                                            className="transition-all duration-300"
                                          />
                                        )}
                                        
                                        {/* Line */}
                                        {linePathStr && (
                                          <motion.path 
                                            d={linePathStr} 
                                            fill="none" 
                                            stroke="#10b981" 
                                            strokeWidth="3" 
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1.2, ease: "easeInOut" }}
                                            className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                          />
                                        )}
                                        
                                        {/* Interactive dots */}
                                        {points.map((p, i) => {
                                          const isHovered = hoveredMonthlyPoint && hoveredMonthlyPoint.index === i;
                                          if (p.earnings === 0 && !isHovered) return null;
                                          return (
                                            <circle 
                                              key={i}
                                              cx={p.x}
                                              cy={p.y}
                                              r={isHovered ? 6 : 3.5}
                                              fill={isHovered ? '#10b981' : '#020617'}
                                              stroke="#10b981"
                                              strokeWidth={isHovered ? 2.5 : 1.5}
                                              className="cursor-pointer transition-all duration-150"
                                            />
                                          );
                                        })}
                                        
                                        {/* Custom labels for x-axis days */}
                                        {points.filter((_, idx) => idx % 5 === 0 || idx === points.length - 1).map((p, i) => (
                                          <text 
                                            key={i} 
                                            x={p.x} 
                                            y={height - 5} 
                                            textAnchor="middle" 
                                            className="fill-slate-400 font-mono text-[9px] font-bold"
                                          >
                                            D{p.day}
                                          </text>
                                        ))}
                                      </svg>
                                    </div>
                                  );
                                })()
                              )}
                              
                            </div>
                          </div>

                          {/* Right: Repeat User Rate Meter Speedometer */}
                          <div className="lg:col-span-5 flex flex-col justify-between">
                            {(() => {
                              const metrics = getPerformanceMetrics(currentConsultant.id, sessions);
                              const repeatUserPct = metrics.repeat.daily;
                              const needleRotation = (repeatUserPct / 100) * 180 - 90;
                              
                              return (
                                <div className={`p-5 rounded-2xl border flex flex-col justify-between h-full shadow-lg text-center space-y-4 ${
                                  theme === 'light'
                                    ? 'bg-white border-slate-200 text-slate-800'
                                    : 'bg-slate-950 border-slate-850 text-slate-100'
                                }`}>
                                  <div className={`flex items-center justify-between border-b pb-2 flex-wrap gap-2 ${
                                    theme === 'light' ? 'border-slate-100' : 'border-slate-900'
                                  }`}>
                                    <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                      theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                                    }`}>
                                      ⚡ Repeat User %
                                    </h4>
                                    <span className={`text-[9px] border px-2 py-0.5 rounded-md uppercase font-mono font-bold flex items-center gap-1 shrink-0 ${
                                      theme === 'light'
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${theme === 'light' ? 'bg-indigo-600' : 'bg-indigo-400'}`}></span>
                                      LIVE REPEAT %
                                    </span>
                                  </div>

                                  {/* Custom Speedometer Gauge */}
                                  <div className="relative py-2 flex flex-col items-center">
                                    <svg viewBox="0 0 200 115" className="w-full max-w-[210px] overflow-visible">
                                      <defs>
                                        <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" stopColor="#6366f1" /> {/* Indigo */}
                                          <stop offset="50%" stopColor="#06b6d4" /> {/* Cyan */}
                                          <stop offset="100%" stopColor="#10b981" /> {/* Emerald */}
                                        </linearGradient>
                                        <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
                                          <feGaussianBlur stdDeviation="3" result="blur" />
                                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                        </filter>
                                      </defs>

                                      {/* Base track arc */}
                                      <path
                                        d="M 25 100 A 75 75 0 0 1 175 100"
                                        fill="none"
                                        stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'}
                                        strokeWidth="11"
                                        strokeLinecap="round"
                                      />

                                      {/* Colored Active track arc */}
                                      <path
                                        d="M 25 100 A 75 75 0 0 1 175 100"
                                        fill="none"
                                        stroke="url(#performanceGradient)"
                                        strokeWidth="11"
                                        strokeLinecap="round"
                                        strokeDasharray="236"
                                        strokeDashoffset={236 - (236 * repeatUserPct) / 100}
                                        className="transition-all duration-1000 ease-out"
                                      />

                                      {/* 50% dot indicator at the top center of arc so it does not merge */}
                                      <circle cx="100" cy="25" r="3" fill="#06b6d4" />

                                      {/* Dynamic Pointer needle */}
                                      <g transform="translate(100, 100)">
                                        <motion.g
                                          animate={{ rotate: needleRotation }}
                                          transition={{ type: "spring", stiffness: 75, damping: 14 }}
                                        >
                                          {/* Pointer line */}
                                          <line
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="-62"
                                            stroke="#6366f1"
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            filter="url(#glow-effect)"
                                          />
                                          {/* Indicator Arrow tip */}
                                          <polygon
                                            points="-5,-56 0,-68 5,-56"
                                            fill="#6366f1"
                                          />
                                        </motion.g>
                                      </g>

                                      {/* Center cap core styled elegantly as a clean dot */}
                                      <circle cx="100" cy="100" r="5" fill={theme === 'light' ? '#ffffff' : '#020617'} stroke="#6366f1" strokeWidth="1.5" />
                                      <circle cx="100" cy="100" r="2" fill="#6366f1" />

                                      {/* Text Display */}
                                      <text x="100" y="92" textAnchor="middle" className={`text-xl font-black font-sans tracking-tight ${theme === 'light' ? 'fill-slate-800' : 'fill-slate-100'}`}>
                                        {repeatUserPct}%
                                      </text>

                                      {/* High precision SVG-aligned speedometer labels */}
                                      <text x="25" y="112" textAnchor="middle" className={`${theme === 'light' ? 'fill-slate-600' : 'fill-slate-500'} text-[9px] font-bold font-sans`}>0%</text>
                                      <text x="100" y="112" textAnchor="middle" className={`${theme === 'light' ? 'fill-indigo-600' : 'fill-indigo-400'} text-[9px] font-bold font-sans uppercase tracking-wider`}>Repeat User %</text>
                                      <text x="175" y="112" textAnchor="middle" className={`${theme === 'light' ? 'fill-slate-600' : 'fill-slate-500'} text-[9px] font-bold font-sans`}>100%</text>
                                    </svg>
                                  </div>

                                  {/* Only Repeat User Indicator */}
                                  <div className={`flex justify-center items-center pt-2 border-t ${theme === 'light' ? 'border-slate-100' : 'border-slate-900'}`}>
                                    <div className={`py-2 px-6 rounded-xl border text-center ${
                                      theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'
                                    }`}>
                                      <span className={`text-[10px] uppercase font-sans tracking-wider block ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Target Repeat Rate</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}`}>
                                        40%+ Preferred
                                      </strong>
                                    </div>
                                  </div>

                                  <p className="text-[9px] text-slate-500 italic leading-relaxed pt-1">
                                    *Calculated live based on the ratio of returning users to unique consultees.
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                      {/* Section 6: Payout cycle preview */}
                      {salaryInfo && (
                        <div className={`rounded-3xl p-6 shadow-sm space-y-4 text-left border ${
                          theme === 'light'
                            ? 'bg-white border-slate-200 text-slate-800'
                            : 'bg-slate-900 border-slate-800 text-slate-100'
                        }`}>
                          <div className={`flex items-center justify-between border-b pb-3 flex-wrap gap-2 ${
                            theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                          }`}>
                            <div className="flex items-center gap-2.5 text-left">
                              <Calendar className={`w-5.5 h-5.5 shrink-0 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                              <span className={`text-xs font-sans font-bold uppercase tracking-wider ${
                                theme === 'light' ? 'text-slate-900 font-extrabold' : 'text-slate-300'
                              }`}>
                                Monthly Salary Cutoff Date
                              </span>
                            </div>
                            <span className={`text-[9px] border px-2 py-0.5 rounded uppercase font-mono font-bold ${
                              theme === 'light'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                            }`}>
                              Next Cutoff: {salaryInfo.cutoffDay}th
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className={`p-4 rounded-xl border ${
                              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
                            }`}>
                              <span className="text-[9px] text-slate-500 font-sans uppercase tracking-wider block">Estimated Salary Payout</span>
                              <strong className={`text-lg font-mono block mt-1 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>₹{salaryInfo.prevCycleEarnings.toFixed(2)}</strong>
                              <span className="text-[9px] text-slate-500 block mt-1">Earned up to {salaryInfo.cutoffDay}th</span>
                            </div>

                            <div className={`p-4 rounded-xl border ${
                              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
                            }`}>
                              <span className="text-[9px] text-slate-500 font-sans uppercase tracking-wider block">Credit Target Date</span>
                              <strong className={`text-lg font-mono block mt-1 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`}>By {salaryInfo.payoutDay}th of {salaryInfo.payoutMonthName}</strong>
                              <span className="text-[9px] text-slate-500 block mt-1">Direct bank clearance</span>
                            </div>

                            <div className={`p-4 rounded-xl border ${
                              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
                            }`}>
                              <span className="text-[9px] text-slate-500 font-sans uppercase tracking-wider block">Accumulating Unbilled</span>
                              <strong className={`text-lg font-mono block mt-1 ${theme === 'light' ? 'text-slate-950 font-black' : 'text-slate-200'}`}>₹{salaryInfo.currentCycleEarnings.toFixed(2)}</strong>
                              <span className="text-[9px] text-slate-500 block mt-1">For next month's payoff</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 7: Recent Chats Quick List */}
                      <div className={`border rounded-3xl p-6 shadow-sm space-y-4 text-left ${
                        theme === 'light'
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}>
                        <div className={`flex items-center justify-between border-b pb-3 ${
                          theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                        }`}>
                          <h3 className={`font-extrabold text-sm uppercase tracking-wider ${
                            theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                          }`}>Recent Chats</h3>
                          <button
                            onClick={() => setActiveTab('sessions')}
                            className={`text-xs font-bold hover:underline ${
                              theme === 'light' ? 'text-emerald-600 hover:text-emerald-700' : 'text-emerald-400 hover:text-emerald-300'
                            }`}
                          >
                            See All ({sessions.length})
                          </button>
                        </div>

                        <div className={`divide-y ${theme === 'light' ? 'divide-slate-100' : 'divide-slate-800'}`}>
                          {sessions.slice(0, 3).length === 0 ? (
                            <p className="text-xs text-slate-500 py-4 text-center">No consultations registered yet.</p>
                          ) : (
                            sessions.slice(0, 3).map((sess) => (
                              <div key={sess.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors">
                                <div className="flex-1 min-w-0 space-y-1 text-left">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`font-extrabold truncate max-w-[150px] sm:max-w-none ${theme === 'light' ? 'text-slate-950' : 'text-slate-200'}`}>{sess.user_name}</span>
                                    <span className="text-[9px] font-sans text-slate-500">ID: #{sess.id}</span>
                                  </div>
                                  <p className={`font-sans text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                                    {sess.duration_minutes} Mins @ ₹{sess.price_per_minute}/min
                                  </p>
                                  {sess.rating && (
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <div className="flex items-center text-amber-400">
                                        {[...Array(5)].map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`w-2.5 h-2.5 ${i < sess.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                                          />
                                        ))}
                                      </div>
                                      {sess.review_text && (
                                        <span className={`text-[10px] italic font-sans truncate max-w-[180px] sm:max-w-xs ${
                                          theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                                        }`} title={sess.review_text}>
                                          "{sess.review_text}"
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                                  <div className="text-left sm:text-right">
                                    <span className={`font-mono font-bold text-sm ${
                                      theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'
                                    }`}>₹{sess.consultant_earnings.toFixed(2)}</span>
                                    <span className="text-[9px] text-slate-500 block">Net Earning</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Section 8: Special Admin Wallet Additions */}
                      {manualAdjustments && manualAdjustments.length > 0 && (
                        <div className={`border rounded-3xl p-6 shadow-sm space-y-4 text-left ${
                          theme === 'light'
                            ? 'bg-white border-slate-200 text-slate-800'
                            : 'bg-slate-900 border-slate-800 text-slate-100'
                        }`}>
                          <div className={`flex items-center justify-between border-b pb-3 ${
                            theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                          }`}>
                            <div className="flex items-center space-x-2">
                              <Coins className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
                              <h3 className={`font-bold text-sm uppercase tracking-wider ${
                                theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                              }`}>🎁 Special Admin Credits</h3>
                            </div>
                            <span className={`text-xs font-mono font-bold ${
                              theme === 'light' ? 'text-amber-600' : 'text-amber-400'
                            }`}>
                              Total: ₹{manualAdjustments.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                            {manualAdjustments.map((adj) => (
                              <div key={adj.id} className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors border ${
                                theme === 'light'
                                  ? 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                  : 'bg-slate-950 border-slate-850 hover:border-slate-800'
                              }`}>
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className={`border px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                                      theme === 'light'
                                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      CREDITED BY SUPER ADMIN
                                    </span>
                                    <span className="text-[9px] font-sans text-slate-500">{new Date(adj.created_at).toLocaleString()}</span>
                                  </div>
                                  <p className={`font-semibold text-xs mt-1.5 ${
                                    theme === 'light' ? 'text-slate-800' : 'text-slate-200'
                                  }`}>{adj.reason}</p>
                                </div>
                                <div className="text-right sm:self-center shrink-0">
                                  <span className={`font-mono text-base font-black ${
                                    theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'
                                  }`}>+₹{adj.amount.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: AVAILABILITY & ACTIVE PLAN */}
              {activeTab === 'status' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* Active Subscription details */}
                    <div className={`lg:col-span-6 border rounded-2xl p-6 shadow-lg space-y-6 ${
                      theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                      <div className={`flex items-center justify-between pb-2 border-b gap-2 ${
                        theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                      }`}>
                        <div className="flex items-center space-x-2 min-w-0">
                          <Award className={`w-5 h-5 shrink-0 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                          <h3 className={`font-bold truncate ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>My Current Plan</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('dashboard')}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                            theme === 'light'
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Go Back</span>
                        </button>
                      </div>

                      {(() => {
                        const activePlan = plans.find((p: any) => p.id === wallet?.plan_id);
                        if (activePlan) {
                          const expiry = new Date(wallet.plan_expiry);
                          const today = new Date();
                          const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          const daysLeft = diffDays > 0 ? diffDays : 0;

                          return (
                            <div className="space-y-4">
                              <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'}`}>
                                <span className="text-[9px] text-slate-500 font-sans uppercase tracking-wider block">Active Plan</span>
                                <span className={`text-base font-extrabold block mt-0.5 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>{activePlan.name}</span>
                              </div>

                              <div className="space-y-2.5 text-xs">
                                <div className={`flex items-center justify-between border-b pb-2 ${theme === 'light' ? 'border-slate-100' : 'border-slate-850/60'}`}>
                                  <span className={`font-sans text-[10px] uppercase ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Max Call Rate</span>
                                  <strong className={theme === 'light' ? 'text-slate-800' : 'text-slate-200'}>₹{activePlan.max_consultant_rate}/min</strong>
                                </div>
                                {activePlan.support_hours && (
                                  <div className={`flex items-center justify-between border-b pb-2 ${theme === 'light' ? 'border-slate-100' : 'border-slate-850/60'}`}>
                                    <span className={`font-sans text-[10px] uppercase ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Official Support Hours</span>
                                    <strong className={theme === 'light' ? 'text-slate-800' : 'text-slate-200'}>{activePlan.support_hours} Hours</strong>
                                  </div>
                                )}
                                {activePlan.commission_rate !== undefined && (
                                  <div className={`flex items-center justify-between border-b pb-2 ${theme === 'light' ? 'border-slate-100' : 'border-slate-850/60'}`}>
                                    <span className={`font-sans text-[10px] uppercase ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Commission Charged</span>
                                    <strong className={theme === 'light' ? 'text-slate-800' : 'text-slate-200'}>{activePlan.commission_rate}%</strong>
                                  </div>
                                )}
                              </div>

                              <div className={`p-4 rounded-xl border space-y-1 ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'}`}>
                                <span className="text-[9px] text-slate-500 font-sans block uppercase">Countdown</span>
                                <div className={`text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                                  Renew subscription in <span className={`font-extrabold ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`}>{daysLeft}</span> Days
                                </div>
                                <span className="text-[9px] text-slate-500 block">Expires on: {expiry.toLocaleDateString()}</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <p className="text-xs text-slate-500 italic text-center py-6">No plan information found.</p>
                        );
                      })()}
                    </div>
                    
                    {/* Status Toggle Card */}
                    <div className={`lg:col-span-6 border rounded-2xl p-6 shadow-lg space-y-6 ${
                      theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                      <div className={`flex items-center space-x-2 pb-2 border-b ${
                        theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                      }`}>
                        <Flame className={`w-5 h-5 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        <h3 className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Consultant Presence Settings</h3>
                      </div>

                      <div className="space-y-4">
                        {/* Online visible toggle */}
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
                        }`}>
                          <div>
                            <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>Online / Visible on Portal</span>
                            <span className="text-[10px] text-slate-500">Clients can view you and initiate chat requests</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleOnline}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-slate-800'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOnline ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>

                        {/* Busy toggle */}
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${
                          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
                        }`}>
                          <div>
                            <span className={`text-xs font-bold block ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>Busy / Engaged Status</span>
                            <span className="text-[10px] text-slate-500">Puts a busy badge on your public booking profile</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleBusy}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isBusy ? 'bg-amber-500' : 'bg-slate-800'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBusy ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>

                      <div className={`text-xs font-sans p-3 rounded-xl text-center border ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-850 text-slate-300'
                      }`}>
                        Presence state: <strong className={isOnline ? (isBusy ? (theme === 'light' ? 'text-amber-600' : 'text-amber-400') : (theme === 'light' ? 'text-emerald-600' : 'text-emerald-400')) : 'text-slate-500'}>
                          {isOnline ? (isBusy ? '🟠 ENGAGED / BUSY' : '🟢 ONLINE & AVAILABLE') : '🔴 OFFLINE'}
                        </strong>
                      </div>
                    </div>

                  </div>

                  {/* Fully structured salary cycle */}
                  {salaryInfo && (
                    <div className={`border rounded-2xl p-6 shadow-lg space-y-4 ${
                      theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-880 text-slate-100'
                    }`}>
                      <div className={`flex items-center space-x-2 pb-2 border-b ${
                        theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                      }`}>
                        <Coins className={`w-5 h-5 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        <h3 className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Monthly Salary Cycle</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
                        <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'}`}>
                          <span className="text-[9px] text-slate-500 font-sans uppercase tracking-wider block mb-1">Cleared Earnings Expected</span>
                          <strong className={`text-base font-mono block ${theme === 'light' ? 'text-emerald-600 font-black' : 'text-emerald-400'}`}>₹{salaryInfo.prevCycleEarnings.toFixed(2)}</strong>
                          <span className="text-[9px] text-slate-500 block mt-1">Accrued up to cutoff day ({salaryInfo.cutoffDay}th)</span>
                        </div>

                        <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'}`}>
                          <span className="text-[9px] text-slate-500 font-sans uppercase tracking-wider block mb-1">Target Credit Timeline</span>
                          <strong className={`text-base font-mono block ${theme === 'light' ? 'text-amber-600 font-black' : 'text-amber-400'}`}>By {salaryInfo.payoutDay}th of {salaryInfo.payoutMonthName}</strong>
                          <span className="text-[9px] text-slate-500 block mt-1">Disbursed to verified bank account</span>
                        </div>

                        <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'}`}>
                          <span className="text-[9px] text-slate-500 font-sans uppercase tracking-wider block mb-1">Ongoing Unbilled Cycle</span>
                          <strong className={`text-base font-mono block ${theme === 'light' ? 'text-slate-950 font-black' : 'text-slate-200'}`}>₹{salaryInfo.currentCycleEarnings.toFixed(2)}</strong>
                          <span className="text-[9px] text-slate-500 block mt-1">Rolling into next month's cutoff</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 italic leading-relaxed pt-2">
                        *Official Notice: Every month, your accrued consulting fees up to the {salaryInfo.cutoffDay}th cutoff are processed. The funds are batched and directly credited to your registered bank credentials by the {salaryInfo.payoutDay}th of the subsequent month.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: PROFILE SETTINGS */}
              {activeTab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 text-left"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <Settings2 className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-slate-100 font-sans">Edit Profile</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Home</span>
                    </button>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    {/* ACCOUNT CREDENTIALS & SECURITY */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-sans">🔒 Account Credentials & Secure Info</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-sans text-slate-400">Username (Unique Public URL Slug)</label>
                          <input
                            type="text"
                            value={currentConsultant?.username || ''}
                            disabled
                            className="bg-slate-900/60 border border-slate-800 text-slate-400 text-xs rounded-xl px-4 py-2.5 w-full font-mono cursor-not-allowed select-all"
                            title="Username is locked as it maps to your public listing page link."
                          />
                          <span className="text-[9px] text-slate-500 block font-sans">Public Link: callmint.com/u/{currentConsultant?.username || 'username'}</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-sans text-slate-400">Display / Public Name</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-sans text-slate-400">Registered Email Address</label>
                          <input
                            type="email"
                            value={email}
                            disabled={true}
                            className="bg-slate-950/60 border border-slate-800 text-slate-400 text-xs rounded-xl px-4 py-2.5 w-full focus:outline-none font-sans cursor-not-allowed opacity-70"
                            required
                          />
                          <p className="text-[10px] text-amber-500/80 mt-1 font-mono">
                            🔒 Email address is locked after registration.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-sans text-slate-400">Registered Phone Number</label>
                          <input
                            type="tel"
                            value={phone}
                            disabled={true}
                            className="bg-slate-950/60 border border-slate-800 text-slate-400 text-xs rounded-xl px-4 py-2.5 w-full focus:outline-none font-mono cursor-not-allowed opacity-70"
                            required
                          />
                          <p className="text-[10px] text-amber-500/80 mt-1 font-mono">
                            🔒 Phone number is locked after registration.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PUBLIC LISTING DETAILS */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-sans">🌟 Public Profile Listing & Specialties</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-sans text-slate-400">Expertise Category</label>
                          <select
                            value={category}
                            onChange={(e: any) => setCategory(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans cursor-pointer"
                          >
                            <option value="Astrologers">Astrologers</option>
                            <option value="Influencers">Influencers</option>
                            <option value="Coaches">Coaches</option>
                            <option value="Consultants">Consultants</option>
                            <option value="Lawyers">Lawyers</option>
                            <option value="Mentors">Mentors</option>
                            <option value="Doctors">Doctors</option>
                            <option value="Singers">Singers</option>
                            <option value="Advisors">Advisors</option>
                            <option value="Friends">Friends</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-sans text-slate-400">Years of Professional Experience</label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={experience}
                            onChange={(e) => setExperience(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-sans text-slate-400">Languages Known (Comma separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. English, Hindi, Punjabi"
                            value={languages}
                            onChange={(e) => setLanguages(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-sans text-slate-400">Key Specializations (Comma separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. Vedic Astrology, Relationships, Finance"
                            value={specializations}
                            onChange={(e) => setSpecializations(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-sans">📸 Profile Media & Bio</h4>

                      <div className="space-y-3">
                        <label className="block text-xs font-sans text-slate-400">Display Profile Photo (Upload ya direct image URL select karein)</label>
                        <div className="flex flex-col sm:flex-row items-stretch gap-3">
                          <input
                            type="text"
                            placeholder="https://... direct photo link input"
                            value={photoUrl}
                            onChange={(e) => setPhotoUrl(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 font-mono"
                          />
                          
                          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                            <input
                              type="file"
                              accept="image/*"
                              id="consultant-photo-upload-tab"
                              className="hidden"
                              onChange={handlePhotoUpload}
                              disabled={uploadingPhoto}
                            />
                            <label
                              htmlFor="consultant-photo-upload-tab"
                              className={`cursor-pointer bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 w-full sm:w-auto shrink-0 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <span>{uploadingPhoto ? 'Uploading...' : '📁 Upload File'}</span>
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

                        {photoUrl && (
                          <div className="mt-3 flex items-center space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-850 max-w-md">
                            <img 
                              src={photoUrl} 
                              alt="Live Preview" 
                              className="w-10 h-10 rounded-lg object-cover border border-slate-800 cursor-pointer hover:opacity-85 transition-opacity" 
                              onClick={() => setLightboxImage(photoUrl)}
                              title="Click to view photo"
                              onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }} 
                              referrerPolicy="no-referrer" 
                            />
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Live Profile Picture Preview</span>
                              <span className="text-[9px] text-emerald-400 font-mono block truncate max-w-[200px]">{photoUrl}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-sans text-slate-400">My Consultation Call Rate (INR per Minute)</label>
                          {wallet?.plan_id && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded font-mono font-bold">
                              Plan Maximum Limit: ₹{plans.find(p => p.id === wallet.plan_id)?.max_consultant_rate ?? 25}/min
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          min="5"
                          placeholder="25"
                          value={pricePerMin}
                          onChange={(e) => {
                            const val = e.target.value;
                            const activePlan = plans.find(p => p.id === wallet?.plan_id);
                            const maxRate = activePlan?.max_consultant_rate ?? 1000.0;
                            if (val === '') {
                              setPricePerMin('');
                            } else {
                              const num = parseFloat(val);
                              if (!isNaN(num)) {
                                if (num <= maxRate) {
                                  setPricePerMin(val);
                                } else {
                                  setPricePerMin(maxRate.toString());
                                }
                              }
                            }
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono font-bold"
                        />
                        {wallet?.plan_id && parseFloat(pricePerMin) > (plans.find(p => p.id === wallet.plan_id)?.max_consultant_rate ?? 25) && (
                          <p className="text-[10px] text-rose-400 font-bold mt-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                            ⚠️ Warning: Your active subscription plan allows you to set a rate up to ₹{plans.find(p => p.id === wallet.plan_id)?.max_consultant_rate ?? 25}/minute.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-sans text-slate-400">Professional Bio / Area of Expertise</label>
                        <textarea
                          placeholder="Describe your expertise, certifications, and what clients can expect during a pay-per-minute consultation..."
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={5}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full resize-none font-sans"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 py-3 rounded-xl text-xs font-extrabold w-full transition-all uppercase tracking-wider shadow-lg hover:shadow-emerald-500/5"
                    >
                      Save Profile & Consultation Settings
                    </button>
                    {profileFeedbackSuccess && (
                      <p className="text-xs text-emerald-400 font-bold mt-2 text-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                        ✓ {profileFeedbackSuccess}
                      </p>
                    )}
                    {profileFeedbackError && (
                      <p className="text-xs text-rose-400 font-bold mt-2 text-center bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                        ✗ {profileFeedbackError}
                      </p>
                    )}
                  </form>
                </motion.div>
              )}

              {/* TAB 4: CONSULTATIONS & CLIENT HISTORY & BLOCKLIST */}
              {activeTab === 'sessions' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {/* Chat Session Table */}
                  <div className={`border rounded-2xl p-6 shadow-lg space-y-4 text-left ${
                    theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-880 text-slate-100'
                  }`}>
                    <div className={`flex items-center justify-between pb-2 border-b gap-2 ${
                      theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                    }`}>
                      <div className="flex items-center space-x-2 min-w-0">
                        <FileText className={`w-6 h-6 shrink-0 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                        <h3 className={`font-bold truncate text-sm sm:text-base ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Consultation History</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                          theme === 'light'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                            : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Go Back</span>
                      </button>
                    </div>

                    <div className="flex flex-col max-h-[550px] overflow-y-auto overflow-x-hidden pr-1 sessions-scrollbar">
                      {sessions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs font-sans">No sessions recorded yet for your account.</div>
                      ) : (
                        sessions.map((sess, index) => {
                          const isUserBlocked = blockedUsers.some(b => b.user_name.toLowerCase() === sess.user_name.toLowerCase());
                          return (
                            <React.Fragment key={sess.id}>
                              <div
                                className="py-5 first:pt-0 last:pb-0 space-y-3.5 text-left"
                              >
                                {/* Header Area */}
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    theme === 'light'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                                      : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                                  }`}>
                                    {sess.user_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className={`font-semibold text-[13px] ${
                                        theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                                      }`}>
                                        {sess.user_name}
                                      </p>
                                      {isUserBlocked && (
                                        <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase leading-none">
                                          Blocked
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                                      #sess_{sess.id}
                                    </p>
                                  </div>
                                </div>

                                {/* Details Rows */}
                                <div className="space-y-2 pt-1 text-[12px] font-sans">
                                  <div className="flex justify-between items-center gap-4 whitespace-nowrap">
                                    <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Duration</span>
                                    <span className={`font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'} flex-shrink-0`}>{sess.duration_minutes} mins</span>
                                  </div>

                                  <div className="flex justify-between items-center gap-4 whitespace-nowrap">
                                    <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Rate</span>
                                    <span className={`font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'} flex-shrink-0`}>₹{sess.price_per_minute}/min</span>
                                  </div>

                                  <div className="flex justify-between items-center gap-4 whitespace-nowrap">
                                    <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">
                                      Earnings <span className="text-[10px] text-slate-400 font-normal">(after platform commission)</span>
                                    </span>
                                    <span className="font-semibold text-emerald-500 dark:text-emerald-450 flex-shrink-0">₹{sess.consultant_earnings.toFixed(2)}</span>
                                  </div>

                                  {sess.refunded_amount > 0 && (
                                    <div className="flex justify-between items-center gap-4 whitespace-nowrap">
                                      <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Refund deducted</span>
                                      <span className="font-semibold text-rose-500 dark:text-rose-400 flex-shrink-0">-₹{sess.refunded_amount.toFixed(2)} ({sess.refunded_minutes} mins)</span>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center gap-4 whitespace-nowrap">
                                    <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Date & Time</span>
                                    <span className={`font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'} flex-shrink-0`}>
                                      {new Date(sess.created_at).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'numeric',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center gap-4 whitespace-nowrap">
                                    <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Status</span>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {sess.status === 'completed' && (
                                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Completed</span>
                                      )}
                                      {sess.refunded_amount > 0 && (
                                        <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Refunded</span>
                                      )}
                                      {sess.status === 'active' && (
                                        <span className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold animate-pulse">Live Now</span>
                                      )}
                                      {sess.status === 'rejected' && (
                                        <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Rejected</span>
                                      )}
                                      {sess.status === 'missed' && (
                                        <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold">Missed</span>
                                      )}
                                    </div>
                                  </div>

                                  {sess.rating && (
                                    <div className="flex justify-between items-center gap-4 text-[12px] font-sans min-w-0">
                                      <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">Rating & Review</span>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex items-center text-amber-400 flex-shrink-0">
                                          {[...Array(5)].map((_, i) => (
                                            <Star
                                              key={i}
                                              className={`w-2.5 h-2.5 ${i < sess.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                                            />
                                          ))}
                                        </div>
                                        {sess.review_text && (
                                          <span className="text-[10px] italic text-slate-500 truncate max-w-[100px] sm:max-w-[200px]" title={sess.review_text}>
                                            "{sess.review_text}"
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Actions Row */}
                                {sess.status === 'completed' ? (
                                  <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                      onClick={() => {
                                        onSelectSession(sess.id, currentConsultant?.display_name || 'Consultant', 'consultant', true);
                                      }}
                                      className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                                        theme === 'light'
                                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/15'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/15'
                                      }`}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>View Chat</span>
                                    </button>

                                    {isUserBlocked ? (
                                      <button
                                        onClick={() => handleUnblockUser(sess.user_name)}
                                        className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                                          theme === 'light'
                                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                            : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                                        }`}
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                        <span>Unblock</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleBlockUser(sess.user_name)}
                                        className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-xl transition-all active:scale-95 cursor-pointer border ${
                                          theme === 'light'
                                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border-rose-500/15'
                                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/15'
                                        }`}
                                      >
                                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                        <span>Block Client</span>
                                      </button>
                                    )}
                                  </div>
                                ) : sess.status === 'active' ? (
                                  <div className="pt-2">
                                    <button
                                      onClick={() => {
                                        if (currentConsultant) {
                                          onSelectSession(sess.id, currentConsultant.display_name, 'consultant');
                                        }
                                      }}
                                      className="w-full bg-cyan-505 hover:bg-cyan-600 text-slate-950 text-xs font-bold py-2.5 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                                      <span>Join Room</span>
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                              {index < sessions.length - 1 && (
                                <div className={`border-b ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}`} />
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Blocked Users Card */}
                  <div className={`border rounded-2xl p-6 shadow-lg space-y-4 text-left ${
                    theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-880 text-slate-100'
                  }`}>
                    <div className={`flex items-center space-x-2 pb-2 border-b ${
                      theme === 'light' ? 'border-slate-100' : 'border-slate-800'
                    }`}>
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      <h3 className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>Blocked Clients List</h3>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {blockedUsers.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-xs font-sans">No clients are currently blocked.</div>
                      ) : (
                        blockedUsers.map((b) => (
                          <div key={b.id} className={`px-4 py-3 rounded-xl flex items-center justify-between border ${
                            theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'
                          }`}>
                            <div className="space-y-0.5">
                              <span className={`text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>{b.user_name}</span>
                              <p className="text-[9px] text-slate-500 font-sans">Blocked on: {new Date(b.created_at).toLocaleDateString()}</p>
                            </div>
                            <button
                              onClick={() => handleUnblockUser(b.user_name)}
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/15 rounded-lg text-[10px] px-3 py-1 font-bold transition-all"
                            >
                              Unblock User
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: KYC Verification Update */}
              {activeTab === 'kyc' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 text-left"
                  id="kyc-verification-tab"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-slate-100 font-sans">Aadhaar & PAN Verification (KYC Update)</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard</span>
                    </button>
                  </div>

                  {/* KYC Status Indicator Banner */}
                  <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 border-slate-850" id="kyc-status-banner">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] text-slate-500 font-sans uppercase tracking-wider block">Current KYC Status</span>
                      <span className={`text-sm font-extrabold font-mono uppercase tracking-wide block ${
                        kycStatus === 'approved' ? 'text-emerald-400' :
                        kycStatus === 'pending' ? 'text-amber-400 animate-pulse' :
                        kycStatus === 'rejected' ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {kycStatus === 'approved' ? 'Approved (✅ Verified)' :
                         kycStatus === 'pending' ? 'Under Review (⏳ Pending Admin Approval)' :
                         kycStatus === 'rejected' ? 'Rejected (❌ Resubmission Required)' :
                         'Not Submitted (⚠️ Action Required)'}
                      </span>
                      {kycStatus === 'rejected' && kycRejectReason && (
                        <p className="text-[11px] text-rose-300 font-sans mt-1 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                          <strong>Reject Reason:</strong> {kycRejectReason}
                        </p>
                      )}
                    </div>
                    {kycStatus === 'approved' && (
                      <span className="bg-emerald-500 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs font-mono shadow-md uppercase tracking-wide">Approved</span>
                    )}
                  </div>

                  <form onSubmit={handleUpdateKyc} className="space-y-6" id="kyc-verification-form">
                    
                    {/* Aadhaar Number and photo */}
                    <div className="space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-850">
                      <h4 className="text-xs font-bold font-sans text-emerald-400 uppercase tracking-widest border-b border-slate-900 pb-2">1. Aadhaar Card Verification</h4>
                      
                      <div className="space-y-1.5">
                        <label className="block text-xs font-sans text-slate-400" htmlFor="aadhaar-number-input">Aadhaar Card Number (12 Digits)</label>
                        <input
                          id="aadhaar-number-input"
                          type="text"
                          maxLength={12}
                          placeholder="Enter your 12-digit Aadhaar Card number"
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                          disabled={kycStatus === 'approved' || kycStatus === 'pending'}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono tracking-widest font-bold"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-sans text-slate-400">Aadhaar Photo Attachment</label>
                        
                        {(kycStatus === 'unsubmitted' || kycStatus === 'rejected') ? (
                          <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            <input
                              type="text"
                              placeholder="Direct photo link or upload file below..."
                              value={aadhaarPhotoUrl}
                              onChange={(e) => setAadhaarPhotoUrl(e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 font-mono text-[11px]"
                            />
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="file"
                                accept="image/*"
                                id="aadhaar-photo-uploader"
                                className="hidden"
                                onChange={handleAadhaarUpload}
                                disabled={uploadingAadhaar}
                              />
                              <label
                                htmlFor="aadhaar-photo-uploader"
                                className={`cursor-pointer bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 w-full sm:w-auto shrink-0 ${uploadingAadhaar ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                <span>{uploadingAadhaar ? 'Uploading...' : '📁 Upload Photo'}</span>
                              </label>
                            </div>
                          </div>
                        ) : null}

                        {aadhaarPhotoUrl && (
                          <div className={`mt-2 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-slate-900 border-slate-800'
                          }`} id="aadhaar-photo-preview">
                            <div className="flex items-center space-x-3 w-full sm:w-auto">
                              <img 
                                src={aadhaarPhotoUrl} 
                                alt="Aadhaar Preview" 
                                onClick={() => setPreviewImageUrl(aadhaarPhotoUrl)}
                                className={`w-12 h-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border ${
                                  theme === 'light' ? 'border-slate-200' : 'border-slate-800'
                                }`}
                                referrerPolicy="no-referrer"
                                title="Click to preview full image"
                              />
                              <div className="text-left">
                                <span className={`text-[10px] font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>Aadhaar Card Attachment Verified</span>
                                <span className={`text-[9px] font-mono block truncate max-w-[120px] sm:max-w-[220px] ${
                                  theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'
                                }`}>{aadhaarPhotoUrl}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/10">
                              <button
                                type="button"
                                onClick={() => setPreviewImageUrl(aadhaarPhotoUrl)}
                                className={`text-xs font-bold transition-all font-sans px-2.5 py-1 rounded-lg border cursor-pointer ${
                                  theme === 'light'
                                    ? 'text-emerald-600 hover:text-emerald-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                                    : 'text-emerald-400 hover:text-emerald-300 bg-slate-850 hover:bg-slate-800 border-slate-750'
                                }`}
                              >
                                Preview
                              </button>
                              {(kycStatus === 'unsubmitted' || kycStatus === 'rejected') && (
                                <button
                                  type="button"
                                  onClick={() => setAadhaarPhotoUrl('')}
                                  className={`text-xs font-bold transition-all font-sans px-2.5 py-1 rounded-lg border cursor-pointer ${
                                    theme === 'light'
                                      ? 'text-rose-600 hover:text-rose-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                                      : 'text-rose-400 hover:text-rose-300 bg-slate-850 hover:bg-slate-800 border-slate-750'
                                  }`}
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PAN Card Details */}
                    <div className="space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-850">
                      <h4 className="text-xs font-bold font-sans text-emerald-400 uppercase tracking-widest border-b border-slate-900 pb-2">2. PAN Card Verification</h4>
                      
                      <div className="space-y-1.5">
                        <label className="block text-xs font-sans text-slate-400" htmlFor="pan-number-input">PAN Card Number</label>
                        <input
                          id="pan-number-input"
                          type="text"
                          maxLength={10}
                          placeholder="Enter your 10-character PAN Card number"
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                          disabled={kycStatus === 'approved' || kycStatus === 'pending'}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono tracking-wider font-bold uppercase"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-sans text-slate-400">PAN Card Photo Attachment</label>
                        
                        {(kycStatus === 'unsubmitted' || kycStatus === 'rejected') ? (
                          <div className="flex flex-col sm:flex-row items-stretch gap-3">
                            <input
                              type="text"
                              placeholder="Direct photo link or upload file below..."
                              value={panPhotoUrl}
                              onChange={(e) => setPanPhotoUrl(e.target.value)}
                              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 font-mono text-[11px]"
                            />
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="file"
                                accept="image/*"
                                id="pan-photo-uploader"
                                className="hidden"
                                onChange={handlePanUpload}
                                disabled={uploadingPan}
                              />
                              <label
                                htmlFor="pan-photo-uploader"
                                className={`cursor-pointer bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 w-full sm:w-auto shrink-0 ${uploadingPan ? 'opacity-50 pointer-events-none' : ''}`}
                              >
                                <span>{uploadingPan ? 'Uploading...' : '📁 Upload Photo'}</span>
                              </label>
                            </div>
                          </div>
                        ) : null}

                        {panPhotoUrl && (
                          <div className={`mt-2 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            theme === 'light'
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-slate-900 border-slate-800'
                          }`} id="pan-photo-preview">
                            <div className="flex items-center space-x-3 w-full sm:w-auto">
                              <img 
                                src={panPhotoUrl} 
                                alt="PAN Preview" 
                                onClick={() => setPreviewImageUrl(panPhotoUrl)}
                                className={`w-12 h-12 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border ${
                                  theme === 'light' ? 'border-slate-200' : 'border-slate-800'
                                }`}
                                referrerPolicy="no-referrer"
                                title="Click to preview full image"
                              />
                              <div className="text-left">
                                <span className={`text-[10px] font-bold block ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>PAN Card Attachment Verified</span>
                                <span className={`text-[9px] font-mono block truncate max-w-[120px] sm:max-w-[220px] ${
                                  theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'
                                }`}>{panPhotoUrl}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/10">
                              <button
                                type="button"
                                onClick={() => setPreviewImageUrl(panPhotoUrl)}
                                className={`text-xs font-bold transition-all font-sans px-2.5 py-1 rounded-lg border cursor-pointer ${
                                  theme === 'light'
                                    ? 'text-emerald-600 hover:text-emerald-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                                    : 'text-emerald-400 hover:text-emerald-300 bg-slate-850 hover:bg-slate-800 border-slate-750'
                                }`}
                              >
                                Preview
                              </button>
                              {(kycStatus === 'unsubmitted' || kycStatus === 'rejected') && (
                                <button
                                  type="button"
                                  onClick={() => setPanPhotoUrl('')}
                                  className={`text-xs font-bold transition-all font-sans px-2.5 py-1 rounded-lg border cursor-pointer ${
                                    theme === 'light'
                                      ? 'text-rose-600 hover:text-rose-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                                      : 'text-rose-400 hover:text-rose-300 bg-slate-850 hover:bg-slate-800 border-slate-750'
                                  }`}
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {(kycStatus === 'unsubmitted' || kycStatus === 'rejected') && (
                      <button
                        type="submit"
                        id="kyc-submit-button"
                        className="bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 py-3 rounded-xl text-xs font-extrabold w-full transition-all uppercase tracking-wider shadow-lg hover:shadow-emerald-500/5"
                      >
                        Submit KYC Documents for Admin Review
                      </button>
                    )}

                    {/* KYC Submission feedback directly below submit button */}
                    {kycFeedbackSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 text-xs font-mono font-bold mt-4 text-center animate-bounce">
                        ✅ {kycFeedbackSuccess}
                      </div>
                    )}
                    {kycFeedbackError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs font-mono font-bold mt-4 text-center">
                        ❌ {kycFeedbackError}
                      </div>
                    )}
                  </form>
                </motion.div>
              )}

              {/* TAB: Availability Schedule */}
              {activeTab === 'schedules' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 text-left"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-slate-100 font-sans">Availability Schedule</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Go Back</span>
                    </button>
                  </div>

                  {/* Add / Edit Schedule Form */}
                  <form onSubmit={handleSaveSchedule} className="bg-slate-950/80 p-5 rounded-xl border border-slate-800/60 space-y-4">
                    <h4 className="text-xs font-bold font-sans text-emerald-400 uppercase tracking-widest">
                      {editingScheduleId ? '✏️ Edit Schedule' : '➕ Add Availability Slot'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-sans text-slate-400 mb-1">Date <span className="text-slate-500">(Optional)</span></label>
                        <input
                          type="date"
                          value={newDate}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-sans text-slate-400 mb-1">Day <span className="text-slate-500">(Optional)</span></label>
                        <select
                          value={newDay}
                          onChange={(e) => {
                            setNewDay(e.target.value);
                            if (e.target.value) setNewDate(''); // Clear date if day is picked
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Choose Day --</option>
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday">Sunday</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-sans text-slate-400 mb-1">From Time *</label>
                        <input
                          type="time"
                          required
                          value={newFromTime}
                          onChange={(e) => setNewFromTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {newFromTime && (
                          <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                            Selected: {formatTimeTo12Hour(newFromTime)}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-sans text-slate-400 mb-1">To Time *</label>
                        <input
                          type="time"
                          required
                          value={newToTime}
                          onChange={(e) => setNewToTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {newToTime && (
                          <span className="text-[10px] text-emerald-400 font-mono mt-1 block">
                            Selected: {formatTimeTo12Hour(newToTime)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSaveDisabled}
                        className={`font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md ${
                          isSaveDisabled
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 border border-slate-700'
                            : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 cursor-pointer'
                        }`}
                      >
                        {editingScheduleId ? 'Update Slot' : 'Save Slot'}
                      </button>
                      {editingScheduleId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingScheduleId(null);
                            setNewDate('');
                            setNewDay('');
                            setNewFromTime('');
                            setNewToTime('');
                          }}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs px-4 py-2 rounded-xl transition-all border border-slate-800"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Active Slots List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold font-sans text-slate-400 uppercase tracking-widest">
                      Your Availability Slots
                    </h4>

                    {scheduleLoading ? (
                      <div className="text-center py-6 text-slate-500 text-xs font-sans">
                        Loading slots...
                      </div>
                    ) : schedules.length === 0 ? (
                      <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-xl py-8 text-center text-slate-500 text-xs">
                        No availability schedules set. Please add a slot above.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {schedules.map((sch) => (
                          <div key={sch.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="inline-block text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                                {sch.date ? formatToYYYYMMDD(sch.date) : sch.day}
                              </span>
                              <div className="text-xs font-bold text-slate-200">
                                {formatTimeTo12Hour(sch.from_time)} to {formatTimeTo12Hour(sch.to_time)}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => {
                                  setEditingScheduleId(sch.id);
                                  setNewDate(sch.date || '');
                                  setNewDay(sch.day || '');
                                  setNewFromTime(sch.from_time);
                                  setNewToTime(sch.to_time);
                                }}
                                className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors text-xs"
                                title="Edit Slot"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(sch.id)}
                                className="p-1.5 bg-rose-950/30 border border-rose-900/40 text-rose-400 hover:text-rose-300 rounded-lg transition-colors text-xs"
                                title="Delete Slot"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 6: Bank Account Details */}
              {activeTab === 'bank' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 text-left"
                  id="bank-details-tab"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <Wallet className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-slate-100 font-sans">Bank Details For Payout</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Home</span>
                    </button>
                  </div>

                  {/* Bank Details Status Indicator Banner */}
                  <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 border-slate-850" id="bank-status-banner">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] text-slate-500 font-sans uppercase tracking-wider block">Bank Account Verification Status</span>
                      <span className={`text-sm font-extrabold font-mono uppercase tracking-wide block ${
                        bankStatus === 'approved' ? 'text-emerald-400' :
                        bankStatus === 'pending' ? 'text-amber-400 animate-pulse' :
                        bankStatus === 'rejected' ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {bankStatus === 'approved' ? 'Approved (✅ Verified / Approved)' :
                         bankStatus === 'pending' ? 'Under Review (⏳ Pending Admin Approval)' :
                         bankStatus === 'rejected' ? 'Rejected (❌ Resubmission Required)' :
                         'Not Configured (⚠️ Setup Payout Details)'}
                      </span>
                      {bankStatus === 'rejected' && bankRejectReason && (
                        <p className="text-[11px] text-rose-300 font-sans mt-1 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                          <strong>Reject Reason:</strong> {bankRejectReason}
                        </p>
                      )}
                    </div>
                    {bankStatus === 'approved' && (
                      <span className="bg-emerald-500 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs font-mono shadow-md uppercase tracking-wide">Verified</span>
                    )}
                  </div>

                  <form onSubmit={handleUpdateBank} className="space-y-4" id="bank-verification-form">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-sans text-slate-400" htmlFor="bank-holder-name-input">Account Holder Name</label>
                      <input
                        id="bank-holder-name-input"
                        type="text"
                        placeholder="Enter the official bank account holder name"
                        value={bankAccountHolderName}
                        onChange={(e) => setBankAccountHolderName(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
                        disabled={bankStatus === 'approved' || bankStatus === 'pending'}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-sans font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-sans text-slate-400" htmlFor="bank-account-number-input">Account Number</label>
                      <div className="relative flex items-center">
                        <input
                          id="bank-account-number-input"
                          type="text"
                          placeholder="Enter account number"
                          value={(bankStatus === 'approved' || bankStatus === 'pending') && !showAccountNumber ? (() => {
                            if (bankAccountNumber.length <= 6) {
                              return '*'.repeat(bankAccountNumber.length);
                            }
                            return '*'.repeat(bankAccountNumber.length - 6) + bankAccountNumber.slice(-6);
                          })() : bankAccountNumber}
                          onChange={(e) => {
                            if (bankStatus !== 'approved' && bankStatus !== 'pending') {
                              setBankAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 18));
                            }
                          }}
                          disabled={bankStatus === 'approved' || bankStatus === 'pending'}
                          maxLength={18}
                          className="bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono tracking-widest font-bold"
                        />
                        {bankAccountNumber && (
                          <button
                            type="button"
                            onClick={() => setShowAccountNumber(!showAccountNumber)}
                            className="absolute right-3 text-slate-400 hover:text-slate-200 p-1 transition-colors cursor-pointer"
                            title={showAccountNumber ? "Hide Account Number" : "Show Account Number"}
                          >
                            {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-sans text-slate-400" htmlFor="bank-ifsc-input">Bank IFSC Code</label>
                      <input
                        id="bank-ifsc-input"
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={bankIfscCode}
                        onChange={(e) => setBankIfscCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 11))}
                        disabled={bankStatus === 'approved' || bankStatus === 'pending'}
                        maxLength={11}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono tracking-wider font-bold uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-sans text-slate-400" htmlFor="bank-name-input">Bank Name</label>
                      <input
                        id="bank-name-input"
                        type="text"
                        placeholder="e.g. State Bank of India"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        disabled={bankStatus === 'approved' || bankStatus === 'pending'}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-sans font-bold"
                      />
                    </div>

                    {(bankStatus === 'unsubmitted' || bankStatus === 'rejected') && (
                      <button
                        type="submit"
                        id="bank-submit-button"
                        className="bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 py-3 rounded-xl text-xs font-extrabold w-full transition-all uppercase tracking-wider shadow-lg hover:shadow-emerald-500/5 mt-4"
                      >
                        Submit For Payout Approval
                      </button>
                    )}

                    {/* Bank Submission feedback directly below submit button */}
                    {bankFeedbackSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 text-xs font-mono font-bold mt-4 text-center animate-bounce">
                        ✅ {bankFeedbackSuccess}
                      </div>
                    )}
                    {bankFeedbackError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs font-mono font-bold mt-4 text-center">
                        ❌ {bankFeedbackError}
                      </div>
                    )}
                  </form>
                </motion.div>
              )}

              {/* TAB 7: Consultant Support & Helpdesk */}
              {activeTab === 'support' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 text-left"
                  id="consultant-support-tab"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-slate-100 font-sans">Customer Support</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Go Back</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left side: Raise ticket form */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-widest">Raise a Support Ticket</h4>
                      <p className="text-xs text-slate-400">
                        Are you experiencing issues with payouts, chat requests, or any other client issues? Please raise a support ticket, and our admin team will handle it as soon as possible.
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
                              sender_type: 'consultant',
                              sender_id: currentConsultant?.id,
                              sender_name: currentConsultant?.display_name,
                              session_id: session_id || null,
                              subject,
                              message
                            })
                          });

                          if (res.ok) {
                            setSuccess('Support ticket submitted successfully!');
                            form.reset();
                            fetchConsultantTickets();
                          } else {
                            const data = await res.json();
                            setError(data.error || 'Failed to submit support ticket');
                          }
                        } catch (err: any) {
                          setError(err.message || 'Error sending support ticket');
                        }
                      }} className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-sans text-slate-500 uppercase tracking-wider">Subject / Topic *</label>
                          <input
                            type="text"
                            name="subject"
                            required
                            placeholder="Brief title of your query..."
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-sans text-slate-500 uppercase tracking-wider">Select Chat Reference (Optional)</label>
                          <select
                            name="session_id"
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full font-sans"
                          >
                            <option value="">-- No Specific Chat Reference --</option>
                            {sessions.map(s => (
                              <option key={s.id} value={s.id}>
                                Session #{s.id} with {s.user_name} ({new Date(s.created_at || '').toLocaleDateString()})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-sans text-slate-500 uppercase tracking-wider">Message / Explanation *</label>
                          <textarea
                            name="message"
                            required
                            rows={4}
                            placeholder="Provide precise details of the issue..."
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl transition-all shadow-md w-full uppercase tracking-wider"
                        >
                          Submit Helpdesk Ticket
                        </button>
                      </form>
                    </div>

                    {/* Right side: Tickets List */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-widest">Your Raised Tickets</h4>
                      
                      {loadingConsultantTickets ? (
                        <div className="text-center py-12 text-slate-500 text-xs font-sans animate-pulse">Loading helpdesk tickets...</div>
                      ) : consultantTickets.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs font-sans bg-slate-950/40 rounded-2xl border border-dashed border-slate-800/80">
                          Aapne abhi tak koi support ticket raise nahi kiya hai.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                          {consultantTickets.map((t: any) => (
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
                                  Reference Session ID: <strong className="text-slate-300 font-bold">#{t.session_id}</strong>
                                </div>
                              )}

                              <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-850/50">
                                {t.message}
                              </p>

                              {/* Conversation Thread history for Consultant */}
                              {t.replies && t.replies.length > 0 ? (
                                <div className="space-y-2 mt-2 pt-2 border-t border-slate-850/70">
                                  <span className="text-[10px] font-sans text-slate-500 uppercase tracking-wider block">Conversation History:</span>
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
                                        <div className={`flex items-center gap-1 text-[9px] text-slate-500 font-sans ${reply.sender_type === 'admin' ? 'justify-start' : 'justify-end'}`}>
                                          <span className={reply.sender_type === 'admin' ? 'text-emerald-400 font-bold' : 'text-purple-400 font-bold'}>
                                            {reply.sender_type === 'admin' ? '🛡 Admin Support' : '🙋 You'}
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
                                    <span>🛡 Support Administrator Reply:</span>
                                    <span className="font-mono text-slate-500 font-normal">{new Date(t.replied_at).toLocaleString()}</span>
                                  </div>
                                  <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                                    {t.admin_reply}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500 font-sans">
                                  Waiting for administrator response...
                                </div>
                              )}

                              {/* Consultant Reply Back Option */}
                              {t.status !== 'closed' && (
                                (() => {
                                  const lastReplyIsAdmin = t.replies && t.replies.length > 0
                                    ? t.replies[t.replies.length - 1].sender_type === 'admin'
                                    : !!t.admin_reply;
                                  
                                  if (lastReplyIsAdmin) {
                                    return (
                                      <form onSubmit={(e) => handleConsultantReplySubmit(e, t.id)} className="mt-3 pt-3 border-t border-slate-850/60 flex items-center gap-2">
                                        <input
                                          type="text"
                                          required
                                          placeholder="Type a follow-up reply..."
                                          value={consultantReplyDrafts[t.id] || ''}
                                          onChange={(e) => setConsultantReplyDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
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
                                <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-2.5 text-center text-[10px] text-slate-500 font-sans">
                                  🔒 Closed. No further replies allowed.
                                </div>
                              )}

                              <div className="text-[9px] text-slate-600 font-sans pt-1">
                                Raised At: {new Date(t.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 8: Your Followers */}
              {activeTab === 'followers' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 text-left"
                  id="consultant-followers-tab"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-slate-100 font-sans">Your Followers</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 hover:border-slate-600"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Go Back</span>
                    </button>
                  </div>

                  <div className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden">
                    {followersLoading ? (
                      <div className="p-8 text-center text-slate-500 text-xs font-mono">
                        Followers load ho rahe hain...
                      </div>
                    ) : followersList.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-700" />
                        <p className="text-sm font-bold text-slate-400">Abhi tak koi followers nahi hain</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Jaise hi users aapko follow karenge, unki profiles aur details yahan show hone lagengi.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-850">
                        {followersList.map((follower: any, idx: number) => (
                          <div key={follower.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                            <div className="flex items-center space-x-3.5">
                              {follower.photo_url ? (
                                <img
                                  src={follower.photo_url}
                                  alt={follower.display_name}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-800"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-sans">
                                  {(follower.display_name || 'U')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-sm text-slate-200">{follower.display_name || 'Anonymous User'}</h4>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block uppercase font-sans tracking-wider">Followed on</span>
                              <span className="text-xs text-slate-300 font-sans">
                                {follower.created_at ? new Date(follower.created_at).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 9: Notifications */}
              {activeTab === 'notifications' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-left"
                  id="consultant-notifications-tab"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-850">
                    <div className="flex items-center space-x-2.5">
                      <div className="bg-amber-500/15 p-2 rounded-xl border border-amber-500/20 text-amber-400">
                        <Bell className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg text-slate-100 font-sans tracking-tight leading-normal">Notifications</h3>
                        <p className="text-xs text-slate-400">Official updates, policy announcements, and platform-wide alerts.</p>
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
                        onClick={() => setActiveTab('dashboard')}
                        className="text-xs font-bold text-slate-300 hover:text-slate-100 transition-all bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center space-x-2 shadow-md active:scale-95 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>Back to Dashboard</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {clientNotifications.length === 0 ? (
                      <div className="text-center py-20 bg-slate-950/40 border border-slate-850 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center space-y-3">
                        <Bell className="w-8 h-8 text-slate-600 animate-pulse" />
                        <div>
                          <span className="font-bold text-slate-400">No Notifications Yet</span>
                          <p className="text-[10px] text-slate-500 mt-1">Platform administrators will alert you here when there are updates or policy changes.</p>
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
                                <span className="text-[10px] text-slate-500 font-sans">
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
                </motion.div>
              )}

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
                className="text-slate-400 hover:text-white bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 text-xs font-sans transition-colors"
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
                      <span className="text-[9px] text-slate-600 font-sans mt-0.5 px-1">
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
        </div>
      )}

      {/* Review & Buy Subscription Plan Modal */}
      {buyingPlan && currentConsultant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setBuyingPlan(null)}
          />

          {/* Modal Box */}
          <div className="relative w-full max-w-xl bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-850 shadow-2xl space-y-6 overflow-hidden animate-in zoom-in-95 duration-200 z-10 text-left max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setBuyingPlan(null)}
                className="text-slate-500 hover:text-slate-300 font-sans text-xs p-1 bg-slate-950 border border-slate-850 rounded-lg hover:border-slate-750"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex items-center space-x-3 pb-3 border-b border-slate-850">
              <div className="bg-emerald-500/10 p-2 rounded-xl">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-black font-sans text-slate-100">Review & Buy Subscription Plan</h3>
                <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest">
                  Plan: {buyingPlan.name} (₹{buyingPlan.price})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Please review and customize your listing details before checking out. Your username can be changed now, but your registered email and phone number are locked for security.
            </p>

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wide">
                  Consultant Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acharya Raj Shastri"
                  value={buyDisplayName}
                  onChange={(e) => setBuyDisplayName(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wide">
                  Custom Advisor Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. expert_raj"
                  value={buyUsername}
                  onChange={(e) => setBuyUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                  <span>Email Address (Locked)</span>
                  <Lock className="w-3 h-3 text-slate-500" />
                </label>
                <input
                  type="email"
                  value={currentConsultant.email}
                  readOnly
                  disabled
                  className="bg-slate-950/40 border border-slate-850/60 rounded-xl px-4 py-2.5 text-slate-400 text-xs w-full transition-all cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                  <span>Phone Number (Locked)</span>
                  <Lock className="w-3 h-3 text-slate-500" />
                </label>
                <input
                  type="text"
                  value={currentConsultant.phone}
                  readOnly
                  disabled
                  className="bg-slate-950/40 border border-slate-850/60 rounded-xl px-4 py-2.5 text-slate-400 text-xs w-full transition-all cursor-not-allowed font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wide">
                  My Professional Category
                </label>
                <select
                  value={buyCategory}
                  onChange={(e: any) => setBuyCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all"
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

              <div className="space-y-1.5">
                <label className="block text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                  <span>Audio/Chat Rate (₹ / Minute)</span>
                  {buyingPlan.max_consultant_rate !== undefined && (
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-bold">
                      Max Rate: ₹{buyingPlan.max_consultant_rate}
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="5"
                  placeholder="e.g. 25"
                  value={buyRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    const maxRate = buyingPlan.max_consultant_rate ?? 1000.0;
                    if (val === '') {
                      setBuyRate('');
                    } else {
                      const num = parseFloat(val);
                      if (!isNaN(num)) {
                        if (num <= maxRate) {
                          setBuyRate(val);
                        } else {
                          setBuyRate(maxRate.toString());
                        }
                      }
                    }
                  }}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Base price of {buyingPlan.name}</span>
                <strong className="text-slate-200 font-mono">₹{parseFloat(buyingPlan.price).toFixed(2)}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>GST (Exclusive 18%)</span>
                <strong className="text-amber-500 font-mono">+₹{(parseFloat(buyingPlan.price) * 0.18).toFixed(2)}</strong>
              </div>
              <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-sm font-bold">
                <span className="text-slate-300">Total Amount Payable</span>
                <strong className="text-emerald-400 font-mono">₹{(parseFloat(buyingPlan.price) * 1.18).toFixed(2)}</strong>
              </div>
            </div>

            {/* Pay CTA */}
            <button
              type="button"
              onClick={async () => {
                if (!buyDisplayName.trim()) {
                  alert('Display Name is required.');
                  return;
                }
                if (!buyUsername.trim()) {
                  alert('Username is required.');
                  return;
                }
                const rateVal = parseFloat(buyRate);
                if (isNaN(rateVal) || rateVal < 5) {
                  alert('Minimum consultation fee limit is ₹5/min. Isse below price set nahi ho sakta.');
                  return;
                }
                if (buyingPlan.max_consultant_rate !== undefined && rateVal > buyingPlan.max_consultant_rate) {
                  alert(`Selected plan "${buyingPlan.name}" maximum call rate is ₹${buyingPlan.max_consultant_rate}/minute. Please set a lower rate.`);
                  return;
                }

                const planId = buyingPlan.id;
                const details = {
                  username: buyUsername,
                  display_name: buyDisplayName,
                  category: buyCategory,
                  price_per_minute: rateVal
                };
                setBuyingPlan(null); // Close the modal

                await handleBuyPlanDirect(planId, details);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded-xl font-bold text-xs uppercase tracking-widest w-full transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Proceed to Buy Plan & Register</span>
            </button>
          </div>
        </div>
      )}

      {/* Subscription Purchase / Upgrade Success Modal */}
      {subscriptionSuccessDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div 
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md transition-opacity"
            onClick={() => setSubscriptionSuccessDetails(null)}
          />

          {/* Modal Box */}
          <div className="relative w-full max-w-lg bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 overflow-hidden animate-in zoom-in-95 duration-200 z-10 text-left max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setSubscriptionSuccessDetails(null)}
                className="text-slate-500 hover:text-slate-300 font-sans text-xs p-1 bg-slate-950 border border-slate-850 rounded-lg hover:border-slate-750 transition-all cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-slate-850">
              <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20 text-emerald-400">
                <Sparkles className="w-8 h-8 animate-pulse text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black font-sans text-slate-100">🎉 Partner Plan Activated!</h3>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                  Plan: {subscriptionSuccessDetails.planName}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed text-center">
              Congratulations <strong className="text-white">{subscriptionSuccessDetails.displayName}</strong>! Your partner channel is now live. We have generated/updated your secure portal credentials. Please copy and save them below:
            </p>

            {/* Credentials details section */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4 relative">
              <button
                type="button"
                onClick={() => {
                  const copyTxt = `Display Name: ${subscriptionSuccessDetails.displayName}\nUsername: ${subscriptionSuccessDetails.username}${subscriptionSuccessDetails.password ? `\nPassword: ${subscriptionSuccessDetails.password}` : ''}\nPlan: ${subscriptionSuccessDetails.planName}\nExpiry: ${subscriptionSuccessDetails.expiry}`;
                  navigator.clipboard.writeText(copyTxt);
                  alert('Credentials and subscription details copied securely to clipboard!');
                }}
                className="absolute top-3 right-3 text-[10px] text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3 py-1.5 rounded-xl transition-all shadow cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copy Details</span>
              </button>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Advisor Name</span>
                  <strong className="text-slate-200 block truncate">{subscriptionSuccessDetails.displayName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Plan Expiry Date</span>
                  <strong className="text-amber-500 block">{subscriptionSuccessDetails.expiry}</strong>
                </div>
                <div className="sm:col-span-2 h-px bg-slate-850 my-1" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Platform Username</span>
                  <strong className="text-slate-100 select-all block break-all font-bold text-emerald-400">{subscriptionSuccessDetails.username}</strong>
                </div>
                {subscriptionSuccessDetails.password && (
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Portal Secure Password</span>
                    <strong className="text-slate-100 select-all block break-all font-bold text-sky-400">{subscriptionSuccessDetails.password}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 p-3 rounded-xl border border-emerald-500/10 text-[10px] text-emerald-400 text-center leading-relaxed">
              💡 Always keep your username and password safe. You can use these credentials to log into your Expert Panel dashboard anytime, from any device.
            </div>

            <button
              type="button"
              onClick={() => setSubscriptionSuccessDetails(null)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-widest w-full transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 hover:scale-[1.02] cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Go to Consultant Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Real-time Toast notification */}
      {latestToast && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[100] bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl flex items-start space-x-3 text-left backdrop-blur-md">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans text-emerald-400 font-bold uppercase tracking-wider">New Notification</span>
              <button onClick={() => setLatestToast(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h4 className="text-xs font-bold text-slate-100">{latestToast.title}</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">{latestToast.message}</p>
          </div>
        </div>
      )}

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
              <p className="text-[10px] text-slate-500 font-sans uppercase tracking-widest">Profile Picture Preview</p>
            </div>
          </div>
        </div>
      )}

      {/* KYC Document Lightbox Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
          id="kyc-preview-lightbox"
        >
          <div 
            className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top close button */}
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 bg-slate-950/80 hover:bg-slate-950 text-slate-300 hover:text-white p-2 rounded-full border border-slate-800 transition-all z-20 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Image */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-850 p-2 min-h-[300px] max-h-[70vh]">
              <img
                src={previewImageUrl}
                alt="KYC Document Preview"
                className="max-w-full max-h-[65vh] object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400 font-medium">KYC Document Preview</p>
              <p className="text-[10px] text-slate-500 font-mono mt-1 truncate">{previewImageUrl}</p>
            </div>
          </div>
        </div>
      )}

      <ImageEditorModal
        isOpen={isImageEditorOpen}
        onClose={() => setIsImageEditorOpen(false)}
        currentImage={editorImageBase64 || photoUrl}
        initialGender={consultantGender}
        onSave={saveCroppedPhoto}
      />

      <ProfileChangesSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        changes={profileChangesList}
        onGoToHome={() => {
          setIsSuccessModalOpen(false);
          setActiveTab('dashboard');
        }}
      />

    </div>
  );
}
