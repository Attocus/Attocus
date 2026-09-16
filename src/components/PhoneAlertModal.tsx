import React from 'react';
import { Smartphone, Coffee, Check, X } from 'lucide-react';

interface PhoneAlertModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onTakeBreak: () => void;
  coachMessage?: string;
}

export const PhoneAlertModal: React.FC<PhoneAlertModalProps> = ({
  isOpen,
  onDismiss,
  onTakeBreak,
  coachMessage
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="phone-detected-modal-overlay"
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="phone-detected-card"
        className="bg-[#FAFAF8] rounded-2xl border border-[#E0E2DC] shadow-xl w-full max-w-md overflow-hidden text-[#202326] p-6 space-y-5 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto text-2xl shadow-2xs border border-[#FEE2E2]">
          📱
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-serif font-bold text-[#1E2225]">
            Phone spotted 📱
          </h3>
          <p className="text-xs text-[#5C6269] leading-relaxed max-w-xs mx-auto">
            {coachMessage || 'Your phone was detected. Put it face down so we can finish this slide without distractions!'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            id="phone-take-break-btn"
            onClick={onTakeBreak}
            className="text-xs px-4 py-2.5 rounded-xl border border-[#D5D8D0] bg-white text-[#52585E] hover:bg-[#F2F4F0] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Coffee className="w-3.5 h-3.5 text-[#888E94]" />
            <span>Take 5-min break</span>
          </button>

          <button
            type="button"
            id="phone-put-away-btn"
            onClick={onDismiss}
            className="text-xs px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Putting phone away</span>
          </button>
        </div>
      </div>
    </div>
  );
};
