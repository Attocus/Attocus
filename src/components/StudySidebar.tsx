import React, { useRef, useEffect, useState } from 'react';

import { Slide, AttentionStateKind } from '../types';
import {
  Video,
  VideoOff,
  Eye,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Smartphone,
  Moon,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

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
  onTriggerGazeDrift: () => void;
  onTriggerFocused: () => void;
  onAnalyzeFrameSnapshot: (dataUrl: string) => Promise<void>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ALERT_THRESHOLD_MS = 1500;
const GRACE_PERIOD_MS = 1500;

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
  onTriggerGazeDrift,
  onTriggerFocused,
  onAnalyzeFrameSnapshot,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [autoScanEnabled] = useState(true);

  // مراجع التتبع والتحكم
  const phoneStartTimeRef = useRef<number | null>(null);
  const lastPhoneSeenTimeRef = useRef<number | null>(null);

  const sleepyStartTimeRef = useRef<number | null>(null);
  const lastSleepySeenTimeRef = useRef<number | null>(null);

  // منع تكرار الإشعار عدة مرات
  const phoneAlertFiredRef = useRef<boolean>(false);
  const sleepAlertFiredRef = useRef<boolean>(false);

  const lastAudioPlayTimeRef = useRef<number>(0);

  const callbacksRef = useRef({
    onTriggerPhoneDetected,
    onTriggerSleepingDetected,
    onTriggerGazeDrift,
    onTriggerFocused
  });

  useEffect(() => {
    callbacksRef.current = {
      onTriggerPhoneDetected,
      onTriggerSleepingDetected,
      onTriggerGazeDrift,
      onTriggerFocused
    };
  }, [onTriggerPhoneDetected, onTriggerSleepingDetected, onTriggerGazeDrift, onTriggerFocused]);

  // الصوت الأصلي الدقيق الموجود في index.html (C5 + E5)
  const triggerAudioAlert = () => {
    const now = Date.now();
    if (now - lastAudioPlayTimeRef.current < 1500) return;
    lastAudioPlayTimeRef.current = now;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // النغمة الأولى (C5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.3);

      // النغمة الثانية (E5) بعد 150ms
      setTimeout(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
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
      phoneStartTimeRef.current = null;
      lastPhoneSeenTimeRef.current = null;
      sleepyStartTimeRef.current = null;
      lastSleepySeenTimeRef.current = null;
      phoneAlertFiredRef.current = false;
      sleepAlertFiredRef.current = false;
      return;
    }

    const socket = new WebSocket('ws://127.0.0.1:8000/ws/detect');
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to Python Attention Monitor WebSocket Server');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const now = Date.now();

        // 1. معالجة حالة كشف الجوال
        if (data.phone_detected) {
          lastPhoneSeenTimeRef.current = now;
          if (!phoneStartTimeRef.current) phoneStartTimeRef.current = now;
        } else {
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
          if (elapsed >= ALERT_THRESHOLD_MS) {
            triggerAudioAlert();

            if (!phoneAlertFiredRef.current) {
              phoneAlertFiredRef.current = true;
              callbacksRef.current.onTriggerPhoneDetected(
                `Phone detected in hand! (${data.confidence || 90}% confidence)`
              );
            }
          }
        }

        // 2. معالجة حالة كشف النعاس
        if (data.is_sleepy) {
          lastSleepySeenTimeRef.current = now;
          if (!sleepyStartTimeRef.current) sleepyStartTimeRef.current = now;
        } else {
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
          if (elapsed >= ALERT_THRESHOLD_MS) {
            triggerAudioAlert();

            if (!sleepAlertFiredRef.current) {
              sleepAlertFiredRef.current = true;
              callbacksRef.current.onTriggerSleepingDetected(
                'Drowsiness or eye closure detected!'
              );
            }
          }
        }

        // 3. عودة الحالة إلى التركيز تلقائياً إذا لم يعد هناك جوال أو نعاس
        if (
          !phoneStartTimeRef.current &&
          !sleepyStartTimeRef.current &&
          (phoneAlertFiredRef.current || sleepAlertFiredRef.current)
        ) {
          phoneAlertFiredRef.current = false;
          sleepAlertFiredRef.current = false;
          callbacksRef.current.onTriggerFocused();
        }
      } catch (err) {
        console.error('Error parsing WebSocket response:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };

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

  if (isCollapsed) {
    return (
      <aside className="w-12 h-full border-r border-[#E6E8E2] bg-[#FDFDFC] flex flex-col items-center py-3 select-none shrink-0 transition-all duration-300">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-[#F2F4F0] text-[#555A60] transition-colors mb-4"
          title="Expand Sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>

        <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto w-full px-1">
          {slides.map((slide) => {
            const isCurrent = slide.pageNumber === currentPage;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => onSelectPage(slide.pageNumber)}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono transition-all ${isCurrent
                  ? 'bg-[#2E7D32] text-white font-bold'
                  : 'bg-[#E5E7E2] text-[#555A60] hover:bg-[#DCDED8]'
                  }`}
                title={`Slide ${slide.pageNumber}: ${slide.title}`}
              >
                {slide.pageNumber}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 h-full border-r border-[#E6E8E2] bg-[#FDFDFC] flex flex-col justify-between select-none overflow-hidden shrink-0 transition-all duration-300">
      <div className="p-3 border-b border-[#E8EAE4] bg-[#F7F8F5] flex items-center justify-between">
        <span className="text-xs font-bold text-[#3D4247] uppercase tracking-wider">
          Study Workspace
        </span>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md hover:bg-[#EAECE6] text-[#555A60] transition-colors flex items-center gap-1 text-xs"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
            <span className="text-[11px] font-medium">Hide</span>
          </button>
        )}
      </div>

      <div className="p-4 border-b border-[#E8EAE4] bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-colors ${cameraActive && detectedState === 'focused'
                ? 'bg-[#2E7D32] animate-pulse'
                : cameraActive && detectedState === 'using_phone'
                  ? 'bg-[#DC2626] animate-ping'
                  : cameraActive && detectedState === 'sleeping'
                    ? 'bg-[#2563EB]'
                    : cameraActive && (detectedState === 'distracted' || attentionDrifted)
                      ? 'bg-[#E65100]'
                      : 'bg-[#9E9E9E]'
                }`}
            />
            <span className="text-xs font-semibold text-[#303336] tracking-tight">
              {cameraActive
                ? detectedState === 'using_phone'
                  ? 'Phone Detected 📱'
                  : detectedState === 'sleeping'
                    ? 'Sleeping Detected 💤'
                    : detectedState === 'distracted' || attentionDrifted
                      ? 'Attention Drifted'
                      : 'Attention Monitor: Active'
                : 'Attention Monitor: Off'}
            </span>
          </div>

          <button
            type="button"
            id="toggle-attention-camera-btn"
            onClick={() => {
              if (!cameraConsentGiven) {
                onOpenConsentModal();
              } else {
                onToggleCamera();
              }
            }}
            className="text-xs px-2.5 py-1 rounded-md border border-[#D9DCD4] hover:bg-[#F4F5F1] text-[#4A4E53] font-medium transition-colors flex items-center gap-1.5"
            title={cameraActive ? 'Switch off camera monitoring' : 'Enable attention monitoring'}
          >
            {cameraActive ? (
              <>
                <VideoOff className="w-3 h-3 text-[#B71C1C]" />
                <span>Turn Off</span>
              </>
            ) : (
              <>
                <Video className="w-3 h-3 text-[#2E7D32]" />
                <span>Enable</span>
              </>
            )}
          </button>
        </div>

        {cameraActive ? (
          <div className="relative rounded-xl overflow-hidden bg-[#1E2022] aspect-video border border-[#DCDED8] shadow-2xs group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror -scale-x-100"
            />

            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-white flex items-center gap-1 font-mono">
              <Eye className="w-2.5 h-2.5 text-emerald-400" />
              <span>Gaze & State</span>
            </div>

            {isAnalyzingFrame && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-emerald-300 flex items-center gap-1 font-mono">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Scanning</span>
              </div>
            )}

            {detectedState === 'using_phone' && (
              <div className="absolute inset-0 bg-red-600/30 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-2.5 py-1 rounded-md bg-white/95 shadow-xs text-[11px] font-bold text-[#DC2626] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Phone In Hand</span>
                </div>
              </div>
            )}

            {detectedState === 'sleeping' && (
              <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-2.5 py-1 rounded-md bg-white/95 shadow-xs text-[11px] font-bold text-[#2563EB] flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Eyes Closed / Sleeping</span>
                </div>
              </div>
            )}

            {(detectedState === 'distracted' || attentionDrifted) && detectedState !== 'using_phone' && detectedState !== 'sleeping' && (
              <div className="absolute inset-0 bg-amber-500/25 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-2.5 py-1 rounded-md bg-white/95 shadow-xs text-[11px] font-medium text-[#B24100] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#E65100]" />
                  <span>Attention Drifted</span>
                </div>
              </div>
            )}

            <div className="absolute bottom-1 right-2 text-[9px] text-white/70">
              Private · On-device
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#D5D8D0] p-4 bg-[#F9FAF7] text-center">
            <VideoOff className="w-5 h-5 text-[#8D9299] mx-auto mb-1.5" />
            <p className="text-xs text-[#52575D] font-medium">Camera tracking paused</p>
            <p className="text-[11px] text-[#7A8086] mt-0.5 leading-snug">
              Monitors attention, phone distraction, and fatigue.
            </p>
            <button
              type="button"
              id="activate-camera-monitor-prompt-btn"
              onClick={() => {
                if (!cameraConsentGiven) {
                  onOpenConsentModal();
                } else {
                  onToggleCamera();
                }
              }}
              className="mt-2.5 text-xs px-3 py-1.5 rounded-md bg-[#25282A] text-white hover:bg-[#383C40] transition-colors font-medium inline-flex items-center gap-1"
            >
              <Video className="w-3 h-3" />
              <span>Start Attention Monitor</span>
            </button>
          </div>
        )}

        {cameraActive && (
          <div className="mt-2.5 pt-2 border-t border-[#ECEEE8] flex items-center justify-between text-[11px] text-[#6D7278]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              <span>Camera monitoring active</span>
            </span>
            <span className="text-[10px] text-[#8C9298]">On-device</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-[#E8EAE4] bg-[#F7F8F5] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#454A50] tracking-wide uppercase">
            Contents & Topics
          </span>
          <span className="text-xs text-[#7B8188]">
            {slides.length} slides
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y-0">
          {slides.map((slide) => {
            const isCurrent = slide.pageNumber === currentPage;
            return (
              <button
                key={slide.id}
                id={`sidebar-slide-link-${slide.pageNumber}`}
                type="button"
                onClick={() => onSelectPage(slide.pageNumber)}
                className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 ${isCurrent
                  ? 'bg-[#EDF2EC] border border-[#CDE0CC] text-[#1E3A24]'
                  : 'hover:bg-[#F2F4F0] border border-transparent text-[#383D42]'
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 ${isCurrent
                    ? 'bg-[#2E7D32] text-white font-bold'
                    : 'bg-[#E5E7E2] text-[#555A60]'
                    }`}
                >
                  {slide.pageNumber}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate leading-snug">
                    {slide.title}
                  </div>
                  <div className="text-[11px] text-[#697076] truncate mt-0.5 flex items-center gap-1.5">
                    <span className="inline-block w-1 h-1 rounded-full bg-[#A8ADB2]" />
                    <span>{slide.topic}</span>
                  </div>
                </div>

                {isCurrent && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#2E7D32] shrink-0 mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-t border-[#E8EAE4] bg-[#F7F8F5] text-[11px] text-[#71777E] flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#546E7A] shrink-0" />
        <span className="leading-tight">
          Private study room · Annotations & video never stored
        </span>
      </div>
    </aside>
  );
};