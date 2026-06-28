import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Key, LogIn, LogOut, Wallet, ShieldCheck, UserCheck, RefreshCw, Copy, Check, FileText, Star, Settings2, Globe, Flame, ShieldAlert, ArrowRight, Shield, Award, Users, CheckCircle, Zap, Coins, TrendingUp, Menu, X, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Consultant, Plan, Session } from '../../types';
import { IncomingRequestNotification } from '../IncomingRequestNotification';

interface ConsultantPanelProps {
  onSelectSession: (sessionId: string, username: string, role: 'user' | 'consultant') => void;
  onNavigateToUserView: (username: string) => void;
  activeSessionId?: string;
}

export function ConsultantPanel({ onSelectSession, onNavigateToUserView, activeSessionId }: ConsultantPanelProps) {
  // Authentication & Session States
  const [currentConsultant, setCurrentConsultant] = useState<Consultant | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // Registration States
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPrice, setRegisterPrice] = useState('20');
  const [registerCategory, setRegisterCategory] = useState<'Astrologers' | 'Influencers' | 'Coaches' | 'Consultants' | 'Lawyers' | 'Mentors'>('Consultants');
  const [credentialsGenerated, setCredentialsGenerated] = useState<{username: string, password: string, displayName: string} | null>(null);

  // Stats & Sessions list
  const [wallet, setWallet] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [manualAdjustments, setManualAdjustments] = useState<any[]>([]);

  // Profile Form States
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');
  const [pricePerMin, setPricePerMin] = useState('20');
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

  // Bank Form States
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankStatus, setBankStatus] = useState('unsubmitted'); // unsubmitted, pending, approved, rejected
  const [bankRejectReason, setBankRejectReason] = useState('');

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
    const dailyLogin = Number((6.5 + ((consId * 7) % 3.5)).toFixed(1));
    const weeklyLogin = Number((7.2 + ((consId * 4) % 3.1)).toFixed(1));
    const monthlyLogin = Number((7.8 + ((consId * 9) % 2.5)).toFixed(1));

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

    const dailyRepeat = actualRepeatPct > 0 ? actualRepeatPct : Math.min(100, (32 + (consId % 20)));
    const weeklyRepeat = actualRepeatPct > 0 ? Math.min(100, Math.round(actualRepeatPct * 1.1)) : Math.min(100, (35 + (consId % 18)));
    const monthlyRepeat = actualRepeatPct > 0 ? Math.min(100, Math.round(actualRepeatPct * 1.25)) : Math.min(100, (39 + (consId % 15)));

    return {
      login: { daily: dailyLogin, weekly: weeklyLogin, monthly: monthlyLogin },
      chat: { daily: dailyChat, weekly: weeklyChat, monthly: monthlyChat },
      repeat: { daily: dailyRepeat, weekly: weeklyRepeat, monthly: monthlyRepeat }
    };
  };

  // Tab Navigation & Mobile Drawer States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'status' | 'profile' | 'sessions' | 'kyc' | 'bank' | 'support'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Status Toggles
  const [isOnline, setIsOnline] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Common UI feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Specific local feedback for KYC & Bank forms (displayed directly under buttons)
  const [kycFeedbackError, setKycFeedbackError] = useState<string | null>(null);
  const [kycFeedbackSuccess, setKycFeedbackSuccess] = useState<string | null>(null);
  const [bankFeedbackError, setBankFeedbackError] = useState<string | null>(null);
  const [bankFeedbackSuccess, setBankFeedbackSuccess] = useState<string | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Interactive Landing Page Funnel States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [simulatedMinutes, setSimulatedMinutes] = useState(45);
  const [simulatedRate, setSimulatedRate] = useState(30);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size bahot badi hai. Kripya 5MB se choti image upload karein.');
      return;
    }

    // Check file format - strictly PNG, JPG, JPEG
    const allowedExtensions = ['png', 'jpg', 'jpeg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    
    if (!allowedExtensions.includes(fileExtension || '') || !allowedMimeTypes.includes(file.type)) {
      setError('Sirf PNG aur JPG/JPEG format ki photo upload ki jaa sakti hai (Only PNG & JPG allowed).');
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
          
          setPhotoUrl(data.photo_url);
          
          // Sync with local consultant state and local storage immediately
          if (currentConsultant) {
            const updated = { ...currentConsultant, photo_url: data.photo_url };
            setCurrentConsultant(updated);
            localStorage.setItem('consultant_session', JSON.stringify(updated));

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
          
          setSuccess('Profile photo successfully upload ho gayi hai!');
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

  // Past session lookup states
  const [viewingPastSessionMessages, setViewingPastSessionMessages] = useState<any[] | null>(null);
  const [viewingPastSessionInfo, setViewingPastSessionInfo] = useState<any | null>(null);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

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
    } catch (err) {
      console.error('Failed to fetch consultant support tickets:', err);
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
      loadConsultantStatsAndStatus(currentConsultant.id);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentConsultant]);

  // Trigger immediate refresh when a session finishes (activeSessionId transitions to falsy)
  useEffect(() => {
    if (currentConsultant && !activeSessionId) {
      loadConsultantStatsAndStatus(currentConsultant.id);
    }
  }, [activeSessionId, currentConsultant]);

  // Logout handler
  function handleLogout() {
    localStorage.removeItem('consultant_session');
    setCurrentConsultant(null);
    setWallet(null);
    setSessions([]);
    setCredentialsGenerated(null);
    setUsernameInput('');
    setPasswordInput('');
    hasInitializedProfileRef.current = false;
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
        setSalaryInfo(data.salaryInfo);
        setManualAdjustments(data.manualAdjustments || []);
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

      // Fetch complete profile info (including KYC and Bank statuses)
      const profileRes = await fetch(`/api/consultants/${id}/profile`);
      if (profileRes.ok) {
        const matching = await profileRes.json() as Consultant;
        if (matching) {
          setIsOnline(matching.is_online === 1);
          setIsBusy(matching.is_busy === 1);
          
          // Always sync verification statuses
          setKycStatus(matching.kyc_status || 'unsubmitted');
          setKycRejectReason(matching.kyc_reject_reason || '');
          setBankStatus(matching.bank_status || 'unsubmitted');
          setBankRejectReason(matching.bank_reject_reason || '');

          // Sync input states with server-side values on first load only so typing isn't interrupted
          if (!hasInitializedProfileRef.current) {
            setPhotoUrl(matching.photo_url || '');
            setBio(matching.bio || '');
            setPricePerMin(matching.price_per_minute.toString());
            
            setAadhaarNumber(matching.aadhaar_number || '');
            setAadhaarPhotoUrl(matching.aadhaar_photo_url || '');
            setPanNumber(matching.pan_number || '');
            setPanPhotoUrl(matching.pan_photo_url || '');
            
            setBankAccountHolderName(matching.bank_account_holder_name || '');
            setBankAccountNumber(matching.bank_account_number || '');
            setBankIfscCode(matching.bank_ifsc_code || '');
            setBankName(matching.bank_name || '');

            hasInitializedProfileRef.current = true;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching consultant dataset:', err);
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
    if (!registerPhone) {
      setError('Please provide your Phone Number');
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
          phone: registerPhone,
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
      setRegisterPhone('');
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
      const activePlan = plans.find(p => p.id === wallet?.plan_id);
      const maxRate = activePlan?.max_consultant_rate ?? 1000.0;
      const priceVal = parseFloat(pricePerMin);
      
      if (!isNaN(priceVal) && priceVal > maxRate) {
        throw new Error(`you can set max price (₹${maxRate}/min) in this Plan.`);
      }

      const res = await fetch(`/api/consultants/${currentConsultant.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: photoUrl,
          bio: bio,
          price_per_minute: priceVal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile changes');
      
      setSuccess('Profile updated successfully!');
      
      // Sync local state inputs immediately with updated values from server
      if (data.photo_url !== undefined) setPhotoUrl(data.photo_url || '');
      if (data.bio !== undefined) setBio(data.bio || '');
      if (data.price_per_minute !== undefined) setPricePerMin(data.price_per_minute.toString());

      // Persist to currentConsultant state and local storage so UI doesn't revert
      const updatedConsultant = { ...currentConsultant, ...data };
      setCurrentConsultant(updatedConsultant);
      localStorage.setItem('consultant_session', JSON.stringify(updatedConsultant));

      // Force loadConsultantStatsAndStatus to re-fetch and update
      await loadConsultantStatsAndStatus(currentConsultant.id);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
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
      
      const res = await fetch(`/api/consultants/${currentConsultant.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaar_number: aadhaarNumber,
          aadhaar_photo_url: aadhaarPhotoUrl,
          pan_number: panNumber,
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
      
      const res = await fetch(`/api/consultants/${currentConsultant.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_account_holder_name: bankAccountHolderName,
          bank_account_number: bankAccountNumber,
          bank_ifsc_code: bankIfscCode,
          bank_name: bankName,
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
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">Consultant Suite</span>
                <h1 className="text-sm font-black font-sans text-slate-100 uppercase tracking-tight">Expert Partner Network</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-[11px] text-slate-400 hidden md:inline font-mono">Already a registered expert?</span>
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
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
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
                    <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400">EXPERT CONSOLE</span>
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
                    <span className="text-[9px] text-slate-500 font-mono uppercase">Live Wallet Balance</span>
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <strong className="text-2xl font-black font-mono text-emerald-400 tracking-tight">₹32,450.00</strong>
                    <span className="text-[9px] text-slate-500 font-mono">Synced</span>
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
                      <span className="text-[8px] text-slate-500 font-mono">1:45 remaining</span>
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
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">💡 Profit Simulator</span>
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
                  <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest block">Projected Monthly Profit</span>
                  <strong className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono tracking-tight block mt-1">
                    ₹{(simulatedRate * simulatedMinutes * 30).toLocaleString()}
                  </strong>
                  <span className="text-[10px] text-slate-500 block mt-1">Based on 30 active billing days</span>
                </div>

                <div className="h-px bg-slate-900" />

                <div className="grid grid-cols-2 gap-2 text-left text-[10px] font-mono">
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
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">📦 Key Benefits</span>
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
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">📊 STEP 1: CHOOSE A PARTNER PLAN</span>
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
                <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">STEP 2: REGISTER PROFILE</span>
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
                        <span className="text-[9px] text-slate-500 font-mono uppercase block">Active Choice:</span>
                        <strong className="text-sm font-bold text-slate-200">
                          {selectedPlan?.name || 'Loading Subscription Plan...'}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 font-mono block">Base Price:</span>
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
                  <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
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
                  <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
                    Consultant Email Address (for Credentials)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. raj.astrologer@gmail.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all"
                    required
                  />
                  <span className="text-[9px] text-slate-500 block">We will use this email to associate your security record.</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
                    Consultant Phone Number (Mandatory)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 w-full transition-all"
                    required
                  />
                  <span className="text-[9px] text-slate-500 block">Required for authentication and communication.</span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                    <span>My Custom Audio/Chat Rate (₹ / Minute)</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full font-bold">Capped by Plan</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="25"
                    value={registerPrice}
                    readOnly
                    className="bg-slate-950/60 border border-slate-850 rounded-xl px-4 py-2.5 text-slate-400 text-sm w-full transition-all font-mono font-bold cursor-not-allowed"
                    required
                  />
                  <div className="flex items-center space-x-1 text-amber-400 font-semibold text-[10px] mt-1">
                    <span>⚠️ Note: you can edit price after the plan.</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
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
                    <option value="Coaches">Coaches</option>
                    <option value="Consultants">Consultants</option>
                    <option value="Lawyers">Lawyers</option>
                    <option value="Mentors">Mentors</option>
                  </select>
                  <span className="text-[9px] text-slate-500 block">Correct categorisation helps clients search you faster.</span>
                </div>
              </div>

              {/* Secure transaction disclaimer */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs text-slate-400 flex items-start space-x-3">
                <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">
                  By clicking register, you simulate a successful Razorpay gateway checkout. This instantly deploys your public bio page at <strong className="text-slate-200">/u/[username]</strong> and prepares secure login credentials.
                </span>
              </div>

              {/* Submit CTA button */}
              <button
                type="submit"
                id="consultant-register-btn"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded-xl font-bold text-xs uppercase tracking-widest w-full transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Simulate Plan Checkout & Register</span>
              </button>
            </form>

            {/* Generated Credentials Area (shown right below the form) */}
            {credentialsGenerated && (
              <div className="bg-emerald-950/80 border border-emerald-800 p-6 rounded-2xl space-y-4 animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                  <UserCheck className="w-5 h-5 animate-bounce" />
                  <span className="uppercase tracking-widest font-mono">🌟 PORTAL ACCOUNT ACTIVE & REGISTERED!</span>
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
              <div className="relative w-full max-w-md bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 overflow-hidden animate-in zoom-in-95 duration-200 z-10 text-left">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="text-slate-500 hover:text-slate-300 font-mono text-xs p-1 bg-slate-950 border border-slate-850 rounded-lg hover:border-slate-750"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="flex items-center space-x-3 pb-3 border-b border-slate-850">
                  <div className="bg-emerald-500/10 p-2 rounded-xl">
                    <Key className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-100">Consultant Secure Login</h2>
                    <p className="text-[10px] text-slate-500 font-mono">Sign in to manage chats & withdraw live earnings</p>
                  </div>
                </div>

                <form 
                  onSubmit={async (e) => {
                    await handleLogin(e);
                    // Close modal on successful login
                    setShowLoginModal(false);
                  }} 
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-wide">
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
                    <label className="block text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-wide">
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
            className="text-xs text-rose-400 hover:underline hover:text-rose-300 font-bold font-mono mt-4"
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

          {/* MOBILE NAVIGATION BAR (Sticky/Compact) */}
          <div className="md:hidden flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
            <div className="flex items-center space-x-2.5">
              <img
                src={photoUrl || currentConsultant.photo_url}
                alt={currentConsultant.display_name}
                className="w-9 h-9 rounded-xl object-cover border border-emerald-500"
              />
              <div>
                <h3 className="text-xs font-bold leading-tight truncate max-w-[110px]">{currentConsultant.display_name}</h3>
                <span className="text-[9px] text-slate-400 block font-mono">ID: #{currentConsultant.id}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleCopyProfileUrl}
                className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center relative group"
                title="Copy Profile URL"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="sr-only">Copy link</span>
              </button>
              <button
                onClick={() => onNavigateToUserView(currentConsultant.username)}
                className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center"
                title="Open Booking Page"
              >
                <Globe className="w-4 h-4" />
                <span className="sr-only">Go to profile</span>
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* MOBILE NAVIGATION DROPDOWN DRAWER */}
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-xl"
            >
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>🏠 Dashboard & Earnings</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('status'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'status' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Flame className="w-4 h-4" />
                <span>🔥 Availability & Active Plan</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Settings2 className="w-4 h-4" />
                <span>⚙️ Edit Profile & Call Rates</span>
              </button>

              <button
                onClick={() => { setActiveTab('kyc'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'kyc' ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <UserCheck className="w-4 h-4" />
                <span>🔒 KYC Verification {kycStatus === 'approved' ? '✅' : kycStatus === 'pending' ? '⏳' : '❌'}</span>
              </button>

              <button
                onClick={() => { setActiveTab('bank'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'bank' ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Wallet className="w-4 h-4" />
                <span>🏦 Bank Details {bankStatus === 'approved' ? '✅' : bankStatus === 'pending' ? '⏳' : '❌'}</span>
              </button>
              
              <button
                onClick={() => { setActiveTab('sessions'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'sessions' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <FileText className="w-4 h-4" />
                <span>💬 Consultations & Blocklist</span>
              </button>

              <button
                onClick={() => { setActiveTab('support'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'support' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>🙋 Help & Customer Support</span>
              </button>

              {/* Shareable Link directly inside drawer */}
              <div className="border-t border-slate-800/80 pt-3 mt-3 space-y-1.5">
                <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold px-1">My Shareable Link</span>
                <div className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-xl p-1.5 pl-3">
                  <span className="text-xs font-mono text-emerald-400 truncate max-w-[180px]">{`/u/${currentConsultant.username}`}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleCopyProfileUrl}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center"
                      title="Copy Profile URL"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigateToUserView(currentConsultant.username);
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center"
                      title="Open Booking Page"
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-slate-800/80 pt-2 mt-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-rose-400 hover:bg-rose-500/10 transition-all border border-rose-500/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Portal</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* MOBILE SHAREABLE PROFILE LINK CARD (Visible on mobile only) */}
          <div className="md:hidden bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">My Shareable Profile Link</span>
              <span className="text-[9px] text-emerald-400 font-mono">Active</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-1.5 pl-3">
              <span className="text-xs font-mono text-emerald-400 truncate max-w-[200px]">{`/u/${currentConsultant.username}`}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleCopyProfileUrl}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center"
                  title="Copy Profile URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onNavigateToUserView(currentConsultant.username)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center"
                  title="Open Booking Page"
                >
                  <Globe className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN SIDEBAR LAYOUT (For Desktop md+) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* DESKTOP SIDEBAR COLUMN */}
            <div className="hidden md:block md:col-span-3 space-y-6">
              
              {/* Consultant Short Identity Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-4 shadow-lg">
                <div className="relative inline-block">
                  <img
                    src={photoUrl || currentConsultant.photo_url}
                    alt={currentConsultant.display_name}
                    className="w-20 h-20 mx-auto rounded-2xl object-cover border-2 border-emerald-500 shadow-md transition-transform hover:scale-105 duration-300"
                  />
                  <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] shadow ${isOnline ? (isBusy ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-600'}`} title={isOnline ? (isBusy ? 'Busy' : 'Online') : 'Offline'}>
                    ⚡
                  </span>
                </div>
                
                <div>
                  <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight">{currentConsultant.display_name}</h3>
                  <span className="text-[10px] font-mono text-emerald-400 block mt-0.5">● Certified Partner</span>
                  <span className="text-[9px] font-mono text-slate-500 block mt-1">ID: #{currentConsultant.id}</span>
                </div>

                {/* Unique Profile Booking URL */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-left space-y-1.5">
                  <span className="block text-[8px] font-mono uppercase tracking-wider text-slate-500">My Shareable Link</span>
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
                </div>
              </div>

              {/* Profile Completion Circular Graph */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-3 shadow-lg">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Profile Progress</span>
                
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="transparent"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-400 transition-all duration-500 ease-out"
                      strokeDasharray={`${getProfileCompletionPercentage()}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-sm font-black font-mono text-slate-100">{getProfileCompletionPercentage()}%</span>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-normal">
                  {getProfileCompletionPercentage() === 100 
                    ? '🎉 Your profile is 100% updated!' 
                    : `Your profile is ${getProfileCompletionPercentage()}% complete. Complete all fields to build client trust.`}
                </p>
              </div>

              {/* Sidebar Navigation Links */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
                <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 px-2 mb-3">Navigation Menu</span>
                
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>🏠 Dashboard Home</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('status')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'status' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <Flame className="w-4 h-4 shrink-0" />
                  <span>🔥 Availability & Plan</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <Settings2 className="w-4 h-4 shrink-0" />
                  <span>⚙️ Profile Settings</span>
                </button>

                <button
                  onClick={() => setActiveTab('kyc')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'kyc' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>🔒 KYC Verification</span>
                  <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded font-bold ${kycStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : kycStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                    {kycStatus === 'approved' ? 'Approved' : kycStatus === 'pending' ? 'Review' : 'Update'}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('bank')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'bank' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span>🏦 Bank Details</span>
                  <span className={`text-[9px] ml-auto px-1.5 py-0.5 rounded font-bold ${bankStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : bankStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                    {bankStatus === 'approved' ? 'Verified' : bankStatus === 'pending' ? 'Review' : 'Update'}
                  </span>
                </button>
                
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'sessions' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>💬 Consultation History</span>
                </button>

                <button
                  onClick={() => setActiveTab('support')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'support' ? 'bg-emerald-500 text-slate-950 shadow-md font-black translate-x-1' : 'text-slate-300 hover:bg-slate-850 hover:text-white'}`}
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>🙋 Help & Customer Support</span>
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
            <div className="col-span-1 md:col-span-9 space-y-6">
              
              {/* TAB 1: DASHBOARD HOME (Highly Animated Professional Homepage) */}
              {activeTab === 'dashboard' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {/* Dynamic Greeting Card */}
                  <div className="relative bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-slate-900/95 border border-slate-800 rounded-3xl p-6 overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
                      <div className="text-center sm:text-left space-y-1.5">
                        <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span>Professional Dashboard</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black font-sans text-white tracking-tight">
                          Namaste, <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">{currentConsultant.display_name}!</span>
                        </h2>
                        <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                          Welcome to your financial command center. Here you can track real-time consultant earnings, view salary cycle cutoff forecasts, and manage pay-per-minute consultations.
                        </p>
                      </div>
                      
                      <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-center space-y-2 sm:min-w-[175px] shrink-0 backdrop-blur">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Operational Mode</span>
                          <div className="flex items-center justify-center space-x-1.5 pt-0.5">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? (isBusy ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping') : 'bg-slate-600'}`} />
                            <span className="text-xs font-black uppercase text-slate-200">
                              {isOnline ? (isBusy ? 'Busy Mode' : 'Online / Active') : 'Offline Mode'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-800/60 pt-2 mt-1 flex flex-col items-center space-y-1.5">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">Quick Status Toggle</span>
                          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl w-full justify-between">
                            <span className="text-[10px] font-bold text-slate-300">{isOnline ? 'Go Offline' : 'Go Online'}</span>
                            <button
                              type="button"
                              onClick={handleToggleOnline}
                              className={`relative inline-flex h-4.5 w-8.5 items-center rounded-full transition-colors ${isOnline ? 'bg-emerald-500' : 'bg-slate-800'}`}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isOnline ? 'translate-x-4.5' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </div>
                        
                        <span className="text-[9px] text-slate-500 block">₹{pricePerMin}/min rate configured</span>
                      </div>
                    </div>
                  </div>

                  {/* Withdrawable Balance Hero - Main Earnings Showcase */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    
                    <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-500/20 rounded-2xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/35 transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                          <div className="flex items-center space-x-2">
                            <Wallet className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Withdrawable</h3>
                          </div>
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-widest shrink-0">
                            Sync
                          </span>
                        </div>
                        
                        <div className="py-1">
                          <span className="text-[10px] text-slate-500 block">Withdrawable earnings currently cleared</span>
                          <div className="flex items-baseline space-x-1.5 mt-1">
                            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-sans tracking-tight">₹{wallet.wallet_withdrawable.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">INR</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-850/80 flex flex-col items-start gap-1.5 text-[10px] text-slate-400 mt-4 backdrop-blur">
                        <span className="flex items-center space-x-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Pre-paid secure backing</span>
                        </span>
                      </div>
                    </div>

                    {/* Simple Statistics Grid */}
                    <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                      
                      <motion.div 
                        whileHover={{ y: -3 }}
                        className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow hover:border-slate-700 transition-all min-w-0"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold truncate">Today's Earnings</span>
                          <span className="text-base sm:text-lg xl:text-xl font-black text-slate-200 mt-1 block font-sans whitespace-nowrap">₹{wallet.wallet_today.toFixed(2)}</span>
                        </div>
                        <span className="text-[9px] text-emerald-400/80 font-mono block mt-2.5 shrink-0">● Active</span>
                      </motion.div>

                      <motion.div 
                        whileHover={{ y: -3 }}
                        className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow hover:border-slate-700 transition-all min-w-0"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold truncate">Monthly Earnings</span>
                          <span className="text-base sm:text-lg xl:text-xl font-black text-slate-200 mt-1 block font-sans whitespace-nowrap">₹{wallet.wallet_monthly.toFixed(2)}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono block mt-2.5 shrink-0 truncate">Calendar cycle</span>
                      </motion.div>

                      <motion.div 
                        whileHover={{ y: -3 }}
                        className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow hover:border-slate-700 transition-all min-w-0"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold truncate">Lifetime Total</span>
                          <span className="text-base sm:text-lg xl:text-xl font-black text-slate-200 mt-1 block font-sans whitespace-nowrap">₹{wallet.wallet_total.toFixed(2)}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono block mt-2.5 shrink-0 truncate">Cumulative</span>
                      </motion.div>

                      <motion.div 
                        whileHover={{ y: -3 }}
                        className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow hover:border-slate-700 transition-all min-w-0"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold truncate">Consultations</span>
                          <span className="text-base sm:text-lg xl:text-xl font-black text-emerald-400 mt-1 block font-sans whitespace-nowrap">{sessions.filter((s: any) => s.status === 'completed').length}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono block mt-2.5 shrink-0 truncate">Completed</span>
                      </motion.div>

                      <motion.div 
                        whileHover={{ y: -3 }}
                        className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col justify-between shadow hover:border-slate-700 transition-all min-w-0"
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block font-bold truncate">Total Refunded</span>
                          <span className="text-base sm:text-lg xl:text-xl font-black text-rose-400 mt-1 block font-sans whitespace-nowrap">₹{sessions.reduce((acc: any, s: any) => acc + (s.refunded_amount || 0), 0).toFixed(2)}</span>
                        </div>
                        <span className="text-[9px] text-rose-400/80 font-mono block mt-2.5 shrink-0 truncate">Refunded</span>
                      </motion.div>

                    </div>

                  </div>

                  {/* Highly Animated Earning Growth Pulse Widget */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-emerald-500/10 p-2.5 rounded-xl">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base">Earning Performance Velocity</h3>
                          <p className="text-xs text-slate-400">Peak call/consultation frequency and earnings potential indicators</p>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850">
                        Active Rate Cap: ₹{plans.find(p => p.id === wallet.plan_id)?.max_consultant_rate ?? 25}/min
                      </div>
                    </div>

                    {/* Staggered grow-up simulation bars representing consulting peak periods */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
                      <div className="md:col-span-8">
                        <div className="h-44 flex items-end justify-between gap-2.5 bg-slate-950/60 p-5 rounded-2xl border border-slate-850/80 relative">
                          {/* Y axis lines */}
                          <div className="absolute inset-x-0 top-1/4 border-t border-slate-900/40 pointer-events-none" />
                          <div className="absolute inset-x-0 top-2/4 border-t border-slate-900/40 pointer-events-none" />
                          <div className="absolute inset-x-0 top-3/4 border-t border-slate-900/40 pointer-events-none" />
                          
                          {/* Animated Bars */}
                          {[
                            { label: 'Mon', value: '45%', earnings: '₹540', color: 'bg-emerald-500/20' },
                            { label: 'Tue', value: '60%', earnings: '₹720', color: 'bg-emerald-500/40' },
                            { label: 'Wed', value: '85%', earnings: '₹1,020', color: 'bg-emerald-500/60' },
                            { label: 'Thu', value: '40%', earnings: '₹480', color: 'bg-emerald-500/30' },
                            { label: 'Fri', value: '95%', earnings: '₹1,450', color: 'bg-emerald-500' },
                            { label: 'Sat', value: '70%', earnings: '₹980', color: 'bg-emerald-500/50' },
                            { label: 'Sun', value: '90%', earnings: '₹1,280', color: 'bg-emerald-500/80' },
                          ].map((bar, i) => (
                            <div key={bar.label} className="flex-1 flex flex-col items-center group relative z-10">
                              <span className="text-[9px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-emerald-400 font-bold z-20">
                                {bar.earnings}
                              </span>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: bar.value }}
                                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                                className={`w-full max-w-[20px] rounded-t-md ${bar.color} hover:bg-emerald-400 transition-all cursor-pointer`}
                              />
                              <span className="text-[10px] font-mono text-slate-400 mt-2">{bar.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-4 space-y-4 text-left">
                        {(() => {
                          const metrics = getPerformanceMetrics(currentConsultant.id, sessions);
                          return (
                            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-4 shadow-lg">
                              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                  📊 Performance Parameters
                                </h4>
                                <span className="text-[9px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded uppercase font-mono">
                                  Real-time
                                </span>
                              </div>

                              <div className="space-y-3.5">
                                {/* 1. Average Login Hours (Target: 8+ hours) */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-medium">Avg Login Hours (Target: 8h+)</span>
                                    <span className="text-[10px] font-mono text-slate-500">Min 8 hrs</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Daily</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.login.daily >= 8 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.login.daily} hrs
                                      </strong>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Weekly</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.login.weekly >= 8 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.login.weekly} hrs
                                      </strong>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Monthly</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.login.monthly >= 8 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.login.monthly} hrs
                                      </strong>
                                    </div>
                                  </div>
                                </div>

                                {/* 2. Avg Chat Minutes (Target: 30min) */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-medium">Avg Chat Minutes (Target: 30m+)</span>
                                    <span className="text-[10px] font-mono text-slate-500">Min 30 mins</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Daily</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.chat.daily >= 30 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.chat.daily} mins
                                      </strong>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Weekly</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.chat.weekly >= 30 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.chat.weekly} mins
                                      </strong>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Monthly</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.chat.monthly >= 30 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.chat.monthly} mins
                                      </strong>
                                    </div>
                                  </div>
                                </div>

                                {/* 3. Repeat User % (Target: 40%+) */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-medium">Repeat User Rate (Target: 40%+)</span>
                                    <span className="text-[10px] font-mono text-slate-500">Min 40%</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Daily</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.repeat.daily >= 40 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.repeat.daily}%
                                      </strong>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Weekly</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.repeat.weekly >= 40 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.repeat.weekly}%
                                      </strong>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-850 text-center">
                                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Monthly</span>
                                      <strong className={`text-xs font-mono block mt-0.5 ${metrics.repeat.monthly >= 40 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {metrics.repeat.monthly}%
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <p className="text-[9px] text-slate-500 italic leading-relaxed pt-1 border-t border-slate-900">
                                *Metrics are evaluated based on target indicators: 8h+ login, 30m avg session, 40% repeat users.
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Payout cycle preview inside dashboard */}
                  {salaryInfo && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          💼 Monthly Salary Cutoff Sync
                        </span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded uppercase font-mono font-bold">
                          Next Cutoff: {salaryInfo.cutoffDay}th
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Estimated Salary Payout</span>
                          <strong className="text-emerald-400 text-lg font-mono block mt-1">₹{salaryInfo.prevCycleEarnings.toFixed(2)}</strong>
                          <span className="text-[9px] text-slate-500 block mt-1">Earned up to {salaryInfo.cutoffDay}th</span>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Credit Target Date</span>
                          <strong className="text-amber-400 text-lg font-mono block mt-1">By {salaryInfo.payoutDay}th of {salaryInfo.payoutMonthName}</strong>
                          <span className="text-[9px] text-slate-500 block mt-1">Direct bank clearance</span>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Accumulating Unbilled</span>
                          <strong className="text-slate-200 text-lg font-mono block mt-1">₹{salaryInfo.currentCycleEarnings.toFixed(2)}</strong>
                          <span className="text-[9px] text-slate-500 block mt-1">For next month's payoff</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Activity Quick View */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">Recent Chats Quick List</h3>
                      <button
                        onClick={() => setActiveTab('sessions')}
                        className="text-xs text-emerald-400 hover:underline hover:text-emerald-300 font-bold"
                      >
                        See All ({sessions.length})
                      </button>
                    </div>

                    <div className="space-y-3">
                      {sessions.slice(0, 3).length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No consultations registered yet.</p>
                      ) : (
                        sessions.slice(0, 3).map((sess) => (
                          <div key={sess.id} className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-200">{sess.user_name}</span>
                                <span className="text-[9px] font-mono text-slate-500">ID: #{sess.id}</span>
                              </div>
                              <p className="text-slate-400 font-mono text-[11px]">
                                {sess.duration_minutes} Mins @ ₹{sess.price_per_minute}/min
                              </p>
                              {sess.rating && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <div className="flex items-center text-amber-400">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-2.5 h-2.5 ${i < sess.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                                      />
                                    ))}
                                  </div>
                                  {sess.review_text && (
                                    <span className="text-[10px] text-slate-400 italic font-sans truncate max-w-[150px]" title={sess.review_text}>
                                      "{sess.review_text}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-emerald-400 font-mono font-bold">₹{sess.consultant_earnings.toFixed(2)}</span>
                              <span className="text-[9px] text-slate-500 block">Net Earning</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Special Admin Wallet Additions */}
                  {manualAdjustments && manualAdjustments.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-left">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center space-x-2">
                          <Coins className="w-5 h-5 text-amber-400" />
                          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">🎁 Special Admin Credits</h3>
                        </div>
                        <span className="text-xs text-amber-400 font-mono font-bold">
                          Total: ₹{manualAdjustments.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                        {manualAdjustments.map((adj) => (
                          <div key={adj.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-800 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold font-mono">
                                  CREDITED BY SUPER ADMIN
                                </span>
                                <span className="text-[9px] font-mono text-slate-500">{new Date(adj.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-200 font-semibold text-xs mt-1.5">{adj.reason}</p>
                            </div>
                            <div className="text-right sm:self-center shrink-0">
                              <span className="text-emerald-400 font-mono text-base font-black">+₹{adj.amount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
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
                    
                    {/* Status Toggle Card */}
                    <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
                      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                        <Flame className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-slate-100">Consultant Presence Settings</h3>
                      </div>

                      <div className="space-y-4">
                        {/* Online visible toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-850">
                          <div>
                            <span className="text-xs font-bold block text-slate-200">Online / Visible on Portal</span>
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
                        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-850">
                          <div>
                            <span className="text-xs font-bold block text-slate-200">Busy / Engaged Status</span>
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

                      <div className="text-xs font-mono p-3 bg-slate-950 border border-slate-850 rounded-xl text-center">
                        Presence state: <strong className={isOnline ? (isBusy ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500'}>
                          {isOnline ? (isBusy ? '🟠 ENGAGED / BUSY' : '🟢 ONLINE & AVAILABLE') : '🔴 OFFLINE'}
                        </strong>
                      </div>
                    </div>

                    {/* Active Subscription details */}
                    <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
                      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                        <Award className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-slate-100">My Registered Plan Benefits</h3>
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
                              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">Active Plan</span>
                                <span className="text-base font-extrabold text-emerald-400 block mt-0.5">{activePlan.name}</span>
                              </div>

                              <div className="space-y-2.5 text-xs">
                                <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                                  <span className="text-slate-400 font-mono text-[10px] uppercase">Max Call Rate</span>
                                  <strong className="text-slate-200">₹{activePlan.max_consultant_rate}/min</strong>
                                </div>
                                {activePlan.support_hours && (
                                  <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                                    <span className="text-slate-400 font-mono text-[10px] uppercase">Official Support Hours</span>
                                    <strong className="text-slate-200">{activePlan.support_hours} Hours</strong>
                                  </div>
                                )}
                                {activePlan.commission_rate !== undefined && (
                                  <div className="flex items-center justify-between border-b border-slate-850/60 pb-2">
                                    <span className="text-slate-400 font-mono text-[10px] uppercase">Commission Charged</span>
                                    <strong className="text-slate-200">{activePlan.commission_rate}%</strong>
                                  </div>
                                )}
                              </div>

                              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-1">
                                <span className="text-[9px] text-slate-500 font-mono block uppercase">Countdown</span>
                                <div className="text-xs font-bold text-slate-200">
                                  Renew subscription in <span className="text-emerald-400 font-extrabold">{daysLeft}</span> Days
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

                  </div>

                  {/* Fully structured salary cycle */}
                  {salaryInfo && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
                      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                        <Coins className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-slate-100">Monthly Salary & Bank Transfer Payout</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mb-1">Cleared Earnings Expected</span>
                          <strong className="text-emerald-400 text-base font-mono block">₹{salaryInfo.prevCycleEarnings.toFixed(2)}</strong>
                          <span className="text-[9px] text-slate-500 block mt-1">Accrued up to cutoff day ({salaryInfo.cutoffDay}th)</span>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mb-1">Target Credit Timeline</span>
                          <strong className="text-amber-400 text-base font-mono block">By {salaryInfo.payoutDay}th of {salaryInfo.payoutMonthName}</strong>
                          <span className="text-[9px] text-slate-500 block mt-1">Disbursed to verified bank account</span>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mb-1">Ongoing Unbilled Cycle</span>
                          <strong className="text-slate-200 text-base font-mono block">₹{salaryInfo.currentCycleEarnings.toFixed(2)}</strong>
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
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                    <Settings2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-slate-100 font-sans">Modify Professional Profile & Rates</h3>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-xs font-mono text-slate-400">Display Profile Photo (Upload ya direct image URL select karein)</label>
                      <div className="flex flex-col sm:flex-row items-stretch gap-3">
                        <input
                          type="text"
                          placeholder="https://... direct photo link input"
                          value={photoUrl}
                          onChange={(e) => setPhotoUrl(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 font-mono"
                        />
                        
                        <div className="flex items-center gap-2 shrink-0">
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
                        </div>
                      </div>

                      {photoUrl && (
                        <div className="mt-3 flex items-center space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-850 max-w-md">
                          <img 
                            src={photoUrl} 
                            alt="Live Preview" 
                            className="w-10 h-10 rounded-lg object-cover border border-slate-800" 
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
                        <label className="block text-xs font-mono text-slate-400">My Consultation Call Rate (INR per Minute)</label>
                        {wallet?.plan_id && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded font-mono font-bold">
                            Plan Maximum Limit: ₹{plans.find(p => p.id === wallet.plan_id)?.max_consultant_rate ?? 25}/min
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        placeholder="25"
                        value={pricePerMin}
                        onChange={(e) => setPricePerMin(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono font-bold"
                      />
                      {wallet?.plan_id && parseFloat(pricePerMin) > (plans.find(p => p.id === wallet.plan_id)?.max_consultant_rate ?? 25) && (
                        <p className="text-[10px] text-rose-400 font-bold mt-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                          ⚠️ Warning: Your active subscription plan allows you to set a rate up to ₹{plans.find(p => p.id === wallet.plan_id)?.max_consultant_rate ?? 25}/minute.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-mono text-slate-400">Professional Bio / Area of Expertise</label>
                      <textarea
                        placeholder="Describe your expertise, certifications, and what clients can expect during a pay-per-minute consultation..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={5}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full resize-none font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 py-3 rounded-xl text-xs font-extrabold w-full transition-all uppercase tracking-wider shadow-lg hover:shadow-emerald-500/5"
                    >
                      Save Profile & Consultation Settings
                    </button>
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
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4 text-left">
                    <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                      <FileText className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-slate-100">Consultation Chat Record Audit Ledger</h3>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {sessions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs font-mono">No sessions recorded yet for your account.</div>
                      ) : (
                        sessions.map((sess) => {
                          const isUserBlocked = blockedUsers.some(b => b.user_name.toLowerCase() === sess.user_name.toLowerCase());
                          return (
                            <div
                              key={sess.id}
                              className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-750 transition-colors"
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center space-x-2 flex-wrap gap-1">
                                  <span className="text-xs font-black text-slate-200">{sess.user_name}</span>
                                  <span className="text-[9px] font-mono text-slate-500">Session ID: #{sess.id}</span>
                                  {isUserBlocked && (
                                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase">
                                      Blocked
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 font-mono">
                                  Duration: <strong className="text-slate-200">{sess.duration_minutes} Mins</strong> • Rate: ₹{sess.price_per_minute}/min
                                </p>
                                <div className="text-[11px] text-emerald-400 font-mono">
                                  Net Earnings: <strong>₹{sess.consultant_earnings.toFixed(2)}</strong> (after platform commission)
                                </div>
                                {sess.refunded_amount > 0 && (
                                  <div className="text-[11px] text-rose-400 font-mono font-bold mt-1">
                                    ⚠ Refund Deducted: -₹{sess.refunded_amount.toFixed(2)} ({sess.refunded_minutes} Mins)
                                  </div>
                                )}
                                {sess.rating && (
                                  <div className="flex items-center space-x-2 mt-1.5 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/40 w-fit">
                                    <div className="flex items-center text-amber-400">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-3 h-3 ${i < sess.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                                        />
                                      ))}
                                    </div>
                                    {sess.review_text && (
                                      <span className="text-[10px] text-slate-300 italic font-sans" title={sess.review_text}>
                                        "{sess.review_text}"
                                      </span>
                                    )}
                                  </div>
                                )}
                                <span className="text-[9px] text-slate-600 font-mono block">
                                  Date: {new Date(sess.created_at).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t border-slate-900 sm:border-0 pt-2 sm:pt-0">
                                {sess.status === 'completed' && (
                                  <div className="flex flex-col items-end space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold">Completed</span>
                                      {sess.refunded_amount > 0 && (
                                        <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-bold">Refunded</span>
                                      )}
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
                                      className="text-[10px] text-emerald-400 hover:underline hover:text-emerald-300 font-bold font-mono transition-all"
                                    >
                                      View Transcript
                                    </button>
                                  </div>
                                )}
                                
                                {sess.status === 'active' && (
                                  <div className="flex flex-col items-end space-y-1">
                                    <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded text-[9px] font-bold animate-pulse">Live Now</span>
                                    <button
                                      onClick={() => {
                                        if (currentConsultant) {
                                          onSelectSession(sess.id, currentConsultant.display_name, 'consultant');
                                        }
                                      }}
                                      className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[9px] px-2 py-0.5 rounded transition-colors"
                                    >
                                      Join Room
                                    </button>
                                  </div>
                                )}

                                {sess.status === 'rejected' && (
                                  <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[9px] font-bold">Rejected</span>
                                )}

                                {sess.status === 'missed' && (
                                  <span className="bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold">Missed</span>
                                )}

                                <div className="flex items-center space-x-1.5 mt-1">
                                  {isUserBlocked ? (
                                    <button
                                      onClick={() => handleUnblockUser(sess.user_name)}
                                      className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 py-1 font-bold transition-all"
                                    >
                                      Unblock
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleBlockUser(sess.user_name)}
                                      className="text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg px-2.5 py-1 font-bold transition-all"
                                    >
                                      Block Client
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Blocked Users Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4 text-left">
                    <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      <h3 className="font-bold text-slate-100">Blocked Clients List</h3>
                    </div>

                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {blockedUsers.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-xs font-mono">No clients are currently blocked.</div>
                      ) : (
                        blockedUsers.map((b) => (
                          <div key={b.id} className="bg-slate-950 border border-slate-850 px-4 py-3 rounded-xl flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-slate-200">{b.user_name}</span>
                              <p className="text-[9px] text-slate-500 font-mono">Blocked on: {new Date(b.created_at).toLocaleDateString()}</p>
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
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-slate-100 font-sans">Aadhaar & PAN Verification (KYC Update)</h3>
                  </div>

                  {/* KYC Status Indicator Banner */}
                  <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 border-slate-850" id="kyc-status-banner">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Current KYC Status</span>
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
                      <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest border-b border-slate-900 pb-2">1. Aadhaar Card Verification</h4>
                      
                      <div className="space-y-1.5">
                        <label className="block text-xs font-mono text-slate-400" htmlFor="aadhaar-number-input">Aadhaar Card Number (12 Digits)</label>
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
                        <label className="block text-xs font-mono text-slate-400">Aadhaar Photo Attachment</label>
                        
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
                          <div className="mt-2 p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-3" id="aadhaar-photo-preview">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={aadhaarPhotoUrl} 
                                alt="Aadhaar Preview" 
                                className="w-12 h-12 rounded-lg object-cover border border-slate-800"
                                referrerPolicy="no-referrer"
                              />
                              <div className="text-left">
                                <span className="text-[10px] text-slate-400 font-bold block">Aadhaar Card Attachment Verified</span>
                                <span className="text-[9px] text-emerald-400 font-mono block truncate max-w-[180px] sm:max-w-[300px]">{aadhaarPhotoUrl}</span>
                              </div>
                            </div>
                            {(kycStatus === 'unsubmitted' || kycStatus === 'rejected') && (
                              <button
                                type="button"
                                onClick={() => setAadhaarPhotoUrl('')}
                                className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors font-mono"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PAN Card Details */}
                    <div className="space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-850">
                      <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest border-b border-slate-900 pb-2">2. PAN Card Verification</h4>
                      
                      <div className="space-y-1.5">
                        <label className="block text-xs font-mono text-slate-400" htmlFor="pan-number-input">PAN Card Number</label>
                        <input
                          id="pan-number-input"
                          type="text"
                          maxLength={10}
                          placeholder="Enter your 10-character PAN Card number"
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                          disabled={kycStatus === 'approved' || kycStatus === 'pending'}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono tracking-wider font-bold"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-mono text-slate-400">PAN Card Photo Attachment</label>
                        
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
                          <div className="mt-2 p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-3" id="pan-photo-preview">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={panPhotoUrl} 
                                alt="PAN Preview" 
                                className="w-12 h-12 rounded-lg object-cover border border-slate-800"
                                referrerPolicy="no-referrer"
                              />
                              <div className="text-left">
                                <span className="text-[10px] text-slate-400 font-bold block">PAN Card Attachment Verified</span>
                                <span className="text-[9px] text-emerald-400 font-mono block truncate max-w-[180px] sm:max-w-[300px]">{panPhotoUrl}</span>
                              </div>
                            </div>
                            {(kycStatus === 'unsubmitted' || kycStatus === 'rejected') && (
                              <button
                                type="button"
                                onClick={() => setPanPhotoUrl('')}
                                className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors font-mono"
                              >
                                Clear
                              </button>
                            )}
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

              {/* TAB 6: Bank Account Details */}
              {activeTab === 'bank' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6 text-left"
                  id="bank-details-tab"
                >
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-slate-100 font-sans">Bank Details for Payout Disbursements</h3>
                  </div>

                  {/* Bank Details Status Indicator Banner */}
                  <div className="p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 border-slate-850" id="bank-status-banner">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Bank Account Verification Status</span>
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
                      <label className="block text-xs font-mono text-slate-400" htmlFor="bank-holder-name-input">Account Holder Name</label>
                      <input
                        id="bank-holder-name-input"
                        type="text"
                        placeholder="Enter the official bank account holder name"
                        value={bankAccountHolderName}
                        onChange={(e) => setBankAccountHolderName(e.target.value)}
                        disabled={bankStatus === 'approved' || bankStatus === 'pending'}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-sans font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono text-slate-400" htmlFor="bank-account-number-input">Account Number</label>
                      <input
                        id="bank-account-number-input"
                        type="text"
                        placeholder="Enter account number"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                        disabled={bankStatus === 'approved' || bankStatus === 'pending'}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono tracking-widest font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono text-slate-400" htmlFor="bank-ifsc-input">Bank IFSC Code</label>
                      <input
                        id="bank-ifsc-input"
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={bankIfscCode}
                        onChange={(e) => setBankIfscCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        disabled={bankStatus === 'approved' || bankStatus === 'pending'}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full font-mono tracking-wider font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono text-slate-400" htmlFor="bank-name-input">Bank Name</label>
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
                        Submit Bank Details for Payout Approval
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
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
                    <HelpCircle className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-slate-100 font-sans">Consultant Helpdesk & Customer Support</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left side: Raise ticket form */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs text-emerald-400 uppercase tracking-widest">Raise a Support Ticket</h4>
                      <p className="text-xs text-slate-400">
                        Aapko payout, chat request, ya kisi customer se related koi samasya hai? Kripya ticket raise karein. Hamari admin team ise jald se jald handle karegi.
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
                          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Subject / Topic *</label>
                          <input
                            type="text"
                            name="subject"
                            required
                            placeholder="Brief title of your query..."
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Select Chat Reference (Optional)</label>
                          <select
                            name="session_id"
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full font-mono"
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
                          <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider">Message / Explanation *</label>
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
                        <div className="text-center py-12 text-slate-500 text-xs font-mono animate-pulse">Loading helpdesk tickets...</div>
                      ) : consultantTickets.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs font-mono bg-slate-950/40 rounded-2xl border border-dashed border-slate-800/80">
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
                                <div className="text-[10px] text-slate-500 font-mono">
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
                                <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-2.5 text-center text-[10px] text-slate-500 font-mono">
                                  🔒 Closed. No further replies allowed.
                                </div>
                              )}

                              <div className="text-[9px] text-slate-600 font-mono pt-1">
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
        </div>
      )}

    </div>
  );
}
