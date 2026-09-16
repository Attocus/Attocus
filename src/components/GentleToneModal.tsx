import React from 'react';
import { Coffee, Eye, Sparkles } from 'lucide-react';

interface GentleToneModalProps {
  isOpen: boolean;
  onConfirmPresent: () => void;
  onTakeBreak: () => void;
}

export const GentleToneModal: React.FC<GentleToneModalProps> = ({
  isOpen,
  onConfirmPresent,
  onTakeBreak
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="gentle-tone-modal-overlay"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="gentle-tone-card"
        className="bg-[#FAFAF8] rounded-2xl border border-[#E0E2DC] shadow-xl w-full max-w-md overflow-hidden text-[#202326] p-6 space-y-5 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#FFF8E1] text-[#E65100] flex items-center justify-center mx-auto text-xl shadow-2xs">
          👀
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-serif font-bold text-[#1E2225]">
            Still with me? 👀
          </h3>
          <p className="text-xs text-[#5C6269] leading-relaxed max-w-xs mx-auto">
            Your attention drifted from the screen for a moment. Would you like to keep reviewing or take a short break?
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            id="attention-take-break-btn"
            onClick={onTakeBreak}
            className="text-xs px-4 py-2.5 rounded-xl border border-[#D5D8D0] bg-white text-[#52585E] hover:bg-[#F2F4F0] font-medium flex items-center gap-1.5 transition-colors"
          >
            <Coffee className="w-3.5 h-3.5 text-[#888E94]" />
            <span>I need a break</span>
          </button>

          <button
            type="button"
            id="attention-im-here-btn"
            onClick={onConfirmPresent}
            className="text-xs px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>I'm here</span>
          </button>
        </div>
      </div>
    </div>
  );
};
