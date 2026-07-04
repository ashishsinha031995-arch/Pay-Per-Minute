import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Volume2, VolumeX, AlertTriangle, Play, Square } from 'lucide-react';

interface IncomingRequestNotificationProps {
  request: {
    id: string;
    user_name: string;
    duration_minutes: number;
    price_per_minute: number;
    created_at: string;
    user_photo?: string | null;
  };
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

export const IncomingRequestNotification: React.FC<IncomingRequestNotificationProps> = ({
  request,
  onAccept,
  onReject,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Helper to calculate remaining seconds from absolute created_at timestamp (with 60 seconds limit)
  const getRemainingSeconds = () => {
    const createdTime = new Date(request.created_at).getTime();
    const now = Date.now();
    const diffSec = Math.floor((createdTime + 60 * 1000 - now) / 1000);
    return Math.min(60, Math.max(0, diffSec));
  };

  // Sync state with dynamic countdown
  useEffect(() => {
    setTimeLeft(getRemainingSeconds());
    const interval = setInterval(() => {
      const remaining = getRemainingSeconds();
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [request.created_at]);

  // Audio Ringer using Web Audio API
  useEffect(() => {
    if (isMuted) {
      stopRinger();
      return;
    }

    const startRinger = () => {
      if (ringIntervalRef.current) return;

      const playRingPulse = () => {
        try {
          if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) {
              setAudioError('AudioContext not supported in this browser.');
              return;
            }
            audioCtxRef.current = new AudioContextClass();
          }

          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') {
            ctx.resume();
          }

          const now = ctx.currentTime;

          const playTone = (startTime: number) => {
            if (!audioCtxRef.current) return;
            const osc1 = audioCtxRef.current.createOscillator();
            const osc2 = audioCtxRef.current.createOscillator();
            const gainNode = audioCtxRef.current.createGain();

            osc1.type = 'sine';
            osc1.frequency.value = 450; // Classic telephone dual frequency

            osc2.type = 'sine';
            osc2.frequency.value = 400;

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            gainNode.gain.setValueAtTime(0.15, startTime + 0.35);
            gainNode.gain.linearRampToValueAtTime(0, startTime + 0.4);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(audioCtxRef.current.destination);

            osc1.start(startTime);
            osc2.start(startTime);

            osc1.stop(startTime + 0.4);
            osc2.stop(startTime + 0.4);
          };

          // Classic double ring pattern: ring (0.4s), quiet (0.2s), ring (0.4s)
          playTone(now);
          playTone(now + 0.6);
          setAudioError(null);
        } catch (err: any) {
          console.error('Ringer play failure:', err);
          setAudioError(err.message || 'Audio playback blocked/unsupported');
        }
      };

      playRingPulse();
      ringIntervalRef.current = setInterval(playRingPulse, 3000);
    };

    startRinger();

    return () => {
      stopRinger();
    };
  }, [isMuted, request.id]);

  const stopRinger = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  // Determine progress percentage and color
  const percentage = (timeLeft / 60) * 100;
  let progressColor = 'text-emerald-500';
  let progressBg = 'bg-emerald-500/10 border-emerald-500/30';
  if (timeLeft <= 15) {
    progressColor = 'text-rose-500 animate-pulse';
    progressBg = 'bg-rose-500/20 border-rose-500/40';
  } else if (timeLeft <= 35) {
    progressColor = 'text-amber-500';
    progressBg = 'bg-amber-500/10 border-amber-500/30';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`fixed inset-0 w-full h-full min-h-[100dvh] z-[200] bg-slate-950/98 backdrop-blur-xl flex flex-col justify-between p-4 xs:p-6 sm:p-8 overflow-y-auto md:relative md:inset-auto md:z-0 md:bg-slate-950/90 md:border-2 md:p-6 md:rounded-3xl md:flex-col md:items-center md:justify-center md:gap-6 md:shadow-2xl md:overflow-hidden md:h-auto md:min-h-0 md:max-w-xl md:mx-auto select-none transition-colors duration-300 ${progressBg}`}
    >
      {/* Background Subtle Pulsing Glow */}
      <div className={`absolute inset-0 opacity-[0.03] md:opacity-[0.03] pointer-events-none transition-colors duration-300 ${timeLeft <= 15 ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />

      <div className="flex flex-col items-center justify-center text-center gap-5 relative z-10 w-full flex-1">
        
        {/* User Photo with Pulsing Active Glow (Top) */}
        <div className="relative flex flex-col items-center">
          <div className="relative">
            {/* Pulsing ring animation behind photo */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-30 blur-[2px] animate-pulse" />
            {request.user_photo ? (
              <img 
                src={request.user_photo} 
                alt={request.user_name} 
                className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-slate-900 shadow-2xl animate-fade-in"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'; }}
              />
            ) : (
              <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 text-3xl font-black shadow-2xl border-4 border-slate-900 animate-fade-in">
                {request.user_name ? request.user_name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
        </div>

        {/* User Name & Call Status Labels */}
        <div className="text-center space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3 text-rose-500" />
              Incoming Chat
            </span>
            {isMuted ? (
              <span className="text-[9px] font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">Ringer Muted</span>
            ) : (
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Ringing...
              </span>
            )}
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-slate-100 uppercase tracking-wide leading-tight max-w-sm sm:max-w-md px-4">
            {request.user_name} asks for Consultation
          </h4>
        </div>

        {/* Time (Timer Indicator) - Centered (Below user photo/name) */}
        <div className="relative flex items-center justify-center scale-110 my-3 flex-shrink-0">
          {/* Circular Countdown Progress */}
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              className="stroke-slate-800"
              strokeWidth="4"
              fill="transparent"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              className={`${progressColor} transition-all duration-1000 ease-linear`}
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={175}
              strokeDashoffset={175 - (175 * percentage) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-base font-black font-mono leading-none text-slate-100">{timeLeft}s</span>
            <span className="text-[7px] text-slate-400 font-mono font-bold uppercase mt-0.5">left</span>
          </div>
        </div>

        {/* Details - High Contrast Vibrant Color Cards for All Phones */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3.5 w-full max-w-sm sm:max-w-md mx-auto relative z-10">
          {/* Duration Card */}
          <div className="bg-sky-500/10 border border-sky-500/20 shadow-sm p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center transition-all hover:bg-sky-500/15 duration-350">
            <span className="text-[9px] sm:text-[10px] font-mono uppercase font-black text-sky-400 tracking-wider">Duration</span>
            <strong className="text-xs sm:text-sm text-sky-300 font-black mt-1 font-sans">{request.duration_minutes} Mins</strong>
          </div>

          {/* Rate Card */}
          <div className="bg-teal-500/10 border border-teal-500/20 shadow-sm p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center transition-all hover:bg-teal-500/15 duration-350">
            <span className="text-[9px] sm:text-[10px] font-mono uppercase font-black text-teal-400 tracking-wider">Rate</span>
            <strong className="text-xs sm:text-sm text-teal-300 font-black mt-1 font-sans">₹{request.price_per_minute}/m</strong>
          </div>

          {/* Est. Earn Card */}
          <div className="bg-amber-500/10 border border-amber-500/20 shadow-sm p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center transition-all hover:bg-amber-500/15 duration-350">
            <span className="text-[9px] sm:text-[10px] font-mono uppercase font-black text-amber-400 tracking-wider">Est. Earn</span>
            <strong className="text-xs sm:text-sm text-amber-300 font-black mt-1 font-sans">₹{(request.duration_minutes * request.price_per_minute * 0.9).toFixed(1)}</strong>
          </div>
        </div>

        {audioError && (
          <p className="text-[10px] text-slate-500 font-mono text-center">
            Note: Click anywhere on screen if audio ring is blocked.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-full relative z-10 justify-center mt-6 pb-safe max-w-sm sm:max-w-md mx-auto">
        {/* Mute/Unmute Toggle */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`w-full sm:w-auto p-3.5 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
            isMuted 
              ? 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          }`}
          title={isMuted ? 'Unmute Ringing Sound' : 'Mute Ringing Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="sm:hidden text-xs font-bold font-sans">Mute Ringer Sound</span>
        </button>

        <button
          onClick={onReject}
          className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 rounded-xl font-bold text-xs bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-all font-sans"
        >
          Reject Chat
        </button>

        <button
          onClick={onAccept}
          className="w-full sm:w-auto px-8 py-4 sm:py-2.5 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 transition-all font-sans shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 animate-bounce-subtle flex items-center justify-center space-x-2"
        >
          <Flame className="w-4 h-4 animate-pulse" />
          <span>Accept & Start Chat</span>
        </button>
      </div>
    </motion.div>
  );
};
