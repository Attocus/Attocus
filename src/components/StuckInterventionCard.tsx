import React from 'react';
import { HelpCircle, Brain, BookOpen, Clock, X } from 'lucide-react';

interface StuckInterventionCardProps {
  isOpen: boolean;
  specialistOffered: 'quiz' | 'understanding' | 'summary';
  onChooseQuiz: () => void;
  onChooseUnderstanding: () => void;
  onChooseSummarize: () => void;
  onDeclineStillReading: () => void;
}

export const StuckInterventionCard: React.FC<StuckInterventionCardProps> = ({
  isOpen,
  specialistOffered,
  onChooseQuiz,
  onChooseUnderstanding,
  onChooseSummarize,
  onDeclineStillReading
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="stuck-intervention-banner"
      className="fixed bottom-6 right-6 z-40 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl border border-[#DDE0D8] shadow-lg p-4 text-[#202326] transition-all animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFF8E1] text-[#E65100] flex items-center justify-center text-sm shrink-0">
            👀
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#1F2327]">
              Need a hand here? 👀
            </h4>
            <p className="text-[11px] text-[#636A71] mt-0.5 leading-snug">
              You've been on this complex section for a while. Your coach can help clarify the mechanism.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDeclineStillReading}
          className="text-[#8E949B] hover:text-[#555B62] p-0.5"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-[#ECEEE8]">
        <button
          type="button"
          id="stuck-action-quiz-me"
          onClick={onChooseQuiz}
          className="px-2.5 py-1.5 rounded-lg bg-[#F4F6F2] hover:bg-[#EAF0E7] text-[#2E7D32] text-[11px] font-medium transition-colors border border-[#DEE3DA] text-center"
        >
          Quiz me
        </button>

        <button
          type="button"
          id="stuck-action-summarize-me"
          onClick={specialistOffered === 'understanding' ? onChooseUnderstanding : onChooseSummarize}
          className="px-2.5 py-1.5 rounded-lg bg-[#F4F6F2] hover:bg-[#EAF0E7] text-[#2E7D32] text-[11px] font-medium transition-colors border border-[#DEE3DA] text-center"
        >
          Summarize for me
        </button>

        <button
          type="button"
          id="stuck-action-still-reading"
          onClick={onDeclineStillReading}
          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F2F4F0] text-[#60666C] text-[11px] font-medium transition-colors border border-[#D5D8D0] text-center"
        >
          Still reading
        </button>
      </div>
    </div>
  );
};
