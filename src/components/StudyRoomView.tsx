import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lecture,
  Slide,
  AnnotationStroke,
  PageAnnotationsMap,
  StuckDetectionState,
  AttentionTrackingState,
  AttentionStateKind,
  PEN_COLOR_OPTIONS,
  MARKER_COLOR_OPTIONS
} from '../types';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Edit2,
  Highlighter,
  RotateCcw,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Upload,
  Eraser,
  Type,
  Moon,
  Sun
} from 'lucide-react';
import { SlideViewer } from './SlideViewer';
import { AnnotationCanvas } from './AnnotationCanvas';
import { StudySidebar } from './StudySidebar';
import { WrapUpModal } from './WrapUpModal';
import { UnderstandingModal } from './UnderstandingModal';
import { ExplainDrawer } from './ExplainDrawer';
import { QuickQuizModal } from './QuickQuizModal';
import { CameraConsentModal } from './CameraConsentModal';
import { GentleToneModal } from './GentleToneModal';
import { StuckInterventionCard } from './StuckInterventionCard';
import { PomodoroTimer } from './PomodoroTimer';
import { PhoneAlertModal } from './PhoneAlertModal';
import { SleepingAlertModal } from './SleepingAlertModal';
import { AwayAlertModal } from './AwayAlertModal';
import { UploadModal } from './UploadModal';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  saveAnnotationsToFirestore,
  getAnnotationsFromFirestore,
  logAttentionEventToFirestore
} from '../services/firestoreService';

interface StudyRoomViewProps {
  lecture: Lecture;
  onReturnHome: () => void;
  onUpdateLecture: (updated: Lecture) => void;
  onUploadLecture: (lecture: Lecture) => void;
  onAddFocusPoints: (points: number) => void;
}

export const StudyRoomView: React.FC<StudyRoomViewProps> = ({
  lecture,
  onReturnHome,
  onUpdateLecture,
  onUploadLecture,
  onAddFocusPoints
}) => {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState<number>(lecture.currentPage || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Global theme and language state
  const { isDark } = useTheme();
  const isDarkMode = isDark;
  const { isAr, dir, t } = useLanguage();

  // Annotation states
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'eraser' | 'text' | 'none'>('pen');
  const [activeColor, setActiveColor] = useState<string>(PEN_COLOR_OPTIONS[0].color);
  const [pageAnnotations, setPageAnnotations] = useState<PageAnnotationsMap>(() => {
    try {
      const saved = localStorage.getItem(`annotations-${lecture.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modals & Panels
  const [wrapUpModalOpen, setWrapUpModalOpen] = useState(false);
  const [understandingModalOpen, setUnderstandingModalOpen] = useState(false);
  const [explainDrawerOpen, setExplainDrawerOpen] = useState(false);
  const [quickQuizModalOpen, setQuickQuizModalOpen] = useState(false);

  // Attention Tracking State
  const [attentionState, setAttentionState] = useState<AttentionTrackingState>({
    cameraActive: false,
    cameraConsentGiven: false,
    cameraConsentModalOpen: false,
    attentionDrifted: false,
    driftSeconds: 0,
    visualPulseActive: false,
    gentleToneModalOpen: false,
    gentleToneCount: 0,
    detectedState: 'focused',
    phoneAlertOpen: false,
    sleepingAlertOpen: false,
    awayAlertOpen: false,
    isAnalyzingFrame: false,
    tabSwitchToast: null
  });

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Timing & Stuck Detection State
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [pageTimeSeconds, setPageTimeSeconds] = useState(0);
  const [stuckState, setStuckState] = useState<StuckDetectionState>({
    pageNumber: 1,
    timeSpentSeconds: 0,
    expectedSeconds: 90,
    level: 1,
    isActivelyEngaging: false,
    interventionActive: false,
    declinedPages: new Set<number>(),
    specialistOffered: 'quiz'
  });

  const lastActivityTimestampRef = useRef<number>(Date.now());
  const snoozedUntilRef = useRef<Record<number, number>>({});
  const documentContainerRef = useRef<HTMLDivElement | null>(null);
  const tabHiddenTimestampRef = useRef<number | null>(null);
  const tabSwitchesCountRef = useRef<number>(0);
  const totalAwaySecondsRef = useRef<number>(0);

  const currentSlide: Slide = lecture.slides.find(s => s.pageNumber === currentPage) || lecture.slides[0];

  useEffect(() => {
    const density = currentSlide.densityScore || 3;
    const base = lecture.baselineSecsPerPage || 90;
    const multiplier = 0.5 + (density * 0.2);
    const expected = Math.round(base * multiplier);

    setPageTimeSeconds(0);
    setStuckState(prev => ({
      ...prev,
      pageNumber: currentPage,
      timeSpentSeconds: 0,
      expectedSeconds: Math.max(40, expected),
      level: 1,
      interventionActive: false,
      specialistOffered: Math.random() > 0.5 ? 'quiz' : 'understanding'
    }));
  }, [currentPage, lecture.baselineSecsPerPage, currentSlide.densityScore]);

  useEffect(() => {
    if (!currentUser) return;
    const loadCloudAnnotations = async () => {
      try {
        const cloudAnnots = await getAnnotationsFromFirestore(currentUser.uid, lecture.id);
        if (cloudAnnots && Object.keys(cloudAnnots).length > 0) {
          setPageAnnotations(cloudAnnots);
        }
      } catch (err) {
        console.warn('[Firestore] error loading cloud annotations:', err);
      }
    };
    loadCloudAnnotations();
  }, [currentUser, lecture.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`annotations-${lecture.id}`, JSON.stringify(pageAnnotations));
    } catch { }

    if (currentUser && Object.keys(pageAnnotations).length > 0) {
      saveAnnotationsToFirestore(currentUser.uid, lecture.id, pageAnnotations);
    }
  }, [pageAnnotations, lecture.id, currentUser]);

  const registerEngagement = useCallback(() => {
    lastActivityTimestampRef.current = Date.now();
    setStuckState(prev => ({ ...prev, isActivelyEngaging: true }));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;

      setSessionSeconds(prev => prev + 1);
      setPageTimeSeconds(prev => {
        const nextTime = prev + 1;

        setStuckState(stuck => {
          const isSnoozed = (snoozedUntilRef.current[currentPage] || 0) > Date.now();
          if (isSnoozed || stuck.interventionActive) {
            return { ...stuck, timeSpentSeconds: nextTime };
          }

          const overrunRatio = nextTime / stuck.expectedSeconds;
          const timeSinceActivity = (Date.now() - lastActivityTimestampRef.current) / 1000;
          const isEngaging = timeSinceActivity < 15;

          let newLevel: 1 | 2 | 3 = 1;
          let shouldIntervene = false;

          if (overrunRatio >= 1.0 || nextTime >= 50) {
            newLevel = isEngaging ? 2 : 3;
            if (nextTime >= stuck.expectedSeconds || timeSinceActivity > 15) {
              shouldIntervene = true;
            }
          }

          return {
            ...stuck,
            timeSpentSeconds: nextTime,
            level: newLevel,
            isActivelyEngaging: isEngaging,
            interventionActive: shouldIntervene
          };
        });

        return nextTime;
      });

      setAttentionState(att => {
        if (!att.cameraActive) return att;
        if (att.attentionDrifted) {
          const nextDrift = att.driftSeconds + 1;
          let pulse = false;
          let showModal = att.gentleToneModalOpen;

          if (nextDrift >= 5) {
            pulse = true;
          }
          if (nextDrift >= 15 && !att.gentleToneModalOpen) {
            showModal = true;
          }

          return {
            ...att,
            driftSeconds: nextDrift,
            visualPulseActive: pulse,
            gentleToneModalOpen: showModal
          };
        }
        return att;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPage]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        tabHiddenTimestampRef.current = Date.now();
        tabSwitchesCountRef.current += 1;
      } else {
        const awayMs = tabHiddenTimestampRef.current ? (Date.now() - tabHiddenTimestampRef.current) : 0;
        const awaySeconds = awayMs / 1000;
        totalAwaySecondsRef.current += awaySeconds;
        tabHiddenTimestampRef.current = null;

        let coachMsg = "أهلاً بعودتك! 👋 لنكمل التركيز معاً";
        setAttentionState(prev => ({
          ...prev,
          tabSwitchToast: {
            show: true,
            timestamp: Date.now(),
            message: coachMsg
          }
        }));

        try {
          const res = await fetch('/api/orchestrator/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: `lecture-${lecture.id}`,
              slide_number: currentPage,
              slide_title: currentSlide.title,
              slide_text: (currentSlide.content || []).join('\n'),
              time_spent_seconds: pageTimeSeconds,
              expected_seconds: stuckState.expectedSeconds,
              tab_switches_count: tabSwitchesCountRef.current,
              last_away_duration_seconds: awaySeconds,
              total_away_seconds: totalAwaySecondsRef.current,
              time_since_interaction: (Date.now() - lastActivityTimestampRef.current) / 1000,
              language: 'ar'
            })
          });

          if (res.ok) {
            const decision = await res.json();
            if (decision.message) {
              setAttentionState(prev => ({
                ...prev,
                tabSwitchToast: {
                  show: true,
                  timestamp: Date.now(),
                  message: decision.message
                },
                phoneAlertOpen: decision.alert_kind === 'phone_modal' ? true : prev.phoneAlertOpen,
                sleepingAlertOpen: decision.alert_kind === 'sleeping_modal' ? true : prev.sleepingAlertOpen
              }));
            }
          }
        } catch (e) { }

        setTimeout(() => {
          setAttentionState(prev => ({
            ...prev,
            tabSwitchToast: null
          }));
        }, 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentPage, currentSlide, lecture.id, pageTimeSeconds, stuckState.expectedSeconds]);

  const handleToggleCamera = async () => {
    if (attentionState.cameraActive) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setAttentionState(prev => ({
        ...prev,
        cameraActive: false,
        attentionDrifted: false,
        visualPulseActive: false,
        gentleToneModalOpen: false
      }));
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported on this browser');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
        setCameraStream(stream);
        setAttentionState(prev => ({
          ...prev,
          cameraActive: true,
          cameraConsentGiven: true,
          attentionDrifted: false
        }));
      } catch (err: any) {
        alert('يرجى التحقق من أذونات الكاميرا في المتصفح.');
        setAttentionState(prev => ({ ...prev, cameraActive: false }));
      }
    }
  };

  const handleConfirmCameraConsent = () => {
    setAttentionState(prev => ({
      ...prev,
      cameraConsentGiven: true,
      cameraConsentModalOpen: false
    }));
    handleToggleCamera();
  };

  const sendAttentionTelemetry = async (cvPayload?: { state: string; confidence: number }) => {
    try {
      await fetch('/api/orchestrator/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: `lecture-${lecture.id}`,
          slide_number: currentPage,
          slide_title: currentSlide.title,
          slide_text: (currentSlide.content || []).join('\n'),
          time_spent_seconds: pageTimeSeconds,
          expected_seconds: stuckState.expectedSeconds,
          tab_switches_count: tabSwitchesCountRef.current,
          last_away_duration_seconds: 0,
          total_away_seconds: totalAwaySecondsRef.current,
          time_since_interaction: (Date.now() - lastActivityTimestampRef.current) / 1000,
          cv_data: cvPayload,
          language: 'ar'
        })
      });
    } catch (e) { }
  };

  const handleTriggerPhoneDetected = (reason?: string) => {
    setAttentionState(prev => ({
      ...prev,
      detectedState: 'using_phone',
      detectionReason: reason || 'تم رصد استخدام الهاتف أثناء المذاكرة.',
      phoneAlertOpen: true,
      sleepingAlertOpen: false,
      attentionDrifted: true
    }));
    sendAttentionTelemetry({ state: 'using_phone', confidence: 0.95 });
    if (currentUser) {
      logAttentionEventToFirestore(currentUser.uid, {
        lectureId: lecture.id,
        eventType: 'phone_detected',
        timestamp: Date.now(),
        details: reason || 'Phone detected in hands.'
      });
    }
  };

  const handleTriggerSleepingDetected = (reason?: string) => {
    setAttentionState(prev => ({
      ...prev,
      detectedState: 'sleeping',
      detectionReason: reason || 'تم رصد إغلاق العينين أو انحناء الرأس.',
      sleepingAlertOpen: true,
      phoneAlertOpen: false,
      awayAlertOpen: false,
      attentionDrifted: true
    }));
    sendAttentionTelemetry({ state: 'sleeping', confidence: 0.95 });
    if (currentUser) {
      logAttentionEventToFirestore(currentUser.uid, {
        lectureId: lecture.id,
        eventType: 'sleeping',
        timestamp: Date.now(),
        details: reason || 'Resting head on desk or eyes closed.'
      });
    }
  };

  const handleTriggerAwayDetected = (reason?: string) => {
    setAttentionState(prev => ({
      ...prev,
      detectedState: 'away',
      detectionReason: reason || 'تم رصد مغادرة مكان المذاكرة.',
      awayAlertOpen: true,
      phoneAlertOpen: false,
      sleepingAlertOpen: false,
      attentionDrifted: true
    }));
    sendAttentionTelemetry({ state: 'away', confidence: 0.95 });
    if (currentUser) {
      logAttentionEventToFirestore(currentUser.uid, {
        lectureId: lecture.id,
        eventType: 'away_from_desk',
        timestamp: Date.now(),
        details: reason || 'Stepped away from your study desk.'
      });
    }
  };

  const handleTriggerGazeDrift = () => {
    setAttentionState(prev => ({
      ...prev,
      detectedState: 'distracted',
      attentionDrifted: true,
      driftSeconds: 1,
      visualPulseActive: true,
      gentleToneModalOpen: true
    }));
  };

  const handleTriggerFocused = () => {
    setAttentionState(prev => ({
      ...prev,
      detectedState: 'focused',
      attentionDrifted: false,
      driftSeconds: 0,
      visualPulseActive: false,
      gentleToneModalOpen: false,
      phoneAlertOpen: false,
      sleepingAlertOpen: false,
      awayAlertOpen: false
    }));
  };

  const handleAnalyzeFrameSnapshot = async (imageBase64: string) => {
    setAttentionState(prev => ({ ...prev, isAnalyzingFrame: true }));
    try {
      const res = await fetch('/api/coach/attention/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });
      if (res.ok) {
        const data = await res.json();
        const state: AttentionStateKind = data.state || 'focused';
        if (state === 'using_phone') {
          handleTriggerPhoneDetected(data.coachMessage || data.reason);
        } else if (state === 'sleeping') {
          handleTriggerSleepingDetected(data.coachMessage || data.reason);
        } else if (state === 'distracted') {
          handleTriggerGazeDrift();
        } else {
          setAttentionState(prev => ({
            ...prev,
            detectedState: 'focused',
            isAnalyzingFrame: false
          }));
        }
      }
    } catch (err) {
      console.warn('Frame analysis network error:', err);
    } finally {
      setAttentionState(prev => ({ ...prev, isAnalyzingFrame: false }));
    }
  };

  const handleAddStroke = (stroke: AnnotationStroke) => {
    registerEngagement();
    setPageAnnotations(prev => {
      const existing = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: [...existing, stroke]
      };
    });
    onAddFocusPoints(2);
  };

  const handleUndoAnnotation = () => {
    registerEngagement();
    setPageAnnotations(prev => {
      const existing = prev[currentPage] || [];
      if (existing.length === 0) return prev;
      return {
        ...prev,
        [currentPage]: existing.slice(0, existing.length - 1)
      };
    });
  };

  const handleEraseStroke = (strokeId: string) => {
    registerEngagement();
    setPageAnnotations(prev => {
      const existing = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: existing.filter(s => s.id !== strokeId)
      };
    });
  };

  const handleUpdateStroke = (updatedStroke: AnnotationStroke) => {
    registerEngagement();
    setPageAnnotations(prev => {
      const existing = prev[currentPage] || [];
      return {
        ...prev,
        [currentPage]: existing.map(s => (s.id === updatedStroke.id ? updatedStroke : s))
      };
    });
  };

  const handleDeclineStillReading = () => {
    snoozedUntilRef.current[currentPage] = Date.now() + 45_000;
    setStuckState(prev => ({
      ...prev,
      interventionActive: false
    }));
    onUpdateLecture({
      ...lecture,
      baselineSecsPerPage: Math.min(240, (lecture.baselineSecsPerPage || 90) + 15)
    });
  };

  const handleOpenHelpIntervention = () => {
    setStuckState(prev => ({
      ...prev,
      interventionActive: true
    }));
  };

  const handleSelectPage = (pageNumber: number) => {
    registerEngagement();
    setCurrentPage(pageNumber);
    onUpdateLecture({
      ...lecture,
      currentPage: pageNumber
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) handleSelectPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < lecture.totalPages) handleSelectPage(currentPage + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (currentPage < lecture.totalPages) handleSelectPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentPage > 1) handleSelectPage(currentPage - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, lecture.totalPages]);

  return (
    <div
      dir={dir}
      className={`h-screen w-screen flex flex-col overflow-hidden selection:bg-[#0F172A] selection:text-white transition-colors duration-300 ${isDarkMode ? 'bg-[#0B0F17] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}
      onMouseMove={registerEngagement}
      onKeyDown={registerEngagement}
    >
      {/* ─── 1. TOP HEADER TOOLBAR (APPLE MINIMALIST) ─────────────── */}
      <header className={`h-16 backdrop-blur-md border-b px-6 flex items-center justify-between shrink-0 select-none z-30 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/90 border-slate-200/80'}`}>

        {/* Start: Return + Document Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            id="study-room-back-btn"
            onClick={onReturnHome}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors border ${isDarkMode ? 'hover:bg-slate-800 text-slate-300 border-slate-700/60' : 'hover:bg-slate-100 text-slate-600 border-transparent hover:border-slate-200'}`}
            title={t('workspace.backHome', 'العودة للرئيسية')}
          >
            {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          <div className="min-w-0">
            <h1 className={`text-sm font-bold truncate max-w-[200px] sm:max-w-xs ${isDarkMode ? 'text-white' : 'text-[#0F172A]'}`}>
              {lecture.title}
            </h1>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {lecture.subject || t('home.general', 'عام')} · {currentSlide.topic || t('workspace.slide', 'شريحة {page}').replace('{page}', String(currentPage))}
            </p>
          </div>
        </div>

        {/* Center: Pomodoro Capsule + Annotation Toolbar + Zoom */}
        <div className="flex items-center gap-3">

          {/* مؤقت بومودورو */}
          <PomodoroTimer
            lectureId={lecture.id}
            onPomodoroComplete={() => onAddFocusPoints(10)}
            onAddFocusPoints={onAddFocusPoints}
          />

          {/* شريط أدوات الرسم والتحديد */}
          <div className={`flex items-center p-1 rounded-2xl border gap-1 transition-colors ${isDarkMode ? 'bg-slate-800/90 border-slate-700/80' : 'bg-slate-100/80 border-slate-200/60'}`}>

            {/* أداة القلم */}
            <button
              type="button"
              id="annotation-tool-pen-btn"
              onClick={() => { setActiveTool('pen'); setActiveColor(PEN_COLOR_OPTIONS[0].color); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTool === 'pen' ? (isDarkMode ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-[#0F172A] shadow-xs') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
              title={t('workspace.penDesc', 'قلم - كتابة وتدوين')}
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">{t('workspace.pen', 'قلم')}</span>
            </button>

            {/* أداة التظليل */}
            <button
              type="button"
              id="annotation-tool-highlighter-btn"
              onClick={() => { setActiveTool('highlighter'); setActiveColor(MARKER_COLOR_OPTIONS[0].color); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTool === 'highlighter' ? (isDarkMode ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-[#0F172A] shadow-xs') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
              title={t('workspace.highlighter', 'تظليل')}
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">{t('workspace.highlighter', 'تظليل')}</span>
            </button>

            {/* أداة الممحاة */}
            <button
              type="button"
              id="annotation-tool-eraser-btn"
              onClick={() => setActiveTool('eraser')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTool === 'eraser' ? (isDarkMode ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-[#0F172A] shadow-xs') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
              title={t('workspace.eraser', 'ممحاة')}
            >
              <Eraser className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">{t('workspace.eraser', 'ممحاة')}</span>
            </button>

            {/* أداة النص */}
            <button
              type="button"
              id="annotation-tool-text-btn"
              onClick={() => { setActiveTool('text'); setActiveColor(PEN_COLOR_OPTIONS[0].color); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTool === 'text' ? (isDarkMode ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-[#0F172A] shadow-xs') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}
              title={t('workspace.textBox', 'مربع نص')}
            >
              <Type className="w-3.5 h-3.5 text-purple-500" />
              <span className="hidden sm:inline">{t('workspace.text', 'نص')}</span>
            </button>

            {/* ألوان القلم: التوضيح يظهر أسفل كل لون مباشرة */}
            {(activeTool === 'pen' || activeTool === 'text') && (
              <div className={`flex items-center gap-2 px-2 border-r mr-1 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                {PEN_COLOR_OPTIONS.map(opt => (
                  <div key={opt.id} className="relative group flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setActiveColor(opt.color)}
                      className={`w-4 h-4 rounded-full transition-all ${activeColor === opt.color ? 'scale-125 ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-300' : 'opacity-65 hover:opacity-100 hover:scale-110'}`}
                      style={{ backgroundColor: opt.color }}
                      title={isAr ? `${opt.name} - ${opt.meaning}` : `${opt.nameEn || opt.name} - ${opt.meaningEn || opt.meaning}`}
                    />
                    {/* التوضيح أسفل اللون مباشرة */}
                    <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-800 border border-slate-700/80 text-white text-[11px] rounded-xl px-3 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-xl flex flex-col items-center gap-0.5">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900/95 dark:bg-slate-800 border-t border-l border-slate-700/80" />
                      <span className="font-bold relative z-10">{isAr ? opt.name : (opt.nameEn || opt.name)}</span>
                      <span className="text-slate-300 dark:text-slate-400 text-[10px] relative z-10">{isAr ? opt.meaning : (opt.meaningEn || opt.meaning)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ألوان التظليل: التوضيح يظهر أسفل كل لون مباشرة */}
            {activeTool === 'highlighter' && (
              <div className={`flex items-center gap-2 px-2 border-r mr-1 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                {MARKER_COLOR_OPTIONS.map(opt => (
                  <div key={opt.id} className="relative group flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setActiveColor(opt.color)}
                      className={`w-4 h-4 rounded-full transition-all ${activeColor === opt.color ? 'scale-125 ring-2 ring-offset-1 ring-slate-400 dark:ring-slate-300' : 'opacity-65 hover:opacity-100 hover:scale-110'}`}
                      style={{ backgroundColor: opt.dotColor }}
                      title={isAr ? `${opt.name} - ${opt.meaning}` : `${opt.nameEn || opt.name} - ${opt.meaningEn || opt.meaning}`}
                    />
                    {/* التوضيح أسفل اللون مباشرة */}
                    <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-800 border border-slate-700/80 text-white text-[11px] rounded-xl px-3 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-xl flex flex-col items-center gap-0.5">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900/95 dark:bg-slate-800 border-t border-l border-slate-700/80" />
                      <span className="font-bold relative z-10">{isAr ? opt.name : (opt.nameEn || opt.name)}</span>
                      <span className="text-slate-300 dark:text-slate-400 text-[10px] relative z-10">{isAr ? opt.meaning : (opt.meaningEn || opt.meaning)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* زر التراجع */}
            <button
              type="button"
              id="annotation-tool-undo-btn"
              onClick={handleUndoAnnotation}
              className={`p-1.5 rounded-xl transition-colors mr-0.5 ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-500 hover:text-slate-900'}`}
              title={t('workspace.undo', 'تراجع')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* أدوات التكبير والتصغير */}
          <div className={`hidden lg:flex items-center gap-1 p-1 rounded-2xl border text-xs ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100/80 border-slate-200/60'}`}>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(75, prev - 15))}
              className={`p-1.5 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-500 hover:text-slate-900'}`}
              title={t('workspace.zoomOut', 'تصغير')}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(140, prev + 15))}
              className={`p-1.5 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-500 hover:text-slate-900'}`}
              title={t('workspace.zoomIn', 'تكبير')}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* End: Language Selector + Dark Mode Toggle + Finish Studying Button */}
        <div className="flex items-center gap-3">
          {/* محول اللغة */}
          <LanguageSelector />

          {/* زر الوضع الداكن */}
          <ThemeToggle />

          {/* زر إنهاء الجلسة */}
          <button
            type="button"
            onClick={() => setWrapUpModalOpen(true)}
            className="text-xs px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 dark:text-blue-200" />
            <span>{t('workspace.finishSession', 'إنهاء الجلسة')}</span>
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN BODY (SIDEBAR + SLIDE SHEET) ──────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        <StudySidebar
          slides={lecture.slides}
          currentPage={currentPage}
          onSelectPage={handleSelectPage}
          cameraActive={attentionState.cameraActive}
          onToggleCamera={handleToggleCamera}
          cameraStream={cameraStream}
          cameraConsentGiven={attentionState.cameraConsentGiven}
          onOpenConsentModal={() =>
            setAttentionState(prev => ({ ...prev, cameraConsentModalOpen: true }))
          }
          attentionDrifted={attentionState.attentionDrifted}
          detectedState={attentionState.detectedState}
          isAnalyzingFrame={attentionState.isAnalyzingFrame}
          onTriggerPhoneDetected={handleTriggerPhoneDetected}
          onTriggerSleepingDetected={handleTriggerSleepingDetected}
          onTriggerAwayDetected={handleTriggerAwayDetected}
          onTriggerGazeDrift={handleTriggerGazeDrift}
          onTriggerFocused={handleTriggerFocused}
          onAnalyzeFrameSnapshot={handleAnalyzeFrameSnapshot}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        />

        {/* Central Document Canvas Area */}
        <main
          ref={documentContainerRef}
          className={`flex-1 overflow-auto p-6 sm:p-10 flex justify-center items-start transition-all relative ${attentionState.visualPulseActive ? 'ring-4 ring-amber-400/40' : ''} ${isDarkMode ? 'bg-slate-950' : ''}`}
        >
          {/* Previous Slide Floating Button */}
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className={`sticky ${isAr ? 'right-0 ml-4' : 'left-0 mr-4'} top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border shadow-md flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                : 'bg-white/95 hover:bg-white border-slate-200 text-slate-700'
            }`}
            title={isAr ? "الشريحة السابقة" : "Previous Slide"}
          >
            {isAr ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>

          {/* Document Sheet Container */}
          <div
            id="study-document-page-sheet"
            className={`relative rounded-3xl border shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 shrink-0 ${isDarkMode ? 'border-slate-700/60' : 'border-slate-200/80 bg-white'}`}
            style={{
              width: `${(zoomLevel / 100) * 880}px`,
              minHeight: `${(zoomLevel / 100) * 620}px`
            }}
          >
            <SlideViewer slide={currentSlide} totalSlides={lecture.totalPages} isDarkMode={isDarkMode} />

            <AnnotationCanvas
              activeTool={activeTool}
              activeColor={activeColor}
              isDarkMode={isDarkMode}
              strokes={pageAnnotations[currentPage] || []}
              onAddStroke={handleAddStroke}
              onUpdateStroke={handleUpdateStroke}
              onEraseStroke={handleEraseStroke}
              width={(zoomLevel / 100) * 880}
              height={(zoomLevel / 100) * 620}
            />
          </div>

          {/* Next Slide Floating Button */}
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= lecture.totalPages}
            className={`sticky ${isAr ? 'left-0 mr-4' : 'right-0 ml-4'} top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border shadow-md flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                : 'bg-white/95 hover:bg-white border-slate-200 text-slate-700'
            }`}
            title={isAr ? "الشريحة التالية" : "Next Slide"}
          >
            {isAr ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </main>
      </div>

      {/* ─── 3. TOASTS & INTERVENTIONS ─────────────────────────────── */}
      {attentionState.tabSwitchToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-white/95 border border-slate-200 shadow-xl text-xs font-semibold text-[#0F172A] flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
        >
          <span>{attentionState.tabSwitchToast.message}</span>
        </div>
      )}

      <StuckInterventionCard
        isOpen={stuckState.interventionActive}
        specialistOffered={stuckState.specialistOffered}
        onChooseQuiz={() => {
          setStuckState(prev => ({ ...prev, interventionActive: false }));
          setQuickQuizModalOpen(true);
        }}
        onChooseUnderstanding={() => {
          setStuckState(prev => ({ ...prev, interventionActive: false }));
          setUnderstandingModalOpen(true);
        }}
        onChooseSummarize={() => {
          setStuckState(prev => ({ ...prev, interventionActive: false }));
          setUnderstandingModalOpen(true);
        }}
        onDeclineStillReading={handleDeclineStillReading}
      />

      {/* Floating Action Help Trigger */}
      {!stuckState.interventionActive && (
        <button
          type="button"
          onClick={handleOpenHelpIntervention}
          className={`fixed bottom-6 left-6 z-30 flex items-center gap-2.5 px-4 py-3 text-white text-xs font-semibold rounded-2xl shadow-xl transition-all hover:scale-105 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-[#0F172A] hover:bg-[#1E293B]'}`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <HelpCircle className="w-4 h-4 text-blue-300" />
          <span>{t('help.needHelp', 'تحتاج مساعدة في هذه الشريحة؟')}</span>
        </button>
      )}

      {/* Modals */}
      <WrapUpModal
        isOpen={wrapUpModalOpen}
        onClose={() => setWrapUpModalOpen(false)}
        onReturnHome={onReturnHome}
        lecture={lecture}
        sessionSeconds={sessionSeconds}
      />

      <UnderstandingModal
        isOpen={understandingModalOpen}
        onClose={() => setUnderstandingModalOpen(false)}
        slide={currentSlide}
        lectureTitle={lecture.title}
      />

      <ExplainDrawer
        isOpen={explainDrawerOpen}
        onClose={() => setExplainDrawerOpen(false)}
        slide={currentSlide}
        allSlides={lecture.slides}
        lectureTitle={lecture.title}
      />

      <QuickQuizModal
        isOpen={quickQuizModalOpen}
        onClose={() => setQuickQuizModalOpen(false)}
        slide={currentSlide}
        lectureTitle={lecture.title}
      />

      <CameraConsentModal
        isOpen={attentionState.cameraConsentModalOpen}
        onClose={() =>
          setAttentionState(prev => ({ ...prev, cameraConsentModalOpen: false }))
        }
        onConfirmConsent={handleConfirmCameraConsent}
      />

      <GentleToneModal
        isOpen={attentionState.gentleToneModalOpen}
        onConfirmPresent={() => {
          setAttentionState(prev => ({
            ...prev,
            gentleToneModalOpen: false,
            attentionDrifted: false,
            visualPulseActive: false,
            driftSeconds: 0
          }));
        }}
        onTakeBreak={() => {
          setAttentionState(prev => ({
            ...prev,
            gentleToneModalOpen: false,
            attentionDrifted: false,
            visualPulseActive: false,
            driftSeconds: 0
          }));
          onReturnHome();
        }}
      />

      <PhoneAlertModal
        isOpen={attentionState.phoneAlertOpen}
        coachMessage={attentionState.detectionReason}
        onDismiss={() => {
          setAttentionState(prev => ({
            ...prev,
            phoneAlertOpen: false,
            attentionDrifted: false,
            detectedState: 'focused'
          }));
        }}
        onTakeBreak={() => {
          setAttentionState(prev => ({
            ...prev,
            phoneAlertOpen: false,
            attentionDrifted: false,
            detectedState: 'focused'
          }));
          onReturnHome();
        }}
      />

      <SleepingAlertModal
        isOpen={attentionState.sleepingAlertOpen}
        coachMessage={attentionState.detectionReason}
        onDismiss={() => {
          setAttentionState(prev => ({
            ...prev,
            sleepingAlertOpen: false,
            attentionDrifted: false,
            detectedState: 'focused'
          }));
        }}
        onTakeBreak={() => {
          setAttentionState(prev => ({
            ...prev,
            sleepingAlertOpen: false,
            attentionDrifted: false,
            detectedState: 'focused'
          }));
          onReturnHome();
        }}
      />

      <AwayAlertModal
        isOpen={attentionState.awayAlertOpen}
        coachMessage={attentionState.detectionReason}
        onDismiss={() => {
          setAttentionState(prev => ({
            ...prev,
            awayAlertOpen: false,
            attentionDrifted: false,
            detectedState: 'focused'
          }));
        }}
        onTakeBreak={() => {
          setAttentionState(prev => ({
            ...prev,
            awayAlertOpen: false,
            attentionDrifted: false,
            detectedState: 'focused'
          }));
          onReturnHome();
        }}
      />

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onLectureCreated={newLecture => {
          if (onUploadLecture) {
            onUploadLecture(newLecture);
          } else {
            onUpdateLecture(newLecture);
          }
          setCurrentPage(1);
        }}
      />
    </div>
  );
};