import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, GraduationCap, ArrowRight, ArrowLeft,
  Zap, ChevronRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { Lecture } from '../types';

interface IntroViewProps {
  onEnterApp: () => void;
  onSelectLecture?: (lectureId: string) => void;
  recentLecture?: Lecture;
}

export const IntroView: React.FC<IntroViewProps> = ({
  onEnterApp,
  onSelectLecture,
  recentLecture
}) => {
  const { isAr, dir } = useLanguage();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse move listener for dynamic spotlight aura
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Interactive Neural Particle Network on HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle nodes
    const particleCount = Math.min(75, Math.floor(width / 20));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      radius: Math.random() * 2 + 1,
      baseAlpha: Math.random() * 0.45 + 0.25
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw particle connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Draw node
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p1.baseAlpha})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist / 140) * 0.22;
            ctx.strokeStyle = `rgba(129, 140, 248, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      dir={dir}
      className="relative min-h-screen w-full bg-[#080B11] text-slate-100 overflow-x-hidden flex flex-col font-sans selection:bg-blue-500 selection:text-white justify-between"
    >
      {/* ─── Canvas Particle Background ─────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0 opacity-40 dark:opacity-60"
      />

      {/* ─── Radial Glow Following Cursor ──────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 opacity-60"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 246, 0.14), rgba(99, 102, 241, 0.06), transparent 70%)`
        }}
      />

      {/* ─── Atmospheric Ambient Glows ───────────────────────────────── */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none z-0 animate-pulse duration-1000" />
      <div className="absolute top-[35%] right-[-100px] w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-[10%] left-[-100px] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* ─── Top Navigation Bar ─────────────────────────────────────── */}
      <header className="relative z-20 w-full px-6 sm:px-12 py-5 flex items-center justify-between border-b border-slate-800/60 bg-[#080B11]/70 backdrop-blur-xl">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-[1px] shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-[#0B0F19] rounded-[15px] flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-widest text-white font-serif uppercase">
              ATTOCUS
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {isAr ? 'المنصة الأكاديمية الذكية' : 'Intelligent Academic Platform'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-slate-800 ps-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>

          {/* Quick Skip to Workspace */}
          <button
            type="button"
            id="intro-dashboard-btn"
            onClick={onEnterApp}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer"
          >
            <span>{isAr ? 'لوحة التحكم' : 'Dashboard'}</span>
            {isAr ? <ArrowLeft className="w-3.5 h-3.5 text-blue-400" /> : <ArrowRight className="w-3.5 h-3.5 text-blue-400" />}
          </button>
        </div>
      </header>

      {/* ─── Hero Presentation ──────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-12 lg:py-24 text-center max-w-4xl mx-auto space-y-10 my-auto">

        {/* Innovation Badge (بدون دائرة) */}
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-cyan-500/10 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-medium shadow-inner animate-in fade-in slide-in-from-top-4 duration-700">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>{isAr ? 'مستقبل المذاكرة المبنية على الفهم لا الحفظ' : 'The Socratic Intelligence Era in Modern Learning'}</span>
        </div>

        {/* Dynamic Grand Title: ATTOCUS */}
        <div className="relative space-y-5">
          {/* Subtle Backglow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-cyan-500/20 rounded-3xl blur-3xl opacity-60 transition-opacity duration-500" />

          <h1 dir="ltr" className="relative text-6xl sm:text-8xl lg:text-9xl font-black tracking-tight font-serif uppercase leading-none select-none inline-block">
            <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-2xl">
              ATT
            </span>
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-2xl">
              OCUS
            </span>
          </h1>

          {/* Name Origin: Attention + Focus */}
          <div className="relative flex items-center justify-center">
            <div dir="ltr" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/90 backdrop-blur-md shadow-lg shadow-black/40 text-xs sm:text-sm font-mono tracking-wider">
              <span className="text-slate-300 font-semibold">Attention</span>
              <span className="text-blue-400 font-bold text-sm leading-none">+</span>
              <span className="text-cyan-300 font-semibold">Focus</span>
            </div>
          </div>

          {/* Slogan */}
          <p className="relative text-base sm:text-xl lg:text-2xl font-light text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {isAr ? (
              <>
                حيث يلتقي <span className="font-semibold text-white">التركيز الذهني العميق</span> بالذكاء التفاعلي{' '}
                لبناء استيعاب راسخ وتلخيص بأسلوبك الخاص.
              </>
            ) : (
              <>
                Where <span className="font-semibold text-white">deep mental focus</span> meets{' '}
                <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  interactive intelligence
                </span>{' '}
                to forge permanent academic comprehension.
              </>
            )}
          </p>
        </div>

        {/* Primary Call-to-Action (دخول المنصة فقط) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm pt-4">
          <button
            type="button"
            id="launch-attocus-btn"
            onClick={onEnterApp}
            className="w-full group relative inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 text-white font-bold text-base shadow-2xl shadow-blue-600/30 hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-300 fill-cyan-300" />
              <span>{isAr ? 'دخول المنصة وابدأ المذاكرة' : 'Launch Attocus Workspace'}</span>
            </span>
            {isAr ? (
              <ArrowLeft className="w-4 h-4 relative transition-transform group-hover:-translate-x-1.5" />
            ) : (
              <ArrowRight className="w-4 h-4 relative transition-transform group-hover:translate-x-1.5" />
            )}
          </button>
        </div>

        {/* Quick jump to active lecture if present */}
        {recentLecture && onSelectLecture && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onSelectLecture(recentLecture.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 border border-blue-500/30 hover:border-blue-500/60 text-xs text-slate-300 hover:text-white transition-all group cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:animate-ping" />
              <span className="text-slate-400">{isAr ? 'استئناف آخر جلسة:' : 'Resume recent lecture:'}</span>
              <span className="font-semibold text-blue-300 underline decoration-blue-500/40">{recentLecture.title}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

      </main>

      {/* ─── Minimal Clean Footer ────────────────────────────────────── */}
      <footer className="relative z-10 w-full px-6 py-6 border-t border-slate-800/60 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-slate-400">ATTOCUS</span>
          <span>•</span>
          <span>{isAr ? 'المنصة الأكاديمية الذكية' : 'Intelligent Academic Platform'}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap justify-center">
          <a href="#features" className="hover:text-blue-400 transition-colors">{isAr ? 'المميزات والخصائص' : 'Features'}</a>
          <a href="#pricing" className="hover:text-blue-400 transition-colors">{isAr ? 'الباقات الأكاديمية' : 'Pricing'}</a>
          <a href="#updates" className="hover:text-blue-400 transition-colors">{isAr ? 'تحديثات المنصة' : 'Updates'}</a>
          <a href="#privacy" className="hover:text-blue-400 transition-colors">{isAr ? 'سياسة الخصوصية' : 'Privacy'}</a>
          <a href="#terms" className="hover:text-blue-400 transition-colors">{isAr ? 'شروط الاستخدام' : 'Terms'}</a>
          <a href="#security" className="hover:text-blue-400 transition-colors">{isAr ? 'أمان البيانات' : 'Security'}</a>
        </div>
        <span>© 2026 ATTOCUS</span>
      </footer>
    </div>
  );
};
