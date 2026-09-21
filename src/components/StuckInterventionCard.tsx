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
      className="fixed bottom-6 right-6 z-40 max-w-sm w-full bg-white/95 dark:bg-[#1A1D22]/95 backdrop-blur-md rounded-2xl border border-[#DDE0D8] dark:border-[#2E3339] shadow-lg p-4 text-[#202326] dark:text-[#F1F3F5] transition-all animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFF8E1] dark:bg-[#78350F]/40 text-[#E65100] dark:text-[#FBBF24] flex items-center justify-center text-sm shrink-0">
            👀
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#1F2327] dark:text-[#F1F3F5]">
              Need a hand here? 👀
            </h4>
            <p className="text-[11px] text-[#636A71] dark:text-[#9AA0A6] mt-0.5 leading-snug">
              You've been on this complex section for a while. Your coach can help clarify the mechanism.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDeclineStillReading}
          className="text-[#8E949B] dark:text-[#9AA0A6] hover:text-[#555B62] dark:hover:text-[#F1F3F5] p-0.5 cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-[#ECEEE8] dark:border-[#2E3339]">
        <button
          type="button"
          id="stuck-action-quiz-me"
          onClick={onChooseQuiz}
          className="px-2.5 py-1.5 rounded-lg bg-[#F4F6F2] dark:bg-[#252930] hover:bg-[#EAF0E7] dark:hover:bg-[#1E3A24] text-[#2E7D32] dark:text-[#4ADE80] text-[11px] font-medium transition-colors border border-[#DEE3DA] dark:border-[#2E3339] text-center cursor-pointer"
        >
          Quiz me
        </button>

        <button
          type="button"
          id="stuck-action-summarize-me"
          onClick={specialistOffered === 'understanding' ? onChooseUnderstanding : onChooseSummarize}
          className="px-2.5 py-1.5 rounded-lg bg-[#F4F6F2] dark:bg-[#252930] hover:bg-[#EAF0E7] dark:hover:bg-[#1E3A24] text-[#2E7D32] dark:text-[#4ADE80] text-[11px] font-medium transition-colors border border-[#DEE3DA] dark:border-[#2E3339] text-center cursor-pointer"
        >
          Summarize for me
        </button>

        <button
          type="button"
          id="stuck-action-still-reading"
          onClick={onDeclineStillReading}
          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1E2126] hover:bg-[#F2F4F0] dark:hover:bg-[#252930] text-[#60666C] dark:text-[#CBD5E1] text-[11px] font-medium transition-colors border border-[#D5D8D0] dark:border-[#2E3339] text-center cursor-pointer"
        >
          Still reading
        </button>
      </div>
    </div>
  );
};
