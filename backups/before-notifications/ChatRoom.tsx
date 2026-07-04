import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, Clock, User, Sparkles, MessageSquare, AlertTriangle, ArrowLeft, Check, CheckCheck, CheckCircle, ShieldAlert, XCircle, Ban, Mic, Square, Trash2, X } from 'lucide-react';
import { Message, Session } from '../../types';
import { useAuthContext } from '../../context/AuthContext';

interface ChatRoomProps {
  sessionId: string;
  userName: string; // The display name of the current client
  role: 'user' | 'consultant'; // Active persona
  onClose: () => void;
  currentUser?: any;
  refreshUserProfile?: (id: number) => Promise<void>;
}

export function ChatRoom({ 
  sessionId, 
  userName, 
  role, 
  onClose,
  currentUser: currentUserProp,
  refreshUserProfile: refreshUserProfileProp
}: ChatRoomProps) {
  const authContext = useAuthContext();
  const currentUser = currentUserProp || authContext?.currentUser;
  const refreshUserProfile = refreshUserProfileProp || authContext?.refreshUserProfile;
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const cached = localStorage.getItem(`advisor_chat_messages_${sessionId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error reading cached messages:', e);
    }
    return [];
  });

  // Network Resilience and Offline Queue states/refs
  const [lowInternet, _setLowInternet] = useState(false);
  const lowInternetRef = useRef(false);
  const setLowInternet = (val: boolean) => {
    lowInternetRef.current = val;
    _setLowInternet(val);
  };
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const offlineQueueRef = useRef<{ id: string; text: string; sender_type: string; sender_name: string; attempts: number }[]>([]);
  const isProcessingQueue = useRef(false);

  const processOfflineQueue = async () => {
    if (isProcessingQueue.current) return;
    if (offlineQueueRef.current.length === 0) return;
    if (lowInternetRef.current || !socketRef.current?.connected) return;

    isProcessingQueue.current = true;
    console.log('[Offline Queue] Processing started. Current queue length:', offlineQueueRef.current.length);

    while (offlineQueueRef.current.length > 0) {
      if (lowInternetRef.current || !socketRef.current?.connected) {
        console.log('[Offline Queue] Connection lost or unstable. Pausing processing.');
        break;
      }

      const msg = offlineQueueRef.current[0];
      const backoffDelay = Math.min(1000 * Math.pow(2, msg.attempts), 10000); // Backoff limit of 10s

      if (msg.attempts > 0) {
        console.log(`[Offline Queue] Retrying message id: ${msg.id} after backoff of ${backoffDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }

      try {
        const res = await fetch(`/api/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_type: msg.sender_type,
            sender_name: msg.sender_name,
            text: msg.text,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.message) {
            console.log('[Offline Queue] Successfully sent queued message:', msg.id);
            // Replace the temporary offline message with the actual message from the database
            setMessages(prev => {
              const filtered = prev.filter(m => m.id !== msg.id);
              if (filtered.some(m => m.id === data.message.id)) return filtered;
              return [...filtered, data.message];
            });
            // Remove from the queue
            offlineQueueRef.current.shift();
          } else {
            msg.attempts += 1;
          }
        } else {
          msg.attempts += 1;
        }
      } catch (err) {
        console.error('[Offline Queue] Send failed with error:', err);
        msg.attempts += 1;
      }
    }

    isProcessingQueue.current = false;
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      try {
        localStorage.setItem(`advisor_chat_messages_${sessionId}`, JSON.stringify(messages));
      } catch (e) {
        console.error('Error saving messages to localStorage:', e);
      }
    }
  }, [messages, sessionId]);

  const [textInput, setTextInput] = useState('');
  
  // Custom confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Real-time socket states
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionTranscript, setSessionTranscript] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);

  // User real-time queue states
  const [userQueuePos, setUserQueuePos] = useState<number | null>(null);
  const [userQueueWaitSeconds, setUserQueueWaitSeconds] = useState<number>(0);
  const [showBusyPopup, setShowBusyPopup] = useState(true);
  const [activeChatRemainingSeconds, setActiveChatRemainingSeconds] = useState<number>(0);
  const [isExitingQueue, setIsExitingQueue] = useState(false);

  const handleExitQueue = async () => {
    if (!sessionId) return;
    setConfirmState({
      isOpen: true,
      title: "Exit Queue?",
      message: "Aap sach mein queue se bahar nikalna chahte hain? Aapka paid amount refund ho jayega. (Are you sure you want to exit the queue? Your payment will be refunded to your wallet.)",
      onConfirm: async () => {
        try {
          setIsExitingQueue(true);
          const res = await fetch(`/api/sessions/${sessionId}/cancel`, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            setSessionInfo(prev => prev ? { ...prev, status: 'cancelled' } : null);
            setShowBusyPopup(false);
          } else {
            alert(data.error || "Failed to exit queue.");
          }
        } catch (err: any) {
          console.error("Error exiting queue:", err);
          alert("An error occurred. Please try again.");
        } finally {
          setIsExitingQueue(false);
        }
      }
    });
  };

  useEffect(() => {
    if (activeChatRemainingSeconds > 0) {
      const timer = setInterval(() => {
        setActiveChatRemainingSeconds(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeChatRemainingSeconds]);

  useEffect(() => {
    if (role === 'user' && sessionInfo?.status === 'queued' && sessionInfo?.consultant_id) {
      const fetchUserQueueStatus = async () => {
        try {
          const res = await fetch(`/api/consultants/${sessionInfo.consultant_id}/queue-status`);
          if (res.ok) {
            const data = await res.json();
            // Find user's position in queue_users
            const meInQueue = data.queue_users?.find((u: any) => u.session_id === sessionId);
            if (meInQueue) {
              setUserQueuePos(meInQueue.position);
              // Calculate wait time for this user: remaining seconds of current active chat + wait time of preceding users in queue
              let waitTime = data.remaining_seconds || 0;
              setActiveChatRemainingSeconds(data.remaining_seconds || 0);
              for (const u of data.queue_users) {
                if (u.position < meInQueue.position) {
                  waitTime += u.duration_minutes * 60;
                }
              }
              setUserQueueWaitSeconds(waitTime);
            }
          }
        } catch (err) {
          console.error('Error fetching user queue status:', err);
        }
      };

      fetchUserQueueStatus();
      const interval = setInterval(fetchUserQueueStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [role, sessionInfo?.status, sessionInfo?.consultant_id, sessionId]);

  useEffect(() => {
    if (role === 'consultant' && sessionInfo?.consultant_id) {
      const fetchQueueStatus = async () => {
        try {
          const res = await fetch(`/api/consultants/${sessionInfo.consultant_id}/queue-status`);
          if (res.ok) {
            const data = await res.json();
            setQueueCount(data.queue_count || 0);
          }
        } catch (err) {
          console.error('Error fetching consultant queue count:', err);
        }
      };
      
      fetchQueueStatus();
      const interval = setInterval(fetchQueueStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [role, sessionInfo?.consultant_id]);

  // New action states
  const [isEnding, setIsEnding] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const safeFormatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionInfo) return;
    const words = reviewText.trim() === '' ? 0 : reviewText.trim().split(/\s+/).length;
    if (words > 30) {
      setReviewError('Review text cannot exceed 30 words.');
      return;
    }
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/consultants/${sessionInfo.consultant_id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          rating: reviewRating,
          text: reviewText,
          session_id: sessionId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }
      setReviewSubmitted(true);
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load initial session data and past messages
  const loadSessionDataset = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionInfo(data.session);
        setMessages(data.messages);
        
        if (data.session.status === 'completed' || data.session.status === 'cancelled' || data.session.status === 'rejected' || data.session.status === 'missed') {
          setSessionCompleted(true);
          setSessionTranscript(data.session.transcript);
          localStorage.removeItem('advisor_active_session');
        } else if (data.session.status === 'active' && data.session.expires_at) {
          const expiryTime = new Date(data.session.expires_at);
          const now = new Date();
          const remainingMs = expiryTime.getTime() - now.getTime();
          const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
          setRemainingSeconds(remainingSeconds);
        }
      } else {
        localStorage.removeItem('advisor_active_session');
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  useEffect(() => {
    loadSessionDataset();
  }, [sessionId]);

  // 2. Setup Socket.IO dynamic listeners
  useEffect(() => {
    // Connect to current origin
    const socket = io();
    socketRef.current = socket;

    let heartbeatInterval: NodeJS.Timeout | null = null;
    let heartbeatTimeout: NodeJS.Timeout | null = null;

    const startHeartbeat = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);

      heartbeatInterval = setInterval(() => {
        if (socket.connected && !lowInternetRef.current) {
          const startTime = Date.now();
          socket.emit('ping:heartbeat', { startTime });

          heartbeatTimeout = setTimeout(() => {
            console.warn('[Heartbeat] No pong response within 3000ms. Low internet detected.');
            setLowInternet(true);
          }, 3000);
        } else if (!socket.connected) {
          setLowInternet(true);
        }
      }, 3000);
    };

    // Join room
    socket.emit('join:room', { session_id: sessionId, role, username: userName });

    // Connection success indicator
    socket.on('connect', () => {
      console.log('Chat socket connected successfully!');
      setLowInternet(false);
      startHeartbeat();
      socket.emit('join:room', { session_id: sessionId, role, username: userName });
      loadSessionDataset();
      processOfflineQueue();
    });

    socket.on('disconnect', () => {
      console.warn('Chat socket disconnected!');
      setLowInternet(true);
    });

    socket.on('connect_error', () => {
      setLowInternet(true);
    });

    socket.on('pong:heartbeat', (data: { startTime: number }) => {
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
      const latency = Date.now() - data.startTime;
      setPingLatency(latency);
      if (latency > 3000) {
        console.warn(`[Heartbeat] High ping latency detected: ${latency}ms`);
        setLowInternet(true);
      } else {
        setLowInternet(false);
        processOfflineQueue();
      }
    });

    // Session started ticker (transitions status pending -> active)
    socket.on('session:started', ({ started_at, expires_at, duration_minutes }) => {
      setSessionInfo(prev => {
        if (!prev) {
          return {
            status: 'active',
            started_at,
            expires_at,
            duration_minutes,
          } as any;
        }
        return { ...prev, status: 'active', started_at, expires_at };
      });
      loadSessionDataset();
    });

    // Queue activated by server
    socket.on('queue:activated', ({ session_id }) => {
      console.log('Queue activated for session:', session_id);
      loadSessionDataset();
    });

    // Received a message
    socket.on('message', (msg: Message) => {
      setMessages(prev => {
        // Prevent duplicate append
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Automatically trigger read receipt if chat room is focused
      if (msg.sender_type !== role) {
        socket.emit('read:messages', { session_id: sessionId, sender_type: role });
        setPartnerOnline(true);
      }
    });

    // Partner Joined
    socket.on('partner:joined', ({ role: partnerRole, username: partnerName }) => {
      setPartnerOnline(true);
      console.log(`Advisor companion joined room: ${partnerName}`);
    });

    // Partner Left
    socket.on('partner:left', () => {
      setPartnerOnline(false);
      console.log('Advisor companion left room');
    });

    // Partner Typing
    socket.on('partner:typing', ({ sender_name, is_typing }) => {
      setPartnerTyping(is_typing);
      if (is_typing) {
        setPartnerOnline(true);
      }
    });

    // Messages Read receipt
    socket.on('messages:read_receipt', ({ reader_type }) => {
      if (reader_type !== role) {
        // Partner read our messages! Update local read states
        setMessages(prev => prev.map(m => m.sender_type === role ? { ...m, is_read: 1 } : m));
        setPartnerOnline(true);
      }
    });

    // Server-Authoritative Timer TICK
    socket.on('timer:tick', ({ remainingSeconds: seconds }) => {
      setRemainingSeconds(seconds);
    });

    // Server-Authoritative Expiry
    socket.on('session:expired', ({ transcript, message }) => {
      setSessionCompleted(true);
      setSessionTranscript(transcript);
      setRemainingSeconds(0);
      setSessionInfo(prev => prev ? { ...prev, status: 'completed', transcript } : null);
      if (currentUser?.id && refreshUserProfile) {
        refreshUserProfile(currentUser.id);
      }
    });

    // Request rejected by consultant
    socket.on('session:rejected', ({ message }) => {
      setSessionInfo(prev => prev ? { ...prev, status: 'rejected' } : null);
      if (currentUser?.id && refreshUserProfile) {
        refreshUserProfile(currentUser.id);
      }
    });

    // Request cancelled by user
    socket.on('session:cancelled', ({ message }) => {
      setSessionInfo(prev => prev ? { ...prev, status: 'cancelled' } : null);
      if (currentUser?.id && refreshUserProfile) {
        refreshUserProfile(currentUser.id);
      }
    });

    // Request missed by consultant
    socket.on('session:missed', ({ message }) => {
      setSessionInfo(prev => prev ? { ...prev, status: 'missed' } : null);
      if (currentUser?.id && refreshUserProfile) {
        refreshUserProfile(currentUser.id);
      }
    });

    // Cleanup
    return () => {
      socket.disconnect();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [sessionId, role, userName]);

  // 2.5 Tab visibility recovery & background state recovery
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App Lifecycle] Tab in foreground. Syncing chat state & verifying connection...');
        loadSessionDataset();
        if (socketRef.current) {
          if (!socketRef.current.connected) {
            socketRef.current.connect();
          } else {
            socketRef.current.emit('join:room', { session_id: sessionId, role, username: userName });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, role, userName]);

  // 2.6 Reactive offline queue process trigger
  useEffect(() => {
    if (!lowInternet && socketRef.current?.connected) {
      processOfflineQueue();
    }
  }, [lowInternet]);

  // 3. Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = textInput.trim();
    const isInactive = sessionCompleted || sessionInfo?.status === 'rejected' || sessionInfo?.status === 'missed' || sessionInfo?.status === 'cancelled';
    if (!textToSend || isInactive) return;

    // Clear input immediately to make UI responsive
    setTextInput('');

    // Generate local offline message object
    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const tempMessage: Message = {
      id: tempId,
      session_id: sessionId,
      sender_type: role,
      sender_name: userName,
      text: textToSend,
      created_at: new Date().toISOString(),
      is_read: 0,
      is_offline: true, // Custom flag for UI indicators
    };

    // If offline or low internet, queue immediately and display locally
    if (lowInternetRef.current || !socketRef.current?.connected) {
      console.log('[Offline Send] Low internet/socket disconnected. Queueing message locally.');
      setMessages(prev => [...prev, tempMessage]);
      offlineQueueRef.current.push({
        id: tempId,
        text: textToSend,
        sender_type: role,
        sender_name: userName,
        attempts: 0
      });
      processOfflineQueue();
      return;
    }

    try {
      // Send message via our ultra-reliable REST API
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_type: role,
          sender_name: userName,
          text: textToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          // Instantly append to local messages list
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      } else {
        console.error('Failed to send message via REST API status:', res.status);
        // Queue local fallback
        setMessages(prev => [...prev, tempMessage]);
        offlineQueueRef.current.push({
          id: tempId,
          text: textToSend,
          sender_type: role,
          sender_name: userName,
          attempts: 0
        });
        processOfflineQueue();
      }
    } catch (err) {
      console.error('REST message send failed, queueing message locally:', err);
      setMessages(prev => [...prev, tempMessage]);
      offlineQueueRef.current.push({
        id: tempId,
        text: textToSend,
        sender_type: role,
        sender_name: userName,
        attempts: 0
      });
      processOfflineQueue();
    }

    // Clear typing states
    if (socketRef.current) {
      socketRef.current.emit('typing', { session_id: sessionId, sender_name: userName, is_typing: false });
    }
  };

  // 5. Typing Indicator triggering with debounce
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);

    if (!socketRef.current || sessionCompleted) return;

    // Emit typing is true
    socketRef.current.emit('typing', { session_id: sessionId, sender_name: userName, is_typing: true });

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Timeout to emit typing is false
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('typing', { session_id: sessionId, sender_name: userName, is_typing: false });
      }
    }, 1500);
  };

  // 5.5 Audio Recording Handlers for Consultants
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        // Convert Blob to Base64 to save directly in the message text
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          sendVoiceNote(base64data);
        };

        // Stop all tracks in the stream to release the mic icon in browser tab
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      alert('Microphone permission block hai ya support nahi karta. (Microphone access blocked or not supported.)');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      // Temporarily bypass the send action on stop
      mediaRecorder.onstop = () => {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const sendVoiceNote = async (base64Audio: string) => {
    const isInactive = sessionCompleted || sessionInfo?.status === 'rejected' || sessionInfo?.status === 'missed' || sessionInfo?.status === 'cancelled';
    if (isInactive) return;

    const payloadText = `[VOICE_NOTE]:${base64Audio}`;

    try {
      // Send via HTTP REST API
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_type: role,
          sender_name: userName,
          text: payloadText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      } else {
        if (socketRef.current) {
          socketRef.current.emit('send:message', {
            session_id: sessionId,
            sender_type: role,
            sender_name: userName,
            text: payloadText,
          });
        }
      }
    } catch (err) {
      console.error('REST voice note send failed, trying socket fallback:', err);
      if (socketRef.current) {
        socketRef.current.emit('send:message', {
          session_id: sessionId,
          sender_type: role,
          sender_name: userName,
          text: payloadText,
        });
      }
    }
  };

  // Formatter for MM:SS
  const formatTimer = (secs: number | null): string => {
    if (secs === null) return '--:--';
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  if (!sessionInfo) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        <p className="text-sm text-slate-400 font-sans">Connecting to secure consultation room...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[150] md:relative md:inset-auto md:z-0 bg-slate-950 md:bg-transparent w-full max-w-4xl mx-auto px-0 md:px-4 sm:px-6 lg:px-8 py-0 md:py-4 h-[100dvh] md:h-[calc(100vh-100px)] flex flex-col justify-between overflow-hidden">
      
      {/* Consultant Queue Banner */}
      {role === 'consultant' && queueCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center justify-between mb-3 animate-pulse">
          <span className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span>👥 {queueCount} user(s) joined your queue</span>
          </span>
          <span className="text-[10px] font-mono tracking-wider uppercase bg-amber-500/15 px-2 py-0.5 rounded text-amber-300 font-bold">In Queue</span>
        </div>
      )}

      {/* Session Title Bar */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 md:rounded-t-2xl rounded-none border-b md:border border-slate-800 flex flex-row items-center justify-between gap-2 sm:gap-3 shadow-sm shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition-all flex items-center space-x-1 shadow-sm"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="text-[11px] font-bold font-sans hidden sm:inline">Go Back</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              const photo = role === 'user' ? sessionInfo?.consultant_photo : sessionInfo?.user_photo;
              if (photo) setLightboxImage(photo);
            }}
            className="bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800 flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 overflow-hidden hover:border-emerald-500 transition-all cursor-pointer flex items-center justify-center relative group"
            title="Click to view photo"
          >
            {(() => {
              const photo = role === 'user' ? sessionInfo?.consultant_photo : sessionInfo?.user_photo;
              if (photo) {
                return (
                  <img
                    src={photo}
                    alt=""
                    className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as any).src = role === 'user' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'; }}
                  />
                );
              }
              return role === 'user' ? <Sparkles className="w-5 h-5 text-emerald-400" /> : <User className="w-5 h-5 text-emerald-400" />;
            })()}
          </button>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-slate-100 max-w-[100px] sm:max-w-none truncate">
              {role === 'user' ? sessionInfo?.consultant_name : sessionInfo?.user_name}
            </h3>
            <div className="flex items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 mt-0.5 text-[9px] sm:text-[10px] text-slate-400 font-sans flex-wrap">
              {/* Our Connection Status */}
              <span className="flex items-center space-x-1">
                <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${lowInternet ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                <span className="hidden sm:inline">You: {lowInternet ? 'Low internet' : 'Online'}</span>
                <span className="sm:hidden">{lowInternet ? 'Low' : 'You'}</span>
              </span>
              
              <span className="text-slate-750 font-sans">•</span>
              
              {/* Partner Connection Status */}
              <span className="flex items-center space-x-1">
                <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${partnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                <span className="hidden sm:inline">Partner: {partnerOnline ? 'Connected' : 'Waiting...'}</span>
                <span className="sm:hidden">{partnerOnline ? 'Live' : 'Wait'}</span>
              </span>

              <span className="text-slate-750 font-sans hidden sm:inline">•</span>
              
              <span className="text-slate-500 font-mono hidden sm:inline">
                Tariff: ₹{sessionInfo?.price_per_minute || '--'}/min
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons & Countdown display */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {/* User End Chat option */}
          {!sessionCompleted && sessionInfo && (sessionInfo.status === 'active' || sessionInfo.status === 'pending') && (
            <div className="flex items-center space-x-2">
              {role === 'user' && (
                <button
                  id="user-end-chat-btn"
                  onClick={() => {
                    setConfirmState({
                      isOpen: true,
                      title: 'End Consultation?',
                      message: 'Kya aap sach mein is consultation ko end karna chahte hain? (Are you sure you want to end this consultation?)',
                      onConfirm: async () => {
                        try {
                          setIsEnding(true);
                          const res = await fetch(`/api/sessions/${sessionId}/end`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ended_by: role })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setToastMessage({ type: 'success', text: 'Consultation ended successfully.' });
                            setSessionCompleted(true);
                            setSessionTranscript(data.transcript || '');
                            setRemainingSeconds(0);
                            setSessionInfo(prev => prev ? { ...prev, status: data.status || 'completed', transcript: data.transcript } : null);
                            if (currentUser?.id && refreshUserProfile) {
                              refreshUserProfile(currentUser.id);
                            }
                          } else {
                            const errData = await res.json();
                            alert(errData.error || 'Failed to end session');
                          }
                        } catch (err) {
                          console.error('Error manual ending:', err);
                        } finally {
                          setIsEnding(false);
                        }
                      }
                    });
                  }}
                  disabled={isEnding}
                  className="bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 font-bold text-xs p-2 sm:px-3 sm:py-2 rounded-xl transition-all flex items-center space-x-1"
                >
                  <XCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">End Chat</span>
                </button>
              )}

              {/* Consultant Block Option */}
              {role === 'consultant' && (
                <div className="flex items-center space-x-1.5">
                  <button
                    id="consultant-block-btn"
                    onClick={() => {
                      const uName = sessionInfo.user_name;
                      setConfirmState({
                        isOpen: true,
                        title: 'Block User?',
                        message: `"${uName}" will get blocked and not able to contact you in future, Are you sure you want to block.`,
                        confirmText: 'Yes, Block',
                        cancelText: 'No, Cancel',
                        onConfirm: async () => {
                          try {
                            setIsBlocking(true);
                            // 1. Block request
                            const blockRes = await fetch('/api/consultants/block', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                consultant_id: sessionInfo.consultant_id,
                                user_name: uName
                              })
                            });
                            if (blockRes.ok) {
                              // 2. End current session immediately and do money deduction calculation according to time
                              const endRes = await fetch(`/api/sessions/${sessionId}/end`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ended_by: role })
                              });
                              if (endRes.ok) {
                                const data = await endRes.json();
                                setSessionCompleted(true);
                                setSessionTranscript(data.transcript || '');
                                setRemainingSeconds(0);
                                setSessionInfo(prev => prev ? { ...prev, status: data.status || 'completed', transcript: data.transcript } : null);
                              }
                              setToastMessage({ type: 'success', text: `Blocked ${uName} and ended chat.` });
                            } else {
                              const blockErr = await blockRes.json();
                              alert(blockErr.error || 'Failed to block user');
                            }
                          } catch (err) {
                            console.error('Error blocking:', err);
                          } finally {
                            setIsBlocking(false);
                          }
                        }
                      });
                    }}
                    disabled={isBlocking}
                    className="bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-850 font-bold text-xs p-2 sm:px-3 sm:py-2 rounded-xl transition-all flex items-center space-x-1"
                  >
                    <Ban className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Block User</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Countdown display */}
          <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-950 border border-slate-850 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-rose-400 flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <div className="text-[10px] sm:text-xs font-black font-mono tracking-wider">
              {sessionInfo?.status === 'queued' ? (
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-wide">In Queue</span>
              ) : sessionInfo?.status === 'pending' ? (
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-400 uppercase tracking-wide">Pending Accept</span>
              ) : sessionCompleted ? (
                '00:00'
              ) : (
                formatTimer(remainingSeconds)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live messaging feed */}
      <div className="flex-1 bg-slate-950 border-x border-slate-900 p-4 md:p-6 overflow-y-auto space-y-4 min-h-0 md:min-h-[300px]">
        
        {/* Sleek Low Internet Banner */}
        {lowInternet && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center justify-center space-x-2.5 animate-pulse mb-3 max-w-md mx-auto shadow-lg shadow-rose-950/20">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>Connecting... Low internet detected</span>
          </div>
        )}

        {/* Sleek Toast Feedback Alert */}
        {toastMessage && (
          <div className={`p-3 rounded-xl border text-center text-xs font-sans max-w-md mx-auto ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {toastMessage.text}
          </div>
        )}

        {/* Connection Status Inline Banner (Replaces giant fullscreen cards) */}
        {!sessionCompleted && sessionInfo?.status !== 'rejected' && sessionInfo?.status !== 'missed' && (
          <div className="max-w-lg mx-auto mb-2">
            {sessionInfo?.status === 'queued' ? (
              <div className="bg-amber-500/10 border border-amber-500/25 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
                <Clock className="w-12 h-12 text-amber-400 animate-bounce" />
                <div className="space-y-1">
                  <strong className="text-sm text-amber-400 block font-sans">Aap Queue mein hain! (You are in the Queue!)</strong>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    Your payment was successful. You are queued for consultation.
                    <span className="text-emerald-400 block font-bold mt-1">
                      You will be able to connect once the timer gets over.
                    </span>
                    <span className="text-slate-400 block text-[10px] mt-0.5">
                      (Jaise hi current active timer khatam hoga, aap automatically connect ho jayenge.)
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-2 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">Queue Position</span>
                    <strong className="text-base font-mono text-amber-400 mt-0.5 block">
                      #{userQueuePos !== null ? userQueuePos : '...'}
                    </strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-900">
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-mono">Est. Wait Time</span>
                    <strong className="text-base font-mono text-emerald-400 mt-0.5 block">
                      {Math.ceil(userQueueWaitSeconds / 60)} Mins
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 w-full max-w-sm text-center">
                  <span className="text-[10px] text-slate-500 block mb-1">STAY ON THIS PAGE • RE-CONNECT DELAY: 10S</span>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-2.5">
                    <div className="bg-emerald-500 h-full animate-pulse w-2/3"></div>
                  </div>
                  <button
                    onClick={handleExitQueue}
                    disabled={isExitingQueue}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-all underline underline-offset-4 flex items-center justify-center mx-auto space-x-1"
                  >
                    <span>{isExitingQueue ? 'Exiting Queue...' : 'Exit Queue & Refund'}</span>
                  </button>
                </div>
              </div>
            ) : sessionInfo?.status === 'active' ? (
              <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl flex items-start space-x-2.5 text-left">
                <Sparkles className="w-4.5 h-4.5 text-emerald-400 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <strong className="text-xs text-emerald-400 block font-sans">Consultation is Live! 🌟</strong>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-0.5">
                    The billing timer is active and counting down. Speak freely; your chat is secure and private.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/25 p-3.5 rounded-xl flex items-start space-x-2.5 text-left animate-pulse">
                <Clock className="w-4.5 h-4.5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-xs text-amber-400 block font-sans">Waiting for Accept... 🔔</strong>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-0.5">
                    Your payment was successful! We are waiting for the consultant to accept your chat session.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rejected Status Screen */}
        {sessionInfo?.status === 'rejected' && (
          <div className="space-y-4 pt-6 max-w-md mx-auto">
            <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wide">Request Rejected</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Aapki chat request consultant ne reject kar di hai. Aapka paid amount secure hai aur refund process ho jayega.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                (Your chat request was rejected by the consultant. Paid amount will be refunded.)
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl w-full transition-all flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Listings</span>
            </button>
          </div>
        )}

        {/* Missed Status Screen */}
        {sessionInfo?.status === 'missed' && (
          <div className="space-y-4 pt-6 max-w-md mx-auto">
            <div className="bg-slate-500/10 border border-slate-500/20 p-6 rounded-2xl text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-400 mx-auto animate-pulse" />
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Request Missed</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Consultant busy hone ke karan aapki chat accept nahi kar paye. Aapka refund process ho jayega.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                (Consultant missed your chat request. Paid amount will be refunded.)
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl w-full transition-all flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Listings</span>
            </button>
          </div>
        )}

        {/* Cancelled Status Screen */}
        {sessionInfo?.status === 'cancelled' && (
          <div className="space-y-4 pt-6 max-w-md mx-auto">
            <div className="bg-slate-500/10 border border-slate-500/20 p-6 rounded-2xl text-center space-y-3">
              <Clock className="w-10 h-10 text-slate-400 mx-auto animate-pulse" />
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Request Cancelled</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Aapne queue se exit kar liya hai. Aapka paid amount wallet mein safe hai aur refund process ho gaya hai.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                (You have exited the queue. Your paid amount has been refunded to your wallet.)
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl w-full transition-all flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Listings</span>
            </button>
          </div>
        )}

        {/* Chat loop */}
        {messages.map((msg) => {
          const isMe = msg.sender_type === role;
          const avatarSrc = msg.sender_type === 'consultant'
            ? (sessionInfo.consultant_photo || 'https://i.giphy.com/W7Xq86ali939u.gif')
            : (sessionInfo.user_photo || 'https://i.giphy.com/OdG9tyVfD9NPM.gif');

          return (
            <div
              key={msg.id}
              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start max-w-[85%] ${isMe ? 'flex-row-reverse space-x-3 space-x-reverse' : 'space-x-3'}`}>
                {/* Profile Pic */}
                <button
                  type="button"
                  onClick={() => setLightboxImage(avatarSrc)}
                  className="w-8 h-8 rounded-full border border-slate-800/80 overflow-hidden bg-slate-950 shrink-0 self-start mt-1 shadow cursor-pointer hover:border-emerald-500 hover:scale-105 transition-all p-0 flex items-center justify-center"
                  title="View Photo"
                >
                  <img
                    src={avatarSrc}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as any).src = msg.sender_type === 'consultant' ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'; }}
                  />
                </button>

                {/* Message bubble column */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender name */}
                  <span className="text-[10px] font-mono text-slate-500 mb-1 px-1">
                    {msg.sender_name}
                  </span>

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                      isMe
                        ? 'bg-emerald-500 text-slate-950 rounded-tr-none font-semibold'
                        : 'bg-slate-900 text-white rounded-tl-none border border-slate-800'
                    }`}
                  >
                    {msg.text.startsWith('[VOICE_NOTE]:') ? (
                      <div className="flex flex-col space-y-1.5 py-1 min-w-[200px] sm:min-w-[240px]">
                        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-100 uppercase tracking-wider">
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
                      <p className={`whitespace-pre-wrap leading-relaxed ${isMe ? 'text-slate-950 font-bold' : 'text-white'}`}>{msg.text}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 mt-1 px-1 text-[10px] text-slate-600 font-mono">
                    <span>{safeFormatTime(msg.created_at)}</span>
                    {isMe && (
                      <span>
                        {msg.is_offline ? (
                          <span className="text-amber-500/80 animate-pulse flex items-center space-x-0.5 font-sans font-semibold">
                            <Clock className="w-2.5 h-2.5 animate-spin inline-block mr-0.5" />
                            <span>Retry Queue...</span>
                          </span>
                        ) : msg.is_read === 1 ? (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Dynamic Partner Typing indicator */}
        {partnerTyping && (
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono py-1">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
            <span>Typing...</span>
          </div>
        )}

        {/* COMPLETED BANNER LOGS */}
        {sessionCompleted && (
          <div className="space-y-4 pt-6 border-t border-slate-900 max-w-md mx-auto">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Session Completed Successfully</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Billing countdown has run out. Net consultant earnings have been credited to their secure wallet.
              </p>
            </div>

            {sessionTranscript && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-1.5">Conversation transcript log</span>
                <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap max-h-[150px] overflow-y-auto leading-relaxed">
                  {sessionTranscript}
                </pre>
              </div>
            )}

            {role === 'user' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 text-left">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 font-bold">RATE YOUR CONSULTATION EXPERIENCE</span>
                
                {reviewSubmitted ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center text-xs text-emerald-400 font-sans font-bold">
                    ✨ Thank you! Aapka feedback successfully submit ho gaya hai.
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    {reviewError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center text-[11px] text-rose-400 font-sans">
                        {reviewError}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider font-bold">Stars Rating</label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setReviewRating(star)}
                            className={`text-xl transition-colors ${
                              reviewRating >= star ? 'text-amber-400' : 'text-slate-600 hover:text-amber-500'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider font-bold">Your Written Review</label>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Apna anubhav share karein... (e.g. Bohat accha guidance mila, highly recommended)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[65px] font-sans"
                        required
                      />
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-[10px] font-mono ${reviewText.trim() === '' ? 'text-slate-500' : reviewText.trim().split(/\s+/).length > 30 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                          Words: {reviewText.trim() === '' ? 0 : reviewText.trim().split(/\s+/).length}/30
                        </span>
                        {reviewText.trim() !== '' && reviewText.trim().split(/\s+/).length > 30 && (
                          <span className="text-[10px] text-rose-400 font-sans">Maximum 30 words allowed!</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={reviewSubmitting || (reviewText.trim() === '' ? 0 : reviewText.trim().split(/\s+/).length) > 30}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold py-2 px-4 rounded-xl w-full transition-all"
                    >
                      {reviewSubmitting ? 'Submitting Review...' : 'Submit Review Feedback'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-xl w-full transition-all flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Listings</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input panel */}
      <div className="bg-slate-900 md:border-x md:border-b border-t border-slate-800 p-3 sm:p-4 md:rounded-b-2xl rounded-none shrink-0">
        {sessionInfo?.status === 'queued' || sessionInfo?.status === 'pending' ? (
          <div className="bg-slate-950/60 border border-slate-850 border-dashed rounded-xl p-3.5 text-center text-xs font-mono text-slate-400">
            ⏳ Waiting in queue... You can start messaging as soon as the consultant accepts your chat.
          </div>
        ) : sessionInfo?.status === 'cancelled' || sessionInfo?.status === 'rejected' || sessionInfo?.status === 'missed' ? (
          <div className="bg-slate-950/60 border border-slate-850 border-dashed rounded-xl p-3.5 text-center text-xs font-mono text-slate-400">
            🚫 Chat is inactive. Message inputs are disabled.
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between bg-slate-950 border border-red-500/30 p-3 rounded-xl">
            <div className="flex items-center space-x-3">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs font-mono text-red-400 font-bold">
                Recording Voice Note ({Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                title="Cancel Recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-lg transition-all flex items-center justify-center"
                title="Stop & Send Voice Note"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              placeholder={sessionCompleted ? 'Session ended. Inputs disabled.' : 'Type your consultation message here...'}
              value={textInput}
              onChange={handleTextInputChange}
              disabled={sessionCompleted}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-base md:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-55"
            />
            
            {/* Consultant-only Voice Recording button */}
            {role === 'consultant' && !sessionCompleted && (
              <button
                type="button"
                onClick={startRecording}
                className="bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-slate-700 px-3.5 rounded-xl transition-all flex items-center justify-center"
                title="Record Voice Note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={sessionCompleted || !textInput.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 px-5 rounded-xl transition-all flex items-center justify-center"
            >
              <Send className="w-4 h-4 font-bold" />
            </button>
          </form>
        )}
      </div>

      {/* Busy Queue Popup Modal for Queued Users */}
      {role === 'user' && sessionInfo?.status === 'queued' && showBusyPopup && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl relative overflow-hidden animate-in zoom-in duration-200">
            <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-extrabold text-base text-amber-400">Consultant is Busy</h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                Your consultant is busy right now. You will be able to connect once the timer gets over.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl flex justify-between items-center text-left">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Queue Position</span>
                <span className="text-sm font-extrabold text-amber-400 font-mono">
                  #{userQueuePos !== null ? userQueuePos : '1'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">Wait Time</span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                  {activeChatRemainingSeconds > 0 
                    ? `${Math.floor(activeChatRemainingSeconds / 60)}m ${activeChatRemainingSeconds % 60}s` 
                    : 'Calculating...'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 justify-center w-full">
              <button
                onClick={() => setShowBusyPopup(false)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all"
              >
                Got it, wait in queue
              </button>
              <button
                onClick={handleExitQueue}
                disabled={isExitingQueue}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 disabled:opacity-50 font-bold py-2.5 px-4 rounded-xl text-xs border border-rose-500/15 transition-all"
              >
                {isExitingQueue ? 'Exiting Queue...' : 'Exit Queue & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom High-Reliability Confirmation Modal */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl relative overflow-hidden animate-in zoom-in duration-200">
            <div className="mx-auto w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-extrabold text-base text-slate-100">{confirmState.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {confirmState.message}
              </p>
            </div>

            <div className="flex gap-3 justify-center w-full pt-2">
              <button
                onClick={() => setConfirmState(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-all border border-slate-700/50"
              >
                {confirmState.cancelText || 'No, Keep Chat'}
              </button>
              <button
                onClick={() => {
                  const cb = confirmState.onConfirm;
                  setConfirmState(null);
                  cb();
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-lg shadow-rose-500/15"
              >
                {confirmState.confirmText || 'Yes, End Chat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Completed Popup Modal - Both User and Consultant */}
      {sessionCompleted && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[90] p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-6 shadow-2xl relative overflow-hidden animate-in zoom-in duration-200 my-8">
            <div className="mx-auto w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-extrabold text-lg text-emerald-400">Session Completed Successfully</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {role === 'user' 
                  ? 'Your consultation session has ended. We hope you got answer to your queries!'
                  : 'Billing countdown has run out. Net earnings have been credited to your secure wallet.'}
              </p>
            </div>

            {/* Rating Section - ONLY for user */}
            {role === 'user' && (
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-4 text-left">
                <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5 font-bold text-center">
                  RATE YOUR CONSULTATION EXPERIENCE
                </span>
                
                {reviewSubmitted ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center text-xs text-emerald-400 font-sans font-bold animate-pulse">
                    ✨ Thank you! Aapka feedback successfully submit ho gaya hai.
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    {reviewError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center text-[11px] text-rose-400 font-sans">
                        {reviewError}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider font-bold text-center">Stars Rating</label>
                      <div className="flex items-center justify-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setReviewRating(star)}
                            className={`text-2xl transition-colors ${
                              reviewRating >= star ? 'text-amber-400' : 'text-slate-700 hover:text-amber-500'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-wider font-bold">Your Written Review</label>
                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Apna anubhav share karein... (e.g. Bohat accha guidance mila, highly recommended)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[65px] font-sans"
                        required
                      />
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-[10px] font-mono ${reviewText.trim() === '' ? 'text-slate-500' : reviewText.trim().split(/\s+/).length > 30 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                          Words: {reviewText.trim() === '' ? 0 : reviewText.trim().split(/\s+/).length}/30
                        </span>
                        {reviewText.trim() !== '' && reviewText.trim().split(/\s+/).length > 30 && (
                          <span className="text-[10px] text-rose-400 font-sans">Maximum 30 words allowed!</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={reviewSubmitting || (reviewText.trim() === '' ? 0 : reviewText.trim().split(/\s+/).length) > 30}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold py-2 px-4 rounded-xl w-full transition-all"
                    >
                      {reviewSubmitting ? 'Submitting Review...' : 'Submit Review Feedback'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Go Back / Exit button inside the Session Completed Popup */}
            <button
              onClick={onClose}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-xl w-full transition-all flex items-center justify-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
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
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Profile Picture Preview</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
