import React from 'react';
import { Sparkles, X, CheckSquare, AlignLeft, BookOpen } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface StuckInterventionCardProps {
  isOpen: boolean;
  specialistOffered: 'quiz' | 'understanding' | 'summary';
  onChooseQuiz: () => void;
  onChooseUnderstanding: () => void;
  onChooseSummarize: () => void;
  onChooseExplain?: () => void;
  onDeclineStillReading: () => void;
}

export const StuckInterventionCard: React.FC<StuckInterventionCardProps> = ({
  isOpen,
  specialistOffered,
  onChooseQuiz,
  onChooseUnderstanding,
  onChooseSummarize,
  onChooseExplain,
  onDeclineStillReading
}) => {
  const { isAr, dir } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      dir={dir}
      id="stuck-intervention-banner"
      className={`fixed bottom-6 ${isAr ? 'left-6' : 'right-6'} z-40 max-w-md w-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-4 text-slate-900 dark:text-slate-100 transition-all animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-black/5 dark:ring-white/5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100/80 dark:border-blue-900/50 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F172A] dark:text-white tracking-tight">
              {isAr ? 'تحتاج مساعدة هنا؟ 👋' : 'Need help with this slide? 👋'}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {isAr
                ? 'استغرقت وقتاً أطول من المعتاد في هذا الجزء. يمكن للمساعد الذكي تبسيط وتوضيح الفكرة لك.'
                : 'Taking a bit longer on this part. The AI companion can explain, quiz, or summarize this concept for you.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDeclineStillReading}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-full transition-colors"
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {onChooseExplain && (
          <button
            type="button"
            id="stuck-action-explain-me"
            onClick={onChooseExplain}
            className="px-2 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition-all border border-blue-200/80 dark:border-blue-800 text-center active:scale-[0.98] flex items-center justify-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>{isAr ? 'اشرح لي' : 'Explain'}</span>
          </button>
        )}

        <button
          type="button"
          id="stuck-action-quiz-me"
          onClick={onChooseQuiz}
          className="px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-all border border-slate-200/60 dark:border-slate-700 text-center active:scale-[0.98] flex items-center justify-center gap-1"
        >
          <CheckSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>{isAr ? 'اختبرني' : 'Quiz'}</span>
        </button>

        <button
          type="button"
          id="stuck-action-summarize-me"
          onClick={specialistOffered === 'understanding' ? onChooseUnderstanding : onChooseSummarize}
          className="px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-all border border-slate-200/60 dark:border-slate-700 text-center active:scale-[0.98] flex items-center justify-center gap-1"
        >
          <AlignLeft className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>{isAr ? 'لخّص لي' : 'Summarize'}</span>
        </button>

        <button
          type="button"
          id="stuck-action-still-reading"
          onClick={onDeclineStillReading}
          className="px-2 py-2 rounded-xl bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 text-[11px] font-semibold transition-all border border-slate-200/80 dark:border-slate-700 text-center active:scale-[0.98] flex items-center justify-center gap-1"
        >
          <BookOpen className="w-3 h-3 text-slate-400 dark:text-slate-400" />
          <span>{isAr ? 'ما زلت أقرأ' : 'Reading'}</span>
        </button>
      </div>
    </div>
  );
};