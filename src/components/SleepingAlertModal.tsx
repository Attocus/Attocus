import React from 'react';
import { Moon, Coffee, Sun, Check } from 'lucide-react';

interface SleepingAlertModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onTakeBreak: () => void;
  coachMessage?: string;
}

export const SleepingAlertModal: React.FC<SleepingAlertModalProps> = ({
  isOpen,
  onDismiss,
  onTakeBreak,
  coachMessage
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="sleeping-detected-modal-overlay"
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="sleeping-detected-card"
        className="bg-[#FAFAF8] rounded-2xl border border-[#E0E2DC] shadow-xl w-full max-w-md overflow-hidden text-[#202326] p-6 space-y-5 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto text-2xl shadow-2xs border border-[#DBEAFE]">
          💤
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-serif font-bold text-[#1E2225]">
            Asleep at your desk? 💤
          </h3>
          <p className="text-xs text-[#5C6269] leading-relaxed max-w-xs mx-auto">
            {coachMessage || 'Eyes closed or resting your head detected. A real teacher knows that rest is often more productive than struggling through fatigue.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            id="sleeping-take-break-btn"
            onClick={onTakeBreak}
            className="text-xs px-4 py-2.5 rounded-xl border border-[#D5D8D0] bg-white text-[#52585E] hover:bg-[#F2F4F0] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Coffee className="w-3.5 h-3.5 text-[#888E94]" />
            <span>Take 10-min power nap</span>
          </button>

          <button
            type="button"
            id="sleeping-awake-btn"
            onClick={onDismiss}
            className="text-xs px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Sun className="w-3.5 h-3.5" />
            <span>I'm awake! Keep studying</span>
          </button>
        </div>
      </div>
    </div>
  );
};
