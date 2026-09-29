import React, { useRef, useEffect, useState } from 'react';
import { Slide, AttentionStateKind } from '../types';
import {
  Video,
  VideoOff,
  Eye,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Smartphone,
  Moon,
  RefreshCw,
  PanelRightClose,
  PanelRightOpen,
  UserX
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface StudySidebarProps {
  slides: Slide[];
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
  cameraActive: boolean;
  onToggleCamera: () => void;
  cameraStream: MediaStream | null;
  cameraConsentGiven: boolean;
  onOpenConsentModal: () => void;
  attentionDrifted: boolean;
  detectedState: AttentionStateKind;
  isAnalyzingFrame: boolean;
  onTriggerPhoneDetected: (reason?: string) => void;
  onTriggerSleepingDetected: (reason?: string) => void;
  onTriggerAwayDetected?: (reason?: string) => void;
  onTriggerGazeDrift: () => void;
  onTriggerFocused: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const PHONE_ALERT_THRESHOLD_MS = 3000;
const SLEEP_ALERT_THRESHOLD_MS = 15000; // 15 ثانية قبل إطلاق تنبيه إغلاق العينين
const AWAY_ALERT_THRESHOLD_MS = 5000;
const GRACE_PERIOD_MS = 2500;

export const StudySidebar: React.FC<StudySidebarProps> = ({
  slides,
  currentPage,
  onSelectPage,
  cameraActive,
  onToggleCamera,
  cameraStream,
  cameraConsentGiven,
  onOpenConsentModal,
  attentionDrifted,
  detectedState,
  isAnalyzingFrame,
  onTriggerPhoneDetected,
  onTriggerSleepingDetected,
  onTriggerAwayDetected,
  onTriggerGazeDrift,
  onTriggerFocused,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { isAr, t } = useLanguage();
  const isArRef = useRef(isAr);
  useEffect(() => {
    isArRef.current = isAr;
  }, [isAr]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [autoScanEnabled] = useState(true);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [isSleepyVisible, setIsSleepyVisible] = useState(false);
  const [isAwayVisible, setIsAwayVisible] = useState(false);

  const phoneStartTimeRef = useRef<number | null>(null);
  const lastPhoneSeenTimeRef = useRef<number | null>(null);

  const sleepyStartTimeRef = useRef<number | null>(null);
  const lastSleepySeenTimeRef = useRef<number | null>(null);

  const awayStartTimeRef = useRef<number | null>(null);
  const lastAwaySeenTimeRef = useRef<number | null>(null);

  const phoneAlertFiredRef = useRef<boolean>(false);
  const sleepAlertFiredRef = useRef<boolean>(false);
  const awayAlertFiredRef = useRef<boolean>(false);

  const lastAudioPlayTimeRef = useRef<number>(0);
  const lastHttpAnalysisTimeRef = useRef<number>(0);
  const isHttpAnalyzingRef = useRef<boolean>(false);

  const callbacksRef = useRef({
    onTriggerPhoneDetected,
    onTriggerSleepingDetected,
    onTriggerAwayDetected,
    onTriggerGazeDrift,
    onTriggerFocused
  });

  useEffect(() => {
    callbacksRef.current = {
      onTriggerPhoneDetected,
      onTriggerSleepingDetected,
      onTriggerAwayDetected,
      onTriggerGazeDrift,
      onTriggerFocused
    };
  }, [onTriggerPhoneDetected, onTriggerSleepingDetected, onTriggerAwayDetected, onTriggerGazeDrift, onTriggerFocused]);

  const triggerAudioAlert = () => {
    const now = Date.now();
    if (now - lastAudioPlayTimeRef.current < 1500) return;
    lastAudioPlayTimeRef.current = now;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.3);

      setTimeout(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.4);
        } catch (e) { }
      }, 150);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  };

  useEffect(() => {
    if (videoRef.current && cameraStream && cameraActive) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.warn('Video auto-play interrupted:', err);
      });
    }
  }, [cameraStream, cameraActive]);

  useEffect(() => {
    if (!cameraActive) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsPhoneVisible(false);
      setIsSleepyVisible(false);
      setIsAwayVisible(false);
      phoneStartTimeRef.current = null;
      lastPhoneSeenTimeRef.current = null;
      sleepyStartTimeRef.current = null;
      lastSleepySeenTimeRef.current = null;
      awayStartTimeRef.current = null;
      lastAwaySeenTimeRef.current = null;
      phoneAlertFiredRef.current = false;
      sleepAlertFiredRef.current = false;
      awayAlertFiredRef.current = false;
      return;
    }

    const getWebSocketUrl = (): string => {
      const envUrl = (import.meta as any).env?.VITE_WS_URL;
      if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
        return envUrl.trim();
      }

      if (typeof window !== 'undefined') {
        const isLocal =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1';

        if (!isLocal) {
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${proto}//${window.location.host}/ws/detect`;
        }
      }

      return 'ws://127.0.0.1:8000/ws/detect';
    };

    const wsUrl = getWebSocketUrl();
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;
    } catch (wsErr) {
      console.warn('[Attention] WebSocket creation skipped/failed:', wsErr);
    }

    if (socket) {
      socket.onopen = () => {
        console.log('[Attention] Connected to WebSocket Server:', wsUrl);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const now = Date.now();

          // 1. كشف الجوال
          if (data.phone_detected) {
            setIsPhoneVisible(true);
            lastPhoneSeenTimeRef.current = now;
            if (!phoneStartTimeRef.current) phoneStartTimeRef.current = now;
          } else {
            setIsPhoneVisible(false);
            if (
              lastPhoneSeenTimeRef.current &&
              now - lastPhoneSeenTimeRef.current > GRACE_PERIOD_MS
            ) {
              phoneStartTimeRef.current = null;
              lastPhoneSeenTimeRef.current = null;
              if (phoneAlertFiredRef.current) {
                phoneAlertFiredRef.current = false;
                callbacksRef.current.onTriggerFocused();
              }
            }
          }

          if (phoneStartTimeRef.current) {
            const elapsed = now - phoneStartTimeRef.current;
            if (elapsed >= PHONE_ALERT_THRESHOLD_MS) {
              triggerAudioAlert();

              if (!phoneAlertFiredRef.current) {
                phoneAlertFiredRef.current = true;
                callbacksRef.current.onTriggerPhoneDetected(
                  isArRef.current
                    ? `تم رصد استخدام الجوال! (${data.confidence || 90}%)`
                    : `Mobile phone usage detected! (${data.confidence || 90}%)`
                );
              }
            }
          }

          // 2. كشف النعاس
          if (data.is_sleepy) {
            setIsSleepyVisible(true);
            lastSleepySeenTimeRef.current = now;
            if (!sleepyStartTimeRef.current) sleepyStartTimeRef.current = now;
          } else {
            setIsSleepyVisible(false);
            if (
              lastSleepySeenTimeRef.current &&
              now - lastSleepySeenTimeRef.current > GRACE_PERIOD_MS
            ) {
              sleepyStartTimeRef.current = null;
              lastSleepySeenTimeRef.current = null;
              if (sleepAlertFiredRef.current) {
                sleepAlertFiredRef.current = false;
                callbacksRef.current.onTriggerFocused();
              }
            }
          }

          if (sleepyStartTimeRef.current) {
            const elapsed = now - sleepyStartTimeRef.current;
            if (elapsed >= SLEEP_ALERT_THRESHOLD_MS) {
              triggerAudioAlert();

              if (!sleepAlertFiredRef.current) {
                sleepAlertFiredRef.current = true;
                callbacksRef.current.onTriggerSleepingDetected(
                  isArRef.current
                    ? 'تم رصد إغلاق العينين أو علامات النعاس!'
                    : 'Signs of drowsiness or closed eyes detected!'
                );
              }
            }
          }

          // 3. كشف مغادرة الكرسي
          if (data.is_away) {
            setIsAwayVisible(true);
            lastAwaySeenTimeRef.current = now;
            if (!awayStartTimeRef.current) awayStartTimeRef.current = now;
          } else {
            setIsAwayVisible(false);
            if (
              lastAwaySeenTimeRef.current &&
              now - lastAwaySeenTimeRef.current > GRACE_PERIOD_MS
            ) {
              awayStartTimeRef.current = null;
              lastAwaySeenTimeRef.current = null;
              if (awayAlertFiredRef.current) {
                awayAlertFiredRef.current = false;
                callbacksRef.current.onTriggerFocused();
              }
            }
          }

          if (awayStartTimeRef.current) {
            const elapsed = now - awayStartTimeRef.current;
            if (elapsed >= AWAY_ALERT_THRESHOLD_MS) {
              if (!awayAlertFiredRef.current) {
                awayAlertFiredRef.current = true;
                callbacksRef.current.onTriggerAwayDetected?.(
                  isArRef.current
                    ? 'تم رصد الابتعاد عن مكان المذاكرة.'
                    : 'Stepped away from study desk detected.'
                );
              }
            }
          }

          // 4. استعادة حالة التركيز
          if (
            !phoneStartTimeRef.current &&
            !sleepyStartTimeRef.current &&
            !awayStartTimeRef.current &&
            (phoneAlertFiredRef.current || sleepAlertFiredRef.current || awayAlertFiredRef.current)
          ) {
            phoneAlertFiredRef.current = false;
            sleepAlertFiredRef.current = false;
            awayAlertFiredRef.current = false;
            callbacksRef.current.onTriggerFocused();
          }
        } catch (err) {
          console.error('Error parsing WebSocket response:', err);
        }
      };

      socket.onerror = (err) => {
        console.warn('[Attention] WebSocket notice: Running in HTTP Vision fallback mode');
      };
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [cameraActive]);

  const captureFrame = async () => {
    if (!videoRef.current || !cameraActive) return;
    try {
      const video = videoRef.current;
      if (video.videoWidth === 0) return;

      const canvas = document.createElement('canvas');
      const targetW = 640;
      const scale = Math.min(1, targetW / (video.videoWidth || 640));
      canvas.width = Math.round((video.videoWidth || 640) * scale);
      canvas.height = Math.round((video.videoHeight || 480) * scale);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.80);

        // Send frame to Python Attention Monitor (YOLO & MediaPipe - Zero OpenAI cost)
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(dataUrl);
        }
      }
    } catch (err) {
      console.warn('Frame capture error:', err);
    }
  };

  useEffect(() => {
    if (!cameraActive || !autoScanEnabled) return;
    const interval = setInterval(() => {
      captureFrame();
    }, 200);
    return () => clearInterval(interval);
  }, [cameraActive, autoScanEnabled]);

  // حالة الشريط الجانبي المطوي (Mini Sidebar)
  if (isCollapsed) {
    return (
      <aside className="w-14 h-full border-l border-slate-200/80 bg-white flex flex-col items-center py-4 select-none shrink-0 transition-all duration-300">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors mb-4"
          title={isAr ? "توسيع الشريط" : "Expand Sidebar"}
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>

        <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto no-scrollbar w-full px-2">
          {slides.map((slide) => {
            const isCurrent = slide.pageNumber === currentPage;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => onSelectPage(slide.pageNumber)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono transition-all ${isCurrent
                    ? 'bg-[#0F172A] text-white font-bold shadow-xs scale-105'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                  }`}
                title={isAr ? `شريحة ${slide.pageNumber}: ${slide.title}` : `Slide ${slide.pageNumber}: ${slide.title}`}
              >
                {slide.pageNumber}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  // زر التفعيل الموحد
  const handleToggleAction = () => {
    if (!cameraConsentGiven) {
      onOpenConsentModal();
    } else {
      onToggleCamera();
    }
  };

  return (
    <aside className="w-84 h-full border-l border-slate-200/80 dark:border-slate-800 bg-[#FCFCFD] dark:bg-slate-900 flex flex-col justify-between select-none overflow-hidden shrink-0 transition-all duration-300">

      {/* 1. رأس الشريط */}
      <div className="p-3.5 border-b border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="text-xs font-bold text-[#0F172A] dark:text-white tracking-wider uppercase">
            {isAr ? "مساحة العمل والتركيز" : "Focus & Workspace"}
          </span>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-xs"
            title={isAr ? "إخفاء الشريط" : "Collapse Sidebar"}
          >
            <PanelRightClose className="w-4 h-4" />
            <span className="text-[11px] font-medium">{isAr ? "طي" : "Collapse"}</span>
          </button>
        )}
      </div>

      {/* 2. قسم الكاميرا ومراقبة التركيز */}
      <div className="p-4 border-b border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all ${cameraActive && (detectedState === 'using_phone' || isPhoneVisible)
                  ? 'bg-rose-500 animate-ping'
                  : cameraActive && (detectedState === 'sleeping' || isSleepyVisible)
                    ? 'bg-blue-600 animate-pulse'
                    : cameraActive && (detectedState === 'away' || isAwayVisible)
                      ? 'bg-amber-500 animate-pulse'
                      : cameraActive && (detectedState === 'distracted' || attentionDrifted)
                        ? 'bg-orange-500'
                        : cameraActive && detectedState === 'focused'
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-slate-300 dark:bg-slate-600'
                }`}
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {cameraActive
                ? (detectedState === 'using_phone' || isPhoneVisible)
                  ? (isAr ? 'رصد هاتف في اليد 📱' : 'Phone Detected 📱')
                  : (detectedState === 'sleeping' || isSleepyVisible)
                    ? (isAr ? 'رصد إغلاق العينين 💤' : 'Eyes Closed 💤')
                    : (detectedState === 'away' || isAwayVisible)
                      ? (isAr ? 'مغادرة المقعد 🚶‍♂️' : 'Away from Seat 🚶‍♂️')
                      : detectedState === 'distracted' || attentionDrifted
                        ? (isAr ? 'تشتت الانتباه' : 'Distracted')
                        : (isAr ? 'مراقب التركيز: نشط' : 'Focus Monitor: Active')
                : (isAr ? 'مراقب التركيز: متوقف' : 'Focus Monitor: Off')}
            </span>
          </div>

          {/* الزر الرئيسي والوحيد للتحكم بالكاميرا */}
          <button
            type="button"
            id="toggle-attention-camera-btn"
            onClick={handleToggleAction}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 border shadow-xs active:scale-95 ${cameraActive
                ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                : 'bg-[#0F172A] text-white border-[#0F172A] hover:bg-slate-800'
              }`}
          >
            {cameraActive ? (
              <>
                <VideoOff className="w-3.5 h-3.5 text-rose-600" />
                <span>{isAr ? 'إيقاف الكاميرا' : 'Stop Camera'}</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5 text-blue-300" />
                <span>{isAr ? 'تشغيل الكاميرا' : 'Start Camera'}</span>
              </>
            )}
          </button>
        </div>

        {/* مساحة الفيديو أو شاشة الإيقاف */}
        {cameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video border border-slate-200 shadow-inner group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror -scale-x-100"
            />

            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white flex items-center gap-1 font-mono">
              <Eye className="w-2.5 h-2.5 text-blue-400" />
              <span>{isAr ? 'مباشر' : 'LIVE'}</span>
            </div>

            {isAnalyzingFrame && (
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-emerald-300 flex items-center gap-1 font-mono">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>{isAr ? 'فحص' : 'Scan'}</span>
              </div>
            )}

            {detectedState === 'using_phone' && (
              <div className="absolute inset-0 bg-rose-600/35 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-3 py-1.5 rounded-xl bg-white shadow-md text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isAr ? 'انتبه: الجوال مشتت!' : 'Alert: Phone distraction!'}</span>
                </div>
              </div>
            )}

            {detectedState === 'sleeping' && (
              <div className="absolute inset-0 bg-blue-600/35 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-3 py-1.5 rounded-xl bg-white shadow-md text-xs font-bold text-blue-600 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  <span>{isAr ? 'خذ استراحة قصيرة ☕' : 'Take a short break ☕'}</span>
                </div>
              </div>
            )}

            {detectedState === 'away' && (
              <div className="absolute inset-0 bg-amber-600/35 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-3 py-1.5 rounded-xl bg-white shadow-md text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <UserX className="w-3.5 h-3.5" />
                  <span>{isAr ? 'في انتظار عودتك..' : 'Waiting for your return...'}</span>
                </div>
              </div>
            )}

            {(detectedState === 'distracted' || attentionDrifted) && detectedState !== 'using_phone' && detectedState !== 'sleeping' && detectedState !== 'away' && (
              <div className="absolute inset-0 bg-orange-500/30 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-3 py-1.5 rounded-xl bg-white shadow-md text-xs font-bold text-orange-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'ركّز على الشريحة 🎯' : 'Focus on the slide 🎯'}</span>
                </div>
              </div>
            )}

            <div className="absolute bottom-2 left-2 text-[9px] text-white/70 bg-black/40 px-1.5 py-0.5 rounded">
              {isAr ? 'معالجة محلية خاصة' : 'Private On-Device Processing'}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 py-6 px-4 bg-slate-50/60 text-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto overflow-hidden shadow-xs">
              <img src="/assets/logos/logo_circle_eye.png" alt="Focus Radar" className="w-8 h-8 object-contain" />
            </div>
            <p className="text-xs font-bold text-slate-700">{isAr ? 'التتبع بالكاميرا متوقف حالياً' : 'Camera tracking currently off'}</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isAr ? 'شغّل الكاميرا لمتابعة التركيز وتنبيهك عند السهو أو استخدام الجوال.' : 'Turn on camera to monitor focus and alert you when distracted or using phone.'}
            </p>
          </div>
        )}

        {cameraActive && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAr ? 'المراقبة تعمل بدقة' : 'Monitoring actively'}</span>
            </span>
            <span className="text-[10px]">{isAr ? 'مشفر ومحمي' : 'Encrypted & secure'}</span>
          </div>
        )}
      </div>

      {/* 3. فهرس الشرائح والموضوعات */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3.5 border-b border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
            {isAr ? "فهرس الشرائح" : "Slides Index"}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            {slides.length} {isAr ? "شريحة" : "slides"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {slides.map((slide) => {
            const isCurrent = slide.pageNumber === currentPage;
            return (
              <button
                key={slide.id}
                id={`sidebar-slide-link-${slide.pageNumber}`}
                type="button"
                onClick={() => onSelectPage(slide.pageNumber)}
                className={`w-full ${isAr ? 'text-right' : 'text-left'} p-3 rounded-2xl transition-all flex items-start gap-3 border ${isCurrent
                    ? 'bg-white dark:bg-slate-800 border-blue-600/70 shadow-xs ring-1 ring-blue-600/20'
                    : 'bg-transparent hover:bg-white dark:hover:bg-slate-800/60 border-transparent hover:border-slate-200/80 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${isCurrent
                      ? 'bg-[#0F172A] dark:bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                >
                  {slide.pageNumber}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate leading-snug ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {slide.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>{slide.topic}</span>
                  </div>
                </div>

                {isCurrent && (
                  isAr ? <ChevronLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. تذييل الخصوصية */}
      <div className="p-3 border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] text-slate-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="leading-tight">
          {isAr ? "جلسة مذاكرة خاصة · لا يتم حفظ أو تسجيل الفيديو إطلاقاً" : "Private study session · No video is ever recorded or stored"}
        </span>
      </div>
    </aside>
  );
};