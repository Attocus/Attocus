import React from 'react';
import { Footprints, Coffee, Check, Sparkles } from 'lucide-react';

interface AwayAlertModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onTakeBreak: () => void;
  coachMessage?: string;
}

export const AwayAlertModal: React.FC<AwayAlertModalProps> = ({
  isOpen,
  onDismiss,
  onTakeBreak,
  coachMessage
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="away-detected-modal-overlay"
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="away-detected-card"
        className="bg-[#FAFAF8] rounded-2xl border border-[#E0E2DC] shadow-xl w-full max-w-md overflow-hidden text-[#202326] p-6 space-y-5 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center mx-auto text-2xl shadow-2xs border border-[#FFEDD5]">
          🚶‍♂️
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-serif font-bold text-[#1E2225]">
            Stepped away from your desk? 🚶‍♂️
          </h3>
          <p className="text-xs text-[#5C6269] leading-relaxed max-w-xs mx-auto">
            {coachMessage || 'We noticed you left the camera view. Take your time! Your study session is paused until you return.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            id="away-take-break-btn"
            onClick={onTakeBreak}
            className="text-xs px-4 py-2.5 rounded-xl border border-[#D5D8D0] bg-white text-[#52585E] hover:bg-[#F2F4F0] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Coffee className="w-3.5 h-3.5 text-[#888E94]" />
            <span>Take a 5-min break</span>
          </button>

          <button
            type="button"
            id="away-resume-btn"
            onClick={onDismiss}
            className="text-xs px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>I'm back! Resume study</span>
          </button>
        </div>
      </div>
    </div>
  );
};
