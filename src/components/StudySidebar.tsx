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
  const [autoScanEnabled] = useState(true);

  useEffect(() => {
    if (videoRef.current && cameraStream && cameraActive) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.warn('Video auto-play interrupted or waiting for user gesture:', err);
      });
    }
  }, [cameraStream, cameraActive]);

  // Capture frame from video element
  const captureFrame = async () => {
    if (!videoRef.current || !cameraActive || isAnalyzingFrame) return;
    try {
      const video = videoRef.current;
      if (video.videoWidth === 0) return;
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(320, video.videoWidth);
      canvas.height = Math.min(240, video.videoHeight);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        await onAnalyzeFrameSnapshot(dataUrl);
      }
    } catch (err) {
      console.warn('Frame capture error:', err);
    }
  };

  // Periodic automated scan when camera is active and autoScan is enabled
  useEffect(() => {
    if (!cameraActive || !autoScanEnabled) return;
    const interval = setInterval(() => {
      captureFrame();
    }, 12000); // scan every 12s
    return () => clearInterval(interval);
  }, [cameraActive, autoScanEnabled]);

  // Render minimal collapsed view
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
                className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono transition-all ${
                  isCurrent
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
      {/* Sidebar Header with Collapse Button */}
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

      {/* SECTION 1: Live Camera Feed & Attention Monitor */}
      <div className="p-4 border-b border-[#E8EAE4] bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                cameraActive && detectedState === 'focused'
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

        {/* Camera Feed Container */}
        {cameraActive ? (
          <div className="relative rounded-xl overflow-hidden bg-[#1E2022] aspect-video border border-[#DCDED8] shadow-2xs group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror -scale-x-100"
            />

            {/* Status Overlays */}
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

        {/* Subtle camera active status note */}
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

      {/* SECTION 2: Slide Contents & Topics */}
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
                className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 ${
                  isCurrent
                    ? 'bg-[#EDF2EC] border border-[#CDE0CC] text-[#1E3A24]'
                    : 'hover:bg-[#F2F4F0] border border-transparent text-[#383D42]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 ${
                    isCurrent
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

      {/* Privacy note at bottom */}
      <div className="p-3 border-t border-[#E8EAE4] bg-[#F7F8F5] text-[11px] text-[#71777E] flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#546E7A] shrink-0" />
        <span className="leading-tight">
          Private study room · Annotations & video never stored
        </span>
      </div>
    </aside>
  );
};