import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, MessageCircle, Phone, Video, Shield, CheckCircle, Sparkles, Zap, 
  ArrowRight, Heart, Users, ShieldCheck, HelpCircle, ArrowDown, ChevronRight, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Consultant } from '../../types';

interface CallMintLandingPageProps {
  consultants: Consultant[];
  onOpenAuth: () => void;
  onSelectConsultant: (consultant: Consultant) => void;
}

export function CallMintLandingPage({ consultants, onOpenAuth, onSelectConsultant }: CallMintLandingPageProps) {
  // 1. Social Proof Counters (Animated on Mount)
  const [usersCount, setUsersCount] = useState(0);
  const [consultationsCount, setConsultationsCount] = useState(0);
  const [expertsCount, setExpertsCount] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds animation
    const steps = 60;
    const stepTime = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setUsersCount(Math.min(100, Math.round((100 / steps) * currentStep)));
      setConsultationsCount(Math.min(50, Math.round((50 / steps) * currentStep)));
      setExpertsCount(Math.min(10, Math.round((10 / steps) * currentStep)));
      
      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, []);

  // 2. Active Category Selection
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // 10 Requested Categories
  const categories = [
    { title: 'Astrologers', label: 'Astrologer', emoji: '🔮', color: 'from-purple-500 to-indigo-500', desc: 'Predict life path & stellar alignments' },
    { title: 'Influencers', label: 'Influencer', emoji: '✨', color: 'from-pink-500 to-rose-500', desc: 'Social media growth & digital branding' },
    { title: 'Mentors', label: 'Mentor', emoji: '🎓', color: 'from-blue-500 to-cyan-500', desc: 'Career advice & personal growth guidance' },
    { title: 'Doctors', label: 'Doctor', emoji: '🩺', color: 'from-emerald-500 to-teal-500', desc: 'Wellness, health check & clinical queries' },
    { title: 'Lawyers', label: 'Lawyer', emoji: '⚖️', color: 'from-amber-500 to-orange-500', desc: 'Legal counsel & litigation consult' },
    { title: 'Singers', label: 'Singer', emoji: '🎤', color: 'from-red-500 to-pink-500', desc: 'Vocal coaching & musical creation' },
    { title: 'Advisors', label: 'Advisor', emoji: '💼', color: 'from-violet-500 to-fuchsia-500', desc: 'Finances, tax planning & asset advisory' },
    { title: 'Friends', label: 'Friend', emoji: '🤝', color: 'from-teal-500 to-emerald-400', desc: 'Deep talks, active listening & safe space' },
    { title: 'Coaches', label: 'Coach', emoji: '🏋️', color: 'from-sky-500 to-indigo-600', desc: 'Fitness, sports & life goal strategies' },
    { title: 'Consultants', label: 'Consultant', emoji: '💡', color: 'from-emerald-400 to-teal-500', desc: 'Expert business structure & scaling' }
  ];

  // Animated particle backdrop
  const particles = Array.from({ length: 15 });

  // Testimonials Auto Slider
  const testimonials = [
    {
      name: "Rohit Sharma",
      role: "Startup Founder",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      rating: 5,
      text: "CallMint changed my business completely. I connected with a premium growth mentor in under 30 seconds and solved our seed funding strategy on the spot. Highly professional!"
    },
    {
      name: "Ananya Patel",
      role: "Digital Creator",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      rating: 5,
      text: "As an influencer, my fans wanted to talk to me privately. The per-minute voice calling setup makes it extremely clean, respectful of my time, and very lucrative!"
    },
    {
      name: "Vikram Malhotra",
      role: "Corporate Lawyer",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      rating: 5,
      text: "The audio clarity is fantastic and billing is fully transparent. Clients appreciate the instant connection without booking weeks in advance. Excellent platform!"
    },
    {
      name: "Sneha Reddy",
      role: "Fitness Enthusiast",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      rating: 5,
      text: "Instantly got connected to an expert sports nutritionist. We did a 15-minute video call and prepared my diet plan. It is faster than visiting any clinic. Super loved!"
    }
  ];

  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filter out any invalid or inactive consultants to show live active ones
  const liveActiveConsultants = consultants
    .filter(c => c.is_online === 1)
    .slice(0, 3);

  // If none are online, fall back to first 3
  const displayedConsultants = liveActiveConsultants.length > 0 ? liveActiveConsultants : consultants.slice(0, 3);

  return (
    <div className="w-full relative overflow-hidden bg-slate-950 text-slate-100 flex flex-col items-center">
      
      {/* 3D Glowing Animated Particle Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {particles.map((_, i) => (
          <div 
            key={i} 
            className="absolute rounded-full bg-emerald-500/10 blur-xl animate-pulse"
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 6 + 4}s`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
        {/* Abstract animated grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#020617_95%)] opacity-80" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
      </div>

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative z-10 w-full max-w-7xl px-4 pt-10 pb-20 md:py-24 flex flex-col lg:grid lg:grid-cols-12 gap-12 items-center min-h-[90vh]">
        
        {/* Left column: Content */}
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          
          {/* Accent Chip */}
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400 font-mono tracking-wider animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INDIA'S #1 PAID 1-ON-1 ADVISORY</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-100 leading-none tracking-tight">
            Talk One-on-One with Your{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent drop-shadow-sm">
              Favorite Experts
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
            Instantly connect through Chat, Voice Call or Video Call with trusted professionals and creators anytime, anywhere. 
            Enjoy seamless pay-per-minute billing and absolute call confidentiality.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
            <button
              onClick={onOpenAuth}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2 transform hover:-translate-y-1 active:translate-y-0 group"
            >
              <span>Start Talking Now</span>
              <ArrowRight className="w-4 h-4 text-slate-950 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('switch-to-consultant-tab'));
              }}
              className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-850 text-emerald-400 border border-emerald-500/10 hover:border-emerald-500/30 transition-all font-extrabold text-sm tracking-wide cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Become a Consultant</span>
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            </button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 max-w-lg mx-auto lg:mx-0">
            {[
              { text: 'Secure Platform', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
              { text: 'Verified Experts', icon: <CheckCircle className="w-4 h-4 text-emerald-400" /> },
              { text: 'Instant Connect', icon: <Zap className="w-4 h-4 text-emerald-400" /> },
              { text: 'Private Talks', icon: <Heart className="w-4 h-4 text-emerald-400" /> }
            ].map((badge, idx) => (
              <div key={idx} className="flex items-center space-x-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-850/60 justify-center">
                {badge.icon}
                <span className="text-[10px] text-slate-300 font-bold tracking-tight">{badge.text}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Right column: 3D Connected Visualization centerpiece */}
        <div className="lg:col-span-6 flex items-center justify-center relative w-full h-[320px] md:h-[450px]">
          
          {/* Animated 3D depth circles */}
          <div className="absolute w-[240px] h-[240px] md:w-[360px] md:h-[360px] rounded-full border border-dashed border-emerald-500/10 animate-[spin_40s_linear_infinite]" />
          <div className="absolute w-[180px] h-[180px] md:w-[260px] md:h-[260px] rounded-full border border-emerald-500/5 animate-[spin_20s_linear_infinite_reverse]" />
          
          {/* Central floating glowing smartphone 3D effect */}
          <div className="absolute w-36 h-64 md:w-44 md:h-76 bg-slate-900/80 rounded-[28px] border-2 border-emerald-500/20 backdrop-blur-md shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col justify-between p-3.5 z-20 animate-[bounce_4s_ease-in-out_infinite]">
            
            {/* Top camera pill */}
            <div className="w-12 h-3.5 bg-slate-950 rounded-full mx-auto border border-slate-800 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
            </div>

            {/* Mock Chat interface inside smartphone */}
            <div className="flex-1 my-3 bg-slate-950/80 border border-slate-850 rounded-2xl p-2 flex flex-col justify-between overflow-hidden relative font-sans">
              <div className="space-y-1.5 text-[8px] leading-snug">
                <div className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-xl border border-emerald-500/15 max-w-[85%] animate-[fade-in_1s_ease-out]">
                  Namaste, main aapki stellar journey kaise guide karu? 🔮
                </div>
                <div className="bg-slate-900 text-slate-300 p-1.5 rounded-xl border border-slate-800 max-w-[85%] self-end ml-auto text-right">
                  Let's do a voice call now! 📞
                </div>
                <div className="bg-emerald-500/20 text-emerald-300 p-1 rounded-full border border-emerald-500/20 text-center text-[7px] font-mono tracking-widest uppercase">
                  ⭐ CONNECTING LIVE...
                </div>
              </div>
              
              {/* Active Call footer inside mockup */}
              <div className="flex justify-around items-center pt-1 border-t border-slate-900">
                <span className="p-1 bg-rose-500/20 text-rose-400 rounded-full"><Phone className="w-2.5 h-2.5" /></span>
                <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full"><Video className="w-2.5 h-2.5 animate-pulse" /></span>
                <span className="p-1 bg-slate-800 text-slate-400 rounded-full"><MessageCircle className="w-2.5 h-2.5" /></span>
              </div>
            </div>

            {/* Bottom bar indicator */}
            <div className="w-12 h-1 bg-slate-850 rounded-full mx-auto" />
          </div>

          {/* Connected floating category 3D Avatars */}
          {categories.slice(0, 8).map((cat, index) => {
            // Distribute circularly
            const angle = (index * (360 / 8)) * (Math.PI / 180);
            const radius = typeof window !== 'undefined' && window.innerWidth < 768 ? 100 : 155;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div 
                key={cat.title} 
                className="absolute z-30 flex flex-col items-center group cursor-pointer animate-[bounce_5s_ease-in-out_infinite]"
                style={{ 
                  transform: `translate(${x}px, ${y}px)`,
                  animationDelay: `${index * 0.4}s`
                }}
              >
                {/* Connector lines to central smartphone */}
                <svg className="absolute -z-10 w-44 h-44 overflow-visible pointer-events-none" style={{ transform: `translate(${-x}px, ${-y}px)` }}>
                  <line 
                    x1="88" 
                    y1="88" 
                    x2={88 + x} 
                    y2={88 + y} 
                    stroke="rgba(16,185,129,0.12)" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4"
                    className="group-hover:stroke-emerald-400/30 transition-colors"
                  />
                </svg>

                {/* Circular Glass avatar frame */}
                <div className="relative w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center p-0.5 border border-slate-800 hover:border-emerald-500/60 bg-slate-900/80 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:scale-115 transition-all">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${cat.color} opacity-10 absolute inset-0 rounded-full`} />
                  <span className="text-xl md:text-2xl relative z-10">{cat.emoji}</span>
                  
                  {/* Glowing online indicator */}
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-ping" />
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                </div>
                
                {/* Floating label */}
                <span className="mt-1.5 px-2 py-0.5 bg-slate-950/80 text-[8px] md:text-[9px] font-extrabold text-slate-300 border border-slate-850 rounded-full opacity-80 group-hover:opacity-100 group-hover:text-emerald-400 transition-all font-mono tracking-wider shadow-sm uppercase">
                  {cat.label}
                </span>
              </div>
            );
          })}

          {/* Floating UI Elements: Video, Voice, AI, Verified */}
          <div className="absolute top-6 left-1/4 bg-slate-900/90 border border-emerald-500/20 px-3 py-1.5 rounded-2xl flex items-center space-x-1.5 shadow-lg animate-bounce z-10 text-[10px] text-emerald-400 font-extrabold tracking-wider">
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span>HD VIDEO</span>
          </div>

          <div className="absolute bottom-6 right-1/4 bg-slate-900/90 border border-emerald-500/20 px-3 py-1.5 rounded-2xl flex items-center space-x-1.5 shadow-lg animate-[bounce_5s_ease-in-out_infinite_1s] z-10 text-[10px] text-emerald-400 font-extrabold tracking-wider">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>CLEAR VOICE</span>
          </div>

        </div>

      </section>

      {/* ==================== SOCIAL PROOF METRICS ==================== */}
      <section className="relative z-10 w-full bg-slate-950/85 border-y border-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-6">
            Trusted by Thousands of Users in India & Globally
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 text-center">
            
            {/* KPI 1 */}
            <div className="space-y-1">
              <strong className="text-3xl md:text-4xl font-black text-slate-100 font-mono tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                {usersCount}K+
              </strong>
              <p className="text-xs font-bold text-slate-400">Happy Clients</p>
              <span className="text-[9px] text-slate-500 block font-mono">Signups registered</span>
            </div>

            {/* KPI 2 */}
            <div className="space-y-1">
              <strong className="text-3xl md:text-4xl font-black text-slate-100 font-mono tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                {consultationsCount}K+
              </strong>
              <p className="text-xs font-bold text-slate-400">Consultations Held</p>
              <span className="text-[9px] text-slate-500 block font-mono">Completed voice & video</span>
            </div>

            {/* KPI 3 */}
            <div className="space-y-1">
              <strong className="text-3xl md:text-4xl font-black text-slate-100 font-mono tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                {expertsCount}K+
              </strong>
              <p className="text-xs font-bold text-slate-400">Verified Consultants</p>
              <span className="text-[9px] text-slate-500 block font-mono">Expert panel list</span>
            </div>

            {/* KPI 4 */}
            <div className="space-y-1">
              <strong className="text-3xl md:text-4xl font-black text-amber-400 font-mono tracking-tight flex items-center justify-center gap-1">
                4.9★
              </strong>
              <p className="text-xs font-bold text-slate-400">Average Review Rating</p>
              <span className="text-[9px] text-slate-500 block font-mono">Client feedback score</span>
            </div>

          </div>
        </div>
      </section>

      {/* ==================== CONSULTANT CATEGORIES (3D Floating Glass Cards) ==================== */}
      <section className="relative z-10 w-full max-w-7xl px-4 py-20 space-y-12">
        
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
            Specialist Niches
          </span>
          <h2 className="text-2xl md:text-4xl font-black text-slate-100">
            Browse Top-Tier Professionals by Category
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto">
            Find certified consultants and famous creators covering astrology, medicine, law, wellness, entertainment, and coaching.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat, idx) => {
            const isHovered = hoveredCategory === cat.title;
            return (
              <div
                key={cat.title}
                onMouseEnter={() => setHoveredCategory(cat.title)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={onOpenAuth}
                className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-850 hover:border-emerald-500/40 p-5 flex flex-col justify-between h-44 text-left transition-all duration-300 shadow-sm"
                style={{
                  transform: isHovered ? 'translateY(-5px) scale(1.02)' : 'none',
                  boxShadow: isHovered ? '0 10px 30px -10px rgba(16,185,129,0.15)' : 'none'
                }}
              >
                {/* Simulated 3D glow overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none`} />
                <div className="absolute top-2 right-2 text-slate-800 font-black text-5xl select-none group-hover:text-emerald-500/10 transition-colors">
                  {idx + 1}
                </div>

                {/* Top: 3D-like Icon Frame */}
                <div className="w-11 h-11 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center text-2xl relative">
                  <span className="transform group-hover:rotate-[15deg] transition-transform duration-300">{cat.emoji}</span>
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-tr ${cat.color} opacity-10 group-hover:scale-110 transition-transform`} />
                </div>

                {/* Bottom: Label & Description */}
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors text-sm">
                    {cat.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-snug">
                    {cat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="relative z-10 w-full max-w-7xl px-4 py-16 space-y-12 bg-slate-950/30 border-t border-slate-900">
        
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
            3-Step Onboarding
          </span>
          <h2 className="text-2xl md:text-4xl font-black text-slate-100">
            How It Works — Simple & Fast
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto">
            Connecting privately with verified professionals around the world takes less than 60 seconds.
          </p>
        </div>

        {/* Curved animated timeline grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          
          {/* Connector lines (Desktop) */}
          <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/30 to-teal-500/10 -z-10" />

          {[
            { step: '01', title: 'Choose Your Expert', desc: 'Browse our categories list and pick an online advisor of your preference.', emoji: '🔍' },
            { step: '02', title: 'Select Chat, Voice or Video', desc: 'Specify consultation duration (10, 15, or 30 minutes) and media format.', emoji: '💬' },
            { step: '03', title: 'Pay Securely', desc: 'Add balance via secured Razorpay Sandboxed payment gateway seamlessly.', emoji: '💳' },
            { step: '04', title: 'Start One-on-One', desc: 'Get connected instantly in our live responsive custom-built web chatroom.', emoji: '🚀' }
          ].map((item, index) => (
            <div key={item.step} className="bg-slate-900/40 rounded-2xl border border-slate-850 p-6 space-y-4 hover:border-slate-700 transition-all text-center relative group">
              <span className="absolute top-4 right-4 text-[10px] font-mono font-bold text-slate-600 group-hover:text-emerald-400 transition-colors">
                STEP {item.step}
              </span>

              {/* 3D Circular frame containing step emoji */}
              <div className="w-12 h-12 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center text-xl mx-auto shadow-md relative">
                <span>{item.emoji}</span>
                <span className="absolute inset-0 rounded-full bg-emerald-500/5 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-200 text-sm group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}

        </div>

      </section>

      {/* ==================== FEATURES SECTION (Glassmorphism feature cards) ==================== */}
      <section className="relative z-10 w-full max-w-7xl px-4 py-20 space-y-12">
        
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
            Key Architecture
          </span>
          <h2 className="text-2xl md:text-4xl font-black text-slate-100">
            Engineered for Security, Speed & Stability
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto">
            Experience absolute peace of mind during your paid consultations through our state-of-the-art framework.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Verified Consultants', desc: 'Strict verification of professional credentials, identity, and background before approval.', icon: '🛡️' },
            { title: 'Private Conversations', desc: 'End-to-end encrypted messaging channels and secure private WebRTC voice & video networks.', icon: '🔒' },
            { title: 'AI Smart Matching', desc: 'Get matched with perfect available experts based on your budget, reviews, and current problems.', icon: '✨' },
            { title: 'Instant Availability', desc: 'No queue models. Call and speak with online consultants on a single click in real-time.', icon: '⚡' },
            { title: 'HD Video Calling', desc: 'High-definition WebRTC video connection optimized for low-bandwidth mobile networks.', icon: '📹' },
            { title: 'Crystal Clear Voice', desc: 'Noise-canceling spatial voice streams that ensure high audio quality on every consultation.', icon: '🎙️' },
            { title: 'Fast Chat', desc: 'Ultra-low-latency persistent Socket.IO chat servers supporting rapid texting, media exchange.', icon: '💬' },
            { title: 'Secure Payments', desc: 'Razorpay Sandbox payments. Secure automated per-minute refund/deduction wallet engine.', icon: '💳' },
            { title: 'Affordable Pricing', desc: 'Transparent pay-per-minute billing from ₹10/min. Know exactly how much you are spending.', icon: '💎' },
            { title: '24×7 Support', desc: 'Dedicated customer support tickets helpdesk managed directly through admin panels.', icon: '🌟' }
          ].slice(0, 9).map((feat) => (
            <div key={feat.title} className="bg-slate-900/35 backdrop-blur-sm rounded-3xl border border-slate-850 p-6 flex flex-col justify-between h-48 hover:border-slate-700 transition-all group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center text-lg shadow-sm">
                  {feat.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ==================== LIVE CONSULTANT SHOWCASE ==================== */}
      <section className="relative z-10 w-full max-w-7xl px-4 py-16 space-y-12 border-t border-slate-900 bg-slate-950/20">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
              Live Showcase
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-100">
              Meet Top Experts Online Right Now
            </h2>
            <p className="text-xs text-slate-400 max-w-lg">
              Connect instantly with online advisers. Click on "Available Now" to start chatting or call.
            </p>
          </div>

          <button
            onClick={onOpenAuth}
            className="self-center md:self-end px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 transition-all font-extrabold text-xs text-slate-300 cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <span>See All Online Advisors</span>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Live Consultants Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayedConsultants.map((cons) => (
            <div
              key={cons.id}
              className="bg-slate-900 rounded-3xl border border-slate-850 p-5 flex flex-col justify-between hover:border-slate-700 transition-all hover:-translate-y-1 shadow-md"
            >
              <div className="space-y-4">
                {/* Header: Photo and Online Tag */}
                <div className="flex justify-between items-start">
                  <div className="relative">
                    {cons.photo_url ? (
                      <img 
                        src={cons.photo_url} 
                        alt={cons.display_name} 
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-800"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl font-bold text-emerald-400 font-mono">
                        {cons.display_name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                  </div>
                  
                  {/* Status Indicator */}
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full font-bold font-mono uppercase tracking-wider">
                    Online Now
                  </span>
                </div>

                {/* Name & Speciality */}
                <div className="space-y-1">
                  <h4 
                    onClick={() => onSelectConsultant(cons)}
                    className="font-extrabold text-slate-100 text-base flex items-center gap-1.5 cursor-pointer hover:text-emerald-400 hover:underline transition-all duration-150"
                  >
                    <span>{cons.display_name}</span>
                    <span className="text-xs">✅</span>
                  </h4>
                  <span className="inline-block text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/15 font-bold">
                    {(cons as any).category || 'Consultant'}
                  </span>
                </div>

                {/* Quick Info (Rating / Experience) */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-850 font-mono text-xs text-slate-400">
                  <div className="flex items-center space-x-1 justify-center">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-extrabold text-slate-200">{(cons as any).rating_avg || '4.9'}</span>
                  </div>
                  <div className="text-center border-l border-slate-850">
                    <span className="text-slate-200">{(cons as any).experience_years || '5'}+ Yrs</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">
                  {cons.bio || 'Professional adviser ready to consult and guide with customized options.'}
                </p>
              </div>

              {/* Price & CTA Button */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-850">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block uppercase">Charging Rate</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">₹{cons.price_per_minute}/min</span>
                </div>
                <button
                  onClick={() => {
                    onSelectConsultant(cons);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center space-x-1 shadow-sm active:scale-95 cursor-pointer"
                >
                  <span>Connect Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ==================== WHY USERS LOVE US ==================== */}
      <section className="relative z-10 w-full max-w-7xl px-4 py-20 flex flex-col lg:grid lg:grid-cols-12 gap-12 items-center">
        
        {/* Left: simulated 3D visual */}
        <div className="lg:col-span-6 relative flex justify-center w-full h-[320px] md:h-[400px]">
          {/* Beautiful 3D geometry layers representing a safety box / wallet */}
          <div className="absolute w-52 h-52 bg-slate-900 border-2 border-emerald-500/30 rounded-3xl backdrop-blur-md shadow-2xl z-10 rotate-[12deg] flex items-center justify-center animate-[bounce_6s_ease-in-out_infinite]">
            <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              <ShieldCheck className="w-12 h-12" />
            </div>
          </div>
          <div className="absolute w-44 h-44 bg-slate-950 border border-slate-800 rounded-3xl backdrop-blur-sm shadow-xl z-0 -rotate-[8deg] top-12 left-12 opacity-60 flex flex-col justify-end p-4">
            <span className="text-emerald-400 font-mono text-[11px] font-bold">100% SECURE</span>
            <span className="text-slate-500 text-[9px] leading-tight">Razorpay verified server</span>
          </div>
          <div className="absolute w-36 h-36 bg-slate-950 border border-slate-850 rounded-3xl backdrop-blur-sm shadow-md z-0 rotate-[24deg] bottom-6 right-12 opacity-40 flex items-center justify-center text-4xl">
            🔒
          </div>
        </div>

        {/* Right: Benefits */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3 text-center lg:text-left">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
              Core Benefits
            </span>
            <h2 className="text-2xl md:text-4xl font-black text-slate-100">
              Why CallMint is Loved by Thousands
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              We design our infrastructure around safety, premium expert quality, and clear transparent user pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Instant Connection', desc: 'No complex scheduling required. Press connect and consult instantly.' },
              { title: 'Real Human Experts', desc: 'Every adviser undergoes manual verification checking of certificates.' },
              { title: 'Safe & Secure', desc: 'Compliant Razorpay Sandboxed payment nodes and real-time ledger sync.' },
              { title: 'Affordable Rates', desc: 'We support low per-minute rates from ₹10/min, giving complete budget control.' },
              { title: 'Personalized Guidance', desc: 'Deep custom advice tailor-made for your unique planetary, health, or legal profile.' },
              { title: 'Anytime Access', desc: 'Online advisors are logged in 24 hours a day, keeping consultation ready.' }
            ].map((benefit) => (
              <div key={benefit.title} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-850 space-y-2">
                <h4 className="font-extrabold text-slate-200 text-xs flex items-center space-x-1.5">
                  <span className="text-emerald-400">✓</span>
                  <span>{benefit.title}</span>
                </h4>
                <p className="text-[11px] text-slate-500 leading-normal font-medium">
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* ==================== TESTIMONIALS (Auto Sliding Glass Cards) ==================== */}
      <section className="relative z-10 w-full max-w-4xl px-4 py-16 space-y-8 text-center border-t border-slate-900">
        
        <div className="space-y-3">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase font-bold tracking-widest">
            Client Feedback
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-100">
            What Our Clients Are Saying
          </h2>
        </div>

        {/* Sliding card */}
        <div className="relative h-60 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {testimonials.map((test, index) => {
              if (index !== activeTestimonial) return null;
              return (
                <motion.div
                  key={test.name}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="absolute w-full max-w-2xl bg-slate-900/60 backdrop-blur-sm rounded-3xl border border-slate-800 p-6 md:p-8 space-y-4 shadow-lg text-center"
                >
                  <div className="flex justify-center space-x-0.5">
                    {Array.from({ length: test.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>

                  <p className="text-xs md:text-sm text-slate-300 italic leading-relaxed max-w-lg mx-auto font-medium">
                    "{test.text}"
                  </p>

                  <div className="flex items-center justify-center space-x-3 pt-2">
                    <img 
                      src={test.avatar} 
                      alt={test.name} 
                      className="w-10 h-10 rounded-full object-cover border border-slate-800"
                    />
                    <div className="text-left">
                      <h5 className="font-extrabold text-slate-100 text-xs">{test.name}</h5>
                      <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">{test.role}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center space-x-2 pt-4">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTestimonial(idx)}
              className={`h-2 rounded-full transition-all ${idx === activeTestimonial ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-800'}`}
            />
          ))}
        </div>

      </section>

      {/* ==================== CALL TO ACTION SECTION ==================== */}
      <section className="relative z-10 w-full max-w-5xl px-4 py-16 text-center">
        
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-[36px] p-8 md:p-14 overflow-hidden shadow-2xl flex flex-col items-center space-y-6">
          {/* Glowing 3D Abstract Object overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase font-bold tracking-widest animate-pulse">
            INSTANT ACCESS CALLS
          </span>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-100 max-w-2xl leading-tight">
            Your Favorite Expert is Just One Click Away.
          </h2>

          <p className="text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed font-medium">
            Sign up now and get immediate access to top mentors, consultants, and creators. Absolute transparency, secured wallet ledger, and clear audio calling.
          </p>

          <button
            onClick={onOpenAuth}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl font-black text-sm tracking-wide shadow-lg cursor-pointer transition-all flex items-center space-x-2 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Start Consultation Now</span>
          </button>
        </div>

      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="relative z-10 w-full max-w-7xl px-4 py-8 border-t border-slate-900/60 mt-12 text-slate-500 text-xs font-mono">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="space-y-1">
            <span className="font-extrabold text-slate-300 tracking-tight text-sm flex items-center justify-center md:justify-start gap-1">
              <span>🍃</span> CallMint
            </span>
            <p className="text-[10px] text-slate-500 leading-normal">
              © 2026 CallMint Inc. All rights reserved. Razorpay Sandboxed payment gateway.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-bold text-slate-400">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Support Center</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
