import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, Clock, User, Sparkles, MessageSquare, AlertTriangle, ArrowLeft, Check, CheckCheck, CheckCircle, ShieldAlert, XCircle, Ban, Mic, Square, Trash2 } from 'lucide-react';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  
  // Real-time socket states
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionTranscript, setSessionTranscript] = useState<string | null>(null);

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
        
        if (data.session.status === 'completed') {
          setSessionCompleted(true);
          setSessionTranscript(data.session.transcript);
        }
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

    // Join room
    socket.emit('join:room', { session_id: sessionId, role, username: userName });

    // Connection success indicator
    socket.on('connect', () => {
      console.log('Chat socket connected successfully!');
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
    });

    // Messages Read receipt
    socket.on('messages:read_receipt', ({ reader_type }) => {
      if (reader_type !== role) {
        // Partner read our messages! Update local read states
        setMessages(prev => prev.map(m => m.sender_type === role ? { ...m, is_read: 1 } : m));
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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [sessionId, role, userName]);

  // 3. Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = textInput.trim();
    const isInactive = sessionCompleted || sessionInfo?.status === 'rejected' || sessionInfo?.status === 'missed';
    if (!textToSend || isInactive) return;

    // Clear input immediately to make UI responsive
    setTextInput('');

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
        // Fallback to socket emit in case HTTP fails
        if (socketRef.current) {
          socketRef.current.emit('send:message', {
            session_id: sessionId,
            sender_type: role,
            sender_name: userName,
            text: textToSend,
          });
        }
      }
    } catch (err) {
      console.error('REST message send failed, trying socket fallback:', err);
      if (socketRef.current) {
        socketRef.current.emit('send:message', {
          session_id: sessionId,
          sender_type: role,
          sender_name: userName,
          text: textToSend,
        });
      }
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
    const isInactive = sessionCompleted || sessionInfo?.status === 'rejected' || sessionInfo?.status === 'missed';
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-[calc(100vh-100px)] flex flex-col justify-between">
      
      {/* Session Title Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-t-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-950 p-2.5 rounded-xl text-emerald-400 border border-slate-800 flex-shrink-0">
            {role === 'user' ? <Sparkles className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">
              {role === 'user' ? sessionInfo?.consultant_name : sessionInfo?.user_name}
            </h3>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${partnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className="text-[10px] text-slate-400 font-sans">
                {partnerOnline ? 'Connected' : 'Waiting for partner...'}
              </span>
              <span className="text-slate-700">•</span>
              <span className="text-[10px] text-slate-500 font-mono">
                Tariff: ₹{sessionInfo?.price_per_minute || '--'}/min
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons & Countdown display */}
        <div className="flex items-center flex-wrap gap-2">
          {/* User End Chat option */}
          {!sessionCompleted && sessionInfo && (sessionInfo.status === 'active' || sessionInfo.status === 'pending') && (
            <div className="flex items-center space-x-2">
              {role === 'user' && (
                <button
                  id="user-end-chat-btn"
                  onClick={async () => {
                    if (!window.confirm('Kya aap sach mein is consultation ko end karna chahte hain? (Are you sure you want to end this consultation?)')) return;
                    try {
                      setIsEnding(true);
                      const res = await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' });
                      if (res.ok) {
                        setToastMessage({ type: 'success', text: 'Consultation ended successfully.' });
                      } else {
                        const errData = await res.json();
                        alert(errData.error || 'Failed to end session');
                      }
                    } catch (err) {
                      console.error('Error manual ending:', err);
                    } finally {
                      setIsEnding(false);
                    }
                  }}
                  disabled={isEnding}
                  className="bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>End Chat</span>
                </button>
              )}

              {/* Consultant Block Option */}
              {role === 'consultant' && (
                <div className="flex items-center space-x-1.5">
                  <button
                    id="consultant-block-btn"
                    onClick={async () => {
                      const uName = sessionInfo.user_name;
                      if (!window.confirm(`Kya aap "${uName}" ko block karna chahte hain? Woh aapse dubara chat nahi kar payenge aur yeh session end ho jayega.`)) return;
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
                          // 2. End current session
                          await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' });
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
                    }}
                    disabled={isBlocking}
                    className="bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-850 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center space-x-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Block User</span>
                  </button>

                  <button
                    id="consultant-end-chat-btn"
                    onClick={async () => {
                      if (!window.confirm('Kya aap is session ko end karna chahte hain?')) return;
                      try {
                        setIsEnding(true);
                        const res = await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' });
                        if (res.ok) {
                          setToastMessage({ type: 'success', text: 'Session manually completed.' });
                        }
                      } catch (err) {
                        console.error('Error ending:', err);
                      } finally {
                        setIsEnding(false);
                      }
                    }}
                    disabled={isEnding}
                    className="bg-slate-850 hover:bg-slate-850/80 text-slate-300 font-semibold text-xs px-3 py-2 rounded-xl transition-all"
                  >
                    End Session
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Countdown display */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-850 px-3.5 py-2 rounded-xl text-rose-400">
            <Clock className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <div className="text-xs font-black font-mono tracking-wider">
              {sessionInfo?.status === 'pending' ? (
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Pending Accept</span>
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
      <div className="flex-1 bg-slate-950 border-x border-slate-900 p-6 overflow-y-auto space-y-4 min-h-[300px]">
        
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
            {sessionInfo?.status === 'active' ? (
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
                <div className="w-8 h-8 rounded-full border border-slate-800/80 overflow-hidden bg-slate-950 shrink-0 self-start mt-1 shadow">
                  <img
                    src={avatarSrc}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

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
                        {msg.is_read === 1 ? (
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
            <span>Advisor partner typing...</span>
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
      <div className="bg-slate-900 border-x border-b border-slate-800 p-4 rounded-b-2xl">
        {isRecording ? (
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
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-55"
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

    </div>
  );
}
