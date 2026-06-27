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
      className={`border-2 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xl relative overflow-hidden transition-colors duration-300 ${progressBg}`}
    >
      {/* Background Subtle Pulsing Glow */}
      <div className={`absolute inset-0 opacity-[0.03] pointer-events-none transition-colors duration-300 ${timeLeft <= 15 ? 'bg-rose-500 animate-ping' : 'bg-amber-500'}`} />

      <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full md:w-auto">
        {/* Animated Icon & Dynamic Timer Indicator */}
        <div className="relative flex items-center justify-center">
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
            <span className="text-base font-black font-mono leading-none">{timeLeft}s</span>
            <span className="text-[7px] text-slate-400 font-mono font-bold uppercase mt-0.5">left</span>
          </div>
        </div>

        <div className="text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
              <Flame className="w-3 h-3 text-rose-500" />
              Incoming Call
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
          <h4 className="text-base font-black text-slate-100">
            {request.user_name} asks for Consultation
          </h4>
          <p className="text-xs text-slate-400 mt-1 font-mono flex items-center justify-center sm:justify-start gap-1">
            <span>Duration:</span>
            <strong className="text-slate-200">{request.duration_minutes} Mins</strong>
            <span className="text-slate-600">•</span>
            <span>Rate:</span>
            <strong className="text-emerald-400">₹{request.price_per_minute}/min</strong>
            <span className="text-slate-600">•</span>
            <span>Est. Earn:</span>
            <strong className="text-emerald-400">₹{(request.duration_minutes * request.price_per_minute * 0.9).toFixed(1)}</strong>
          </p>
          {audioError && (
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Note: Click anywhere on screen if audio ring is blocked.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full md:w-auto relative z-10 justify-end">
        {/* Mute/Unmute Toggle */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`p-2.5 rounded-xl border transition-all ${
            isMuted 
              ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          }`}
          title={isMuted ? 'Unmute Ringing Sound' : 'Mute Ringing Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onReject}
          className="flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-all font-sans"
        >
          Reject
        </button>

        <button
          onClick={onAccept}
          className="flex-1 md:flex-none px-5 py-2.5 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 transition-all font-sans shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 animate-bounce-subtle"
        >
          Accept & Start Chat
        </button>
      </div>
    </motion.div>
  );
};
