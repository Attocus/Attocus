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
  Brain,
  CheckCircle2,
  X,
  Maximize2,
  Upload
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
import { useAuth } from '../contexts/AuthContext';
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
  const [showToolLabel, setShowToolLabel] = useState<boolean>(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Annotation states: 3 Pens, 4 Markers, Undo
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'none'>('pen');
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

  // Attention Tracking State (with phone, sleep, and gaze detection)
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

  // Calculate expected page time based on density score and student baseline
  useEffect(() => {
    const density = currentSlide.densityScore || 3;
    const base = lecture.baselineSecsPerPage || 90;
    // Density 1: 0.7x base, Density 5: 1.5x base
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

  // Load cloud annotations when user or lecture changes
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

  // Persist annotations locally and to Firestore
  useEffect(() => {
    try {
      localStorage.setItem(`annotations-${lecture.id}`, JSON.stringify(pageAnnotations));
    } catch {}

    if (currentUser && Object.keys(pageAnnotations).length > 0) {
      saveAnnotationsToFirestore(currentUser.uid, lecture.id, pageAnnotations);
    }
  }, [pageAnnotations, lecture.id, currentUser]);

  // Record user engagement (scrolling, drawing, clicking) without restarting intervals
  const registerEngagement = useCallback(() => {
    lastActivityTimestampRef.current = Date.now();
    setStuckState(prev => ({ ...prev, isActivelyEngaging: true }));
  }, []);

  // Main 1-second interval loop for timers & stuck orchestrator
  useEffect(() => {
    const interval = setInterval(() => {
      // If tab is hidden, pause timers
      if (document.hidden) return;

      setSessionSeconds(prev => prev + 1);
      setPageTimeSeconds(prev => {
        const nextTime = prev + 1;
        
        // Check stuck level transitions
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

          // Trigger intervention if student is on slide for expected duration or >= 45s without page turn
          if (overrunRatio >= 1.0 || nextTime >= 50) {
            newLevel = isEngaging ? 2 : 3;
            // Intervene after expected duration or when reading pace stalls
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

      // Camera attention drift simulation/tracking
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

  // Attention Tracking Case A: Tab Switching & Orchestrator Integration
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Tab hidden / switched away
        tabHiddenTimestampRef.current = Date.now();
        tabSwitchesCountRef.current += 1;
      } else {
        // Returned to tab
        const awayMs = tabHiddenTimestampRef.current ? (Date.now() - tabHiddenTimestampRef.current) : 0;
        const awaySeconds = awayMs / 1000;
        totalAwaySecondsRef.current += awaySeconds;
        tabHiddenTimestampRef.current = null;

        // Default instant feedback
        let coachMsg = "أهلاً بعودتك! 👋 لنكمل التركيز معاً";
        setAttentionState(prev => ({
          ...prev,
          tabSwitchToast: {
            show: true,
            timestamp: Date.now(),
            message: coachMsg
          }
        }));

        // Send telemetry to Python Orchestrator
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
        } catch (e) {
          // Keep default toast
        }

        // Auto dismiss toast after 5 seconds
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

  // Camera Management
  const handleToggleCamera = async () => {
    if (attentionState.cameraActive) {
      // Turn off
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
      // Turn on
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported on this browser or secure context');
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
        console.warn('Camera access not granted or unavailable:', err);
        const isBlocked = err?.name === 'NotAllowedError' || err?.message?.toLowerCase().includes('permission') || err?.message?.toLowerCase().includes('denied');
        if (isBlocked) {
          alert('Camera permission was blocked by your browser or iframe. To enable live attention tracking, click the camera icon in your browser address bar to allow permissions, or open the app in a new tab.');
        } else {
          alert(`Camera could not be started: ${err?.message || 'No video device found'}`);
        }
        setAttentionState(prev => ({
          ...prev,
          cameraActive: false
        }));
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

  const handleTriggerTestDrift = () => {
    setAttentionState(prev => ({
      ...prev,
      attentionDrifted: !prev.attentionDrifted,
      driftSeconds: !prev.attentionDrifted ? 1 : 0,
      visualPulseActive: false,
      gentleToneModalOpen: false,
      detectedState: !prev.attentionDrifted ? 'distracted' : 'focused'
    }));
  };

  const sendAttentionTelemetry = async (cvPayload?: { state: string; confidence: number }) => {
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
          last_away_duration_seconds: 0,
          total_away_seconds: totalAwaySecondsRef.current,
          time_since_interaction: (Date.now() - lastActivityTimestampRef.current) / 1000,
          cv_data: cvPayload,
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
            }
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to send attention telemetry to Orchestrator:', e);
    }
  };

  const handleTriggerPhoneDetected = (reason?: string) => {
    setAttentionState(prev => ({
      ...prev,
      detectedState: 'using_phone',
      detectionReason: reason || 'Phone detected in hands.',
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
      detectionReason: reason || 'Resting head on desk or eyes closed.',
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
      detectionReason: reason || 'Stepped away from your study desk.',
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

  // Annotation Stroke Handlers
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

  // Stuck Intervention Actions
  const handleDeclineStillReading = () => {
    // Snooze automated coach intervention for 45s so student can keep reading calmly
    snoozedUntilRef.current[currentPage] = Date.now() + 45_000;
    setStuckState(prev => ({
      ...prev,
      interventionActive: false
    }));

    // Quietly raise expected baseline by 15 seconds
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
    if (currentPage > 1) {
      handleSelectPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < lecture.totalPages) {
      handleSelectPage(currentPage + 1);
    }
  };

  // Keyboard Arrow Navigation between slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (currentPage < lecture.totalPages) {
          handleSelectPage(currentPage + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentPage > 1) {
          handleSelectPage(currentPage - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, lecture.totalPages]);

  return (
    <div
      className="h-screen w-screen bg-[#F4F5F1] text-[#202326] flex flex-col overflow-hidden selection:bg-[#E8F0E6]"
      onMouseMove={registerEngagement}
      onKeyDown={registerEngagement}
    >
      {/* 1. TOP HEADER TOOLBAR */}
      <header className="h-14 bg-white border-b border-[#E2E5DC] px-4 flex items-center justify-between shrink-0 select-none z-30 shadow-2xs">
        {/* Left: Back + Document Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            id="study-room-back-btn"
            onClick={onReturnHome}
            className="w-8 h-8 rounded-lg hover:bg-[#F2F4F0] flex items-center justify-center text-[#585E64] transition-colors"
            title="Return to Home"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-serif font-bold text-[#191C1E] truncate max-w-[180px] sm:max-w-xs">
                {lecture.title}
              </h1>
              <button
                type="button"
                id="study-room-upload-btn"
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-[#2E7D32] bg-[#E8F0E6] hover:bg-[#DCE8D8] transition-colors shrink-0 cursor-pointer"
                title="Upload or switch lecture slides"
              >
                <Upload className="w-3 h-3" />
                <span className="hidden sm:inline">Upload File</span>
              </button>
            </div>
            <p className="text-[10px] text-[#71777E] truncate">
              {lecture.subject} · {currentSlide.topic}
            </p>
          </div>
        </div>

        {/* Center: Pomodoro Timer + Annotation Toolbar + Page Nav */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Per-File Pomodoro Timer */}
          <PomodoroTimer
            lectureId={lecture.id}
            onPomodoroComplete={() => onAddFocusPoints(10)}
          />

          {/* Annotation Tools: 4 Pens, 4 Markers, Undo */}
          <div className="flex items-center bg-[#F4F6F2] p-1 rounded-xl border border-[#DCE0D6] gap-1">
            {/* Pen Tool Toggle */}
            <button
              type="button"
              id="annotation-tool-pen-btn"
              onClick={() => {
                setActiveTool('pen');
                setActiveColor(PEN_COLOR_OPTIONS[0].color);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTool === 'pen'
                  ? 'bg-white text-[#1D2023] shadow-xs'
                  : 'text-[#61686F] hover:text-[#222629]'
              }`}
              title="Pen (4 colors: Key Pen = Key Highlight, Red = Needs Review, Green = Understood, Blue = Exam Revision)"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span className="hidden sm:inline">Pen</span>
            </button>

            {/* Marker / Highlighter Tool Toggle */}
            <button
              type="button"
              id="annotation-tool-highlighter-btn"
              onClick={() => {
                setActiveTool('highlighter');
                setActiveColor(MARKER_COLOR_OPTIONS[0].color);
              }}
              className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTool === 'highlighter'
                  ? 'bg-white text-[#1D2023] shadow-xs'
                  : 'text-[#61686F] hover:text-[#222629]'
              }`}
              title="Marker (4 colors: Yellow = Key Highlight, Green = Understood, Blue = Exam Revision, Red = Needs Review)"
            >
              <Highlighter className="w-3.5 h-3.5 text-[#B8860B]" />
              <span className="hidden sm:inline">Marker</span>
            </button>

            {/* 4 Pens Palette (Key Pen: Key Highlight, Red: Needs Review, Green: Understood, Blue: Exam Revision) */}
            {activeTool === 'pen' && (
              <div className="flex items-center gap-1.5 px-1.5 border-l border-[#DFE3D8] ml-1">
                {PEN_COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setActiveColor(opt.color)}
                    className={`w-4 h-4 rounded-full transition-all relative flex items-center justify-center ${
                      activeColor === opt.color ? 'scale-125 ring-2 ring-black/40 shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.color }}
                    title={`${opt.name}: ${opt.meaning}`}
                  />
                ))}
              </div>
            )}

            {/* 4 Markers Palette (Yellow: Key Highlight, Green: Understood, Blue: Exam Revision, Red: Needs Review) */}
            {activeTool === 'highlighter' && (
              <div className="flex items-center gap-1.5 px-1.5 border-l border-[#DFE3D8] ml-1">
                {MARKER_COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setActiveColor(opt.color)}
                    className={`w-4 h-4 rounded-full transition-all relative flex items-center justify-center ${
                      activeColor === opt.color ? 'scale-125 ring-2 ring-black/40 shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.dotColor }}
                    title={`${opt.name}: ${opt.meaning}`}
                  />
                ))}
              </div>
            )}

            {/* Active tool label rectangle with hide/show toggle button */}
            {showToolLabel && (
              <span
                id="active-tool-rectangle-label"
                onClick={() => setShowToolLabel(false)}
                className="hidden xl:inline-flex items-center gap-1 text-[10px] text-[#4A5056] font-medium bg-[#E9EBE5] hover:bg-[#DFE2D9] px-2 py-0.5 rounded ml-0.5 cursor-pointer select-none transition-colors border border-transparent hover:border-[#CED3C7]"
                title="Click to hide this label"
              >
                <span>
                  {activeTool === 'pen'
                    ? (PEN_COLOR_OPTIONS.find(p => p.color === activeColor)?.name || 'Key Pen')
                    : (MARKER_COLOR_OPTIONS.find(m => m.color === activeColor)?.name || 'Marker')}
                </span>
                <X className="w-2.5 h-2.5 opacity-60 hover:opacity-100" />
              </span>
            )}

            {!showToolLabel && (
              <button
                type="button"
                id="toggle-show-tool-label-btn"
                onClick={() => setShowToolLabel(true)}
                className="hidden xl:inline-flex items-center text-[10px] text-[#6B7279] hover:text-[#2E7D32] bg-[#E9EBE5]/60 hover:bg-[#E9EBE5] px-1.5 py-0.5 rounded ml-0.5 cursor-pointer transition-colors"
                title="Show tool label"
              >
                Label
              </button>
            )}

            <button
              type="button"
              id="annotation-tool-undo-btn"
              onClick={handleUndoAnnotation}
              className="p-1 rounded-lg hover:bg-white text-[#656C74] hover:text-[#202326] transition-colors ml-0.5 cursor-pointer"
              title="Undo last stroke"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden lg:flex items-center gap-1 bg-[#F4F6F2] p-1 rounded-xl border border-[#DCE0D6] text-xs">
            <button
              type="button"
              id="zoom-out-btn"
              onClick={() => setZoomLevel(prev => Math.max(75, prev - 15))}
              className="p-1 rounded-md hover:bg-white text-[#52575C]"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-mono text-[11px] text-[#697076]">{zoomLevel}%</span>
            <button
              type="button"
              id="zoom-in-btn"
              onClick={() => setZoomLevel(prev => Math.min(140, prev + 15))}
              className="p-1 rounded-md hover:bg-white text-[#52575C]"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Ask Coach + Need Help + Natural Finish Studying Button */}
        <div className="flex items-center gap-2">
          {/* Quick Need Help Trigger */}
          <button
            type="button"
            id="study-room-need-help-header-btn"
            onClick={handleOpenHelpIntervention}
            className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 shadow-2xs ${
              stuckState.level >= 2
                ? 'bg-[#FFF8E1] border-[#FFE082] text-[#B45309] font-semibold animate-pulse'
                : 'bg-white hover:bg-[#F2F4F0] border-[#D8DBD2] text-[#4A5056] font-medium'
            }`}
            title="Need help with this slide? Open coach support"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#E65100]" />
            <span>Need Help?</span>
          </button>

          <button
            type="button"
            id="study-room-ask-coach-btn"
            onClick={() => setExplainDrawerOpen(true)}
            className="text-xs px-3 py-1.5 rounded-xl border border-[#D8DBD2] bg-white hover:bg-[#F2F4F0] text-[#3D4247] font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>Ask Coach</span>
          </button>

          {/* Important Requirement: Natural "Finish Studying" Button */}
          <button
            type="button"
            id="natural-finish-studying-btn"
            onClick={() => setWrapUpModalOpen(true)}
            className="text-xs px-3.5 py-1.5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Finish Studying</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY: SIDEBAR + DOCUMENT VIEWER CANVAS */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Updated Study Room Sidebar (Live camera + Slide contents + Phone/Sleep detection) */}
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
          className={`flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start transition-all relative ${
            attentionState.visualPulseActive ? 'ring-4 ring-amber-400/40' : ''
          }`}
        >
          {/* Quick Floating Edge Navigation: Previous Slide */}
          <button
            type="button"
            id="floating-edge-prev-slide-btn"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="sticky left-0 top-1/2 -translate-y-1/2 z-20 mr-2 sm:mr-4 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white border border-[#D5DCD0] shadow-md flex items-center justify-center text-[#4A5157] disabled:opacity-15 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs shrink-0"
            title="Previous slide (or press ← Arrow key)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#2E7D32]" />
          </button>

          {/* Document Sheet */}
          <div
            id="study-document-page-sheet"
            className="relative bg-white rounded-2xl border border-[#DFE2D9] shadow-md overflow-hidden transition-transform duration-200 shrink-0"
            style={{
              width: `${(zoomLevel / 100) * 880}px`,
              minHeight: `${(zoomLevel / 100) * 620}px`
            }}
          >
            {/* Slide Content Layer */}
            <SlideViewer slide={currentSlide} totalSlides={lecture.totalPages} />

            {/* Real Annotation Overlay Canvas Layer */}
            <AnnotationCanvas
              activeTool={activeTool}
              activeColor={activeColor}
              strokes={pageAnnotations[currentPage] || []}
              onAddStroke={handleAddStroke}
              width={(zoomLevel / 100) * 880}
              height={(zoomLevel / 100) * 620}
            />
          </div>

          {/* Quick Floating Edge Navigation: Next Slide */}
          <button
            type="button"
            id="floating-edge-next-slide-btn"
            onClick={handleNextPage}
            disabled={currentPage >= lecture.totalPages}
            className="sticky right-0 top-1/2 -translate-y-1/2 z-20 ml-2 sm:ml-4 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/95 hover:bg-white border border-[#D5DCD0] shadow-md flex items-center justify-center text-[#4A5157] disabled:opacity-15 disabled:pointer-events-none transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-xs shrink-0"
            title="Next slide (or press → Arrow key)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#2E7D32]" />
          </button>
        </main>
      </div>

      {/* 3. FLOATING OVERLAYS & TOASTS */}

      {/* Attention Tracking Toast A: Tab switching return notification */}
      {attentionState.tabSwitchToast && (
        <div
          id="tab-return-encouragement-toast"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-white/95 border border-[#D5DCD0] shadow-md text-xs font-medium text-[#2E7D32] flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <span>{attentionState.tabSwitchToast.message || "Welcome back 👋 Let's get focused again"}</span>
        </div>
      )}

      {/* Stuck Detection Intervention Card */}
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

      {/* Floating Quick Help Trigger: always accessible so student can summon the coach at any moment */}
      {!stuckState.interventionActive && (
        <button
          type="button"
          id="quick-stuck-help-floating-btn"
          onClick={handleOpenHelpIntervention}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-3.5 py-2.5 bg-white/95 hover:bg-[#F4F6F1] border border-[#CCD2C5] text-[#2E7D32] text-xs font-semibold rounded-2xl shadow-md transition-all hover:scale-105 backdrop-blur-xs cursor-pointer group"
          title="Click anytime you want help on this slide"
        >
          <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
          <HelpCircle className="w-4 h-4 text-[#2E7D32]" />
          <span>Need help on this slide?</span>
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

      {/* Phone Spotted Modal */}
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

      {/* Sleeping / Eyes Closed Modal */}
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

      {/* Stepped Away / Empty Desk Modal */}
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

      {/* Upload Modal to easily switch or import slides directly in the room */}
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
