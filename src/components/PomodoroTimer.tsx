import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, Coffee, Brain, Star, X, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

type PomodoroPreset = '25/5' | '50/10' | 'custom';

interface PomodoroTimerProps {
  lectureId: string;
  onPomodoroComplete?: () => void;
  onAddFocusPoints?: (points: number) => void;
  isPausedByPhone?: boolean;
}

const RING_RADIUS = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  lectureId,
  onPomodoroComplete,
  onAddFocusPoints,
  isPausedByPhone = false,
}) => {
  const { isAr, t } = useLanguage();
  const { isDark } = useTheme();
  const [preset, setPreset] = useState<PomodoroPreset>('25/5');
  const [customStudyMins, setCustomStudyMins] = useState(30);
  const [customBreakMins, setCustomBreakMins] = useState(5);
  const [isBreak, setIsBreak] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [totalPhaseSeconds, setTotalPhaseSeconds] = useState(25 * 60);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [focusPointsEarned, setFocusPointsEarned] = useState(0);
  const [isPointsForfeited, setIsPointsForfeited] = useState(false);

  // التحكم في القائمة المنبثقة
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showStopWarning, setShowStopWarning] = useState(false);
  const [showCustomSheet, setShowCustomSheet] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [tempStudy, setTempStudy] = useState(30);
  const [tempBreak, setTempBreak] = useState(5);
  const [autoRepeat, setAutoRepeat] = useState(true);
  const [targetCycles, setTargetCycles] = useState(0); // 0 = continuous repeat

  const popoverRef = useRef<HTMLDivElement>(null);
  const endTimeRef = useRef<number | null>(null);
  const pointIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getStudySeconds = useCallback(() => {
    if (preset === '25/5') return 25 * 60;
    if (preset === '50/10') return 50 * 60;
    return customStudyMins * 60;
  }, [preset, customStudyMins]);

  const getBreakSeconds = useCallback(() => {
    if (preset === '25/5') return 5 * 60;
    if (preset === '50/10') return 10 * 60;
    return customBreakMins * 60;
  }, [preset, customBreakMins]);

  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      [[587.33, 0], [880, 0.3]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.22, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 1.1);
      });
    } catch { }
  }, []);

  // إغلاق القائمة عند النقر في الخارج
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopoverOpen]);

  useEffect(() => {
    if (isRunning && !isPausedByPhone) {
      endTimeRef.current = Date.now() + secondsRemaining * 1000;
    } else {
      endTimeRef.current = null;
    }
  }, [isRunning, isPausedByPhone]);

  useEffect(() => {
    if (!isRunning || isPausedByPhone) return;
    const interval = setInterval(() => {
      if (!endTimeRef.current) return;
      const msLeft = endTimeRef.current - Date.now();
      const next = Math.max(0, Math.ceil(msLeft / 1000));
      setSecondsRemaining(next);
      setSessionElapsed(prev => prev + 1);

      if (next <= 0) {
        clearInterval(interval);
        playChime();

        if (!isBreak) {
          const newCycles = completedCycles + 1;
          setCompletedCycles(newCycles);
          if (onPomodoroComplete) onPomodoroComplete();
          const breakSecs = getBreakSeconds();
          setIsBreak(true);
          setSecondsRemaining(breakSecs);
          setTotalPhaseSeconds(breakSecs);
          if (autoRepeat) {
            endTimeRef.current = Date.now() + breakSecs * 1000;
          } else {
            setIsRunning(false);
            endTimeRef.current = null;
          }
        } else {
          const studySecs = getStudySeconds();
          setIsBreak(false);
          setSecondsRemaining(studySecs);
          setTotalPhaseSeconds(studySecs);
          const hasMore = targetCycles === 0 || completedCycles < targetCycles;
          if (autoRepeat && hasMore) {
            endTimeRef.current = Date.now() + studySecs * 1000;
          } else {
            setIsRunning(false);
            endTimeRef.current = null;
          }
        }
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning, isPausedByPhone, isBreak, completedCycles, getStudySeconds, getBreakSeconds, playChime, onPomodoroComplete, autoRepeat, targetCycles]);

  useEffect(() => {
    if (pointIntervalRef.current) clearInterval(pointIntervalRef.current);
    if (!isRunning || isBreak || isPointsForfeited || isPausedByPhone) return;

    pointIntervalRef.current = setInterval(async () => {
      // Score Clamping Guardrail: Max 20 points per 30-minute sliding window
      try {
        const res = await fetch('/api/gamification/record-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: 'STU_101', points: 5, reason: 'Pomodoro Interval' })
        });
        if (res.ok) {
          const data = await res.json();
          const granted = data.granted_points ?? 5;
          setFocusPointsEarned(prev => prev + granted);
          if (granted > 0) {
            onAddFocusPoints?.(granted);
          }
          return;
        }
      } catch {
        // Fallback to local rate-limiting guardrail if backend is offline
      }

      setFocusPointsEarned(prev => {
        if (prev >= 20) return prev;
        const granted = Math.min(5, 20 - prev);
        if (granted > 0) {
          onAddFocusPoints?.(granted);
        }
        return prev + granted;
      });
    }, 5 * 60 * 1000);

    return () => {
      if (pointIntervalRef.current) clearInterval(pointIntervalRef.current);
    };
  }, [isRunning, isBreak, isPointsForfeited, onAddFocusPoints]);


  const handlePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isRunning) {
      setShowStopWarning(true);
    } else {
      setIsRunning(true);
    }
  };

  const confirmPauseAndForfeit = () => {
    setIsRunning(false);
    setIsPointsForfeited(true);
    setShowStopWarning(false);
  };

  const handleReset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsRunning(false);
    setIsBreak(false);
    setIsPointsForfeited(false);
    setFocusPointsEarned(0);
    setSessionElapsed(0);
    endTimeRef.current = null;
    const secs = getStudySeconds();
    setSecondsRemaining(secs);
    setTotalPhaseSeconds(secs);
  };

  const handleSelectPreset = (p: PomodoroPreset) => {
    if (p === 'custom') {
      setTempStudy(customStudyMins);
      setTempBreak(customBreakMins);
      setShowCustomSheet(true);
      return;
    }
    setPreset(p);
    setIsRunning(false);
    setIsBreak(false);
    setIsPointsForfeited(false);
    setFocusPointsEarned(0);
    endTimeRef.current = null;
    const secs = p === '25/5' ? 25 * 60 : 50 * 60;
    setSecondsRemaining(secs);
    setTotalPhaseSeconds(secs);
  };

  const applyCustomTimes = () => {
    setCustomStudyMins(tempStudy);
    setCustomBreakMins(tempBreak);
    setPreset('custom');
    setIsRunning(false);
    setIsBreak(false);
    setIsPointsForfeited(false);
    setFocusPointsEarned(0);
    endTimeRef.current = null;
    const secs = tempStudy * 60;
    setSecondsRemaining(secs);
    setTotalPhaseSeconds(secs);
    setShowCustomSheet(false);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progress = totalPhaseSeconds > 0 ? secondsRemaining / totalPhaseSeconds : 1;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  const ringColor = isPointsForfeited
    ? '#F59E0B'
    : isBreak
      ? '#3B82F6'
      : '#10B981';

  const presets: { key: PomodoroPreset; label: string }[] = [
    { key: '25/5', label: '25/5' },
    { key: '50/10', label: '50/10' },
    { key: 'custom', label: t('timer.custom', 'مخصص') },
  ];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* ─── الكبسولة البيضاء النظيفة (Apple Clean Capsule) ─── */}
      <div
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm cursor-pointer transition-all select-none"
      >
        {/* مؤشر الحالة */}
        <span className="relative flex h-2 w-2">
          {isRunning && !isPausedByPhone && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isPausedByPhone
              ? 'bg-amber-500 animate-pulse'
              : isRunning
                ? (isBreak ? 'bg-blue-500' : 'bg-emerald-500')
                : 'bg-slate-300 dark:bg-slate-600'
          }`} />
        </span>

        {/* عرض الوقت */}
        <span className={`font-mono text-xs font-bold tracking-wider ${
          isPausedByPhone ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-[#0F172A] dark:text-white'
        }`}>
          {formattedTime}
        </span>

        {/* فاصل رمادي دقيق */}
        <span className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700" />

        {/* زر التشغيل والإيقاف الدائري */}
        <button
          type="button"
          onClick={handlePlayPause}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isRunning
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/60'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-[#0F172A] hover:text-white dark:hover:bg-blue-600'
            }`}
          title={isRunning ? t('timer.pause', "إيقاف مؤقت") : t('timer.start', "بدء الجلسة")}
        >
          {isRunning ? (
            <Pause className="w-2.5 h-2.5" />
          ) : (
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* ─── القائمة المنبثقة التفصيلية ─── */}
      {isPopoverOpen && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-50 w-72 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">

          {/* رأس البطاقة */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              {isBreak ? (
                <><Coffee className="w-3.5 h-3.5 text-blue-500" /><span className="text-blue-500">{t('timer.breakTime', 'وقت الاستراحة')}</span></>
              ) : (
                <><Brain className="w-3.5 h-3.5 text-[#0F172A] dark:text-blue-400" /><span>{t('timer.focusSession', 'جلسة تركيز')}</span></>
              )}
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              {t('timer.reset', 'إعادة')}
            </button>
          </div>

          {/* خيارات الأنماط */}
          <div className="grid grid-cols-3 gap-1.5 py-3">
            {presets.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => handleSelectPreset(p.key)}
                className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${preset === p.key
                    ? 'bg-[#0F172A] dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* الدائرة الرقمية */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="relative shrink-0">
              <svg width="72" height="72" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r={RING_RADIUS} fill="none" stroke={isDark ? '#334155' : '#F1F5F9'} strokeWidth="5" />
                <circle
                  cx="38" cy="38" r={RING_RADIUS}
                  fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.3s' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {isBreak ? (
                  <Coffee className="w-4 h-4 text-blue-500" />
                ) : isRunning ? (
                  <Brain className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Pause className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            <div className={isAr ? "text-right" : "text-left"}>
              <div className="font-mono text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
                {formattedTime}
              </div>
              {isPointsForfeited ? (
                <p className="text-[10px] text-amber-500 font-semibold mt-0.5">{t('timer.pointsForfeited', '⚠️ ألغيت نقاط الجلسة')}</p>
              ) : isBreak ? (
                <p className="text-[10px] text-blue-500 font-medium mt-0.5">{t('timer.breakNotice', 'استراحة وتجديد طاقة ☕')}</p>
              ) : isRunning ? (
                <p className="text-[10px] text-emerald-500 font-medium mt-0.5">{t('timer.activeSession', 'جلسة نشطة (+5 نقاط)')}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {t('timer.recorded', '{mins} دقيقة مسجلة').replace('{mins}', String(Math.floor(sessionElapsed / 60)))}
                </p>
              )}
            </div>
          </div>

          {/* شريط النقاط */}
          <div className="my-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {isAr ? `${focusPointsEarned} نقطة مكتسبة` : `${focusPointsEarned} pts earned`}
              </span>
            </div>
            {completedCycles > 0 && (
              <span className="text-[10px] text-slate-400 font-medium">
                {isAr ? `${completedCycles} جلسات 🍅` : `${completedCycles} sessions 🍅`}
              </span>
            )}
          </div>

          {/* زر التحكم الرئيسي */}
          <button
            type="button"
            onClick={handlePlayPause}
            className={`w-full mt-2 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${isRunning
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 border border-rose-100 dark:border-rose-900/40'
                : 'bg-[#0F172A] dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500'
              }`}
          >
            {isRunning ? (
              <><Pause className="w-3.5 h-3.5" /><span>{t('timer.pause', 'إيقاف مؤقت')}</span></>
            ) : (
              <><Play className="w-3.5 h-3.5 fill-current" /><span>{t('timer.start', 'بدء الجلسة')}</span></>
            )}
          </button>
        </div>
      )}

      {/* ─── تحذير إيقاف المؤقت ─── */}
      {showStopWarning && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xs w-full p-6 shadow-2xl space-y-3 text-right animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? "إيقاف مؤقت الجلسة؟" : "Pause session timer?"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isAr ? "إيقاف المؤقت قبل انتهاء الوقت سيلغي احتساب نقاط التركيز الإضافية لهذه الجلسة." : "Pausing early will forfeit extra focus points earned in this cycle."}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={confirmPauseAndForfeit}
                className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
              >
                {isAr ? "تأكيد الإيقاف وخسارة النقاط" : "Confirm Pause & Forfeit"}
              </button>
              <button
                type="button"
                onClick={() => setShowStopWarning(false)}
                className="w-full py-2.5 rounded-xl bg-[#0F172A] dark:bg-blue-600 text-white font-semibold text-xs hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
              >
                {isAr ? "متابعة المذاكرة" : "Continue Studying"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── نافذة التخصيص ─── */}
      {showCustomSheet && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setShowCustomSheet(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 text-right animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isAr ? "تخصيص مؤقت المذاكرة" : "Customize Study Timer"}
              </h3>
              <button type="button" onClick={() => setShowCustomSheet(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{isAr ? "المذاكرة" : "Study"}</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{tempStudy} {isAr ? "دقيقة" : "mins"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTempStudy(v => Math.max(5, v - 5))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={isAr ? "إنقاص 5 دقائق" : "Decrease 5 mins"}>
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(tempStudy / 60) * 100}%` }} />
                </div>
                <button type="button" onClick={() => setTempStudy(v => Math.min(60, v + 5))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={isAr ? "زيادة 5 دقائق" : "Increase 5 mins"}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{isAr ? "الاستراحة" : "Break"}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{tempBreak} {isAr ? "دقيقة" : "mins"}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTempBreak(v => Math.max(1, v - 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={isAr ? "إنقاص دقيقة" : "Decrease 1 min"}>
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${(tempBreak / 30) * 100}%` }} />
                </div>
                <button type="button" onClick={() => setTempBreak(v => Math.min(30, v + 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={isAr ? "زيادة دقيقة" : "Increase 1 min"}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* عدد الجولات والتكرار */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{isAr ? "عدد الجولات بالجلسة" : "Cycles per session"}</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {targetCycles === 0 ? (isAr ? "مستمر ♾️" : "Continuous ♾️") : `${targetCycles} ${isAr ? "جولات" : "cycles"}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTargetCycles(v => Math.max(0, v - 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={isAr ? "إنقاص جولة" : "Decrease cycle"}>
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 text-center text-xs text-slate-500">
                  {targetCycles === 0 ? (isAr ? "تكرار مستمر بدون توقف" : "Non-stop continuous") : `${targetCycles} ${isAr ? "جولات مبرمجة" : "preset cycles"}`}
                </div>
                <button type="button" onClick={() => setTargetCycles(v => Math.min(10, v + 1))} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={isAr ? "زيادة جولة" : "Increase cycle"}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* الانتقال التلقائي بين الجولات */}
            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={autoRepeat}
                onChange={e => setAutoRepeat(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">
                {isAr ? "الانتقال التلقائي للجولة التالية بدون توقف" : "Auto-advance to next cycle without stopping"}
              </span>
            </label>

            <button
              type="button"
              onClick={applyCustomTimes}
              className="w-full py-2.5 rounded-xl bg-[#0F172A] dark:bg-blue-600 text-white font-bold text-xs hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              {isAr ? "حفظ وتطبيق المؤقت" : "Save and Apply"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};