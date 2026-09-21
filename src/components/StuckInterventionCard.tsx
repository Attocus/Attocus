import React from 'react';
import { Sparkles, X, CheckSquare, AlignLeft, BookOpen } from 'lucide-react';

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
      dir="rtl"
      id="stuck-intervention-banner"
      className="fixed bottom-6 left-6 z-40 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-2xl p-4 text-slate-900 transition-all animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-black/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
              تحتاج مساعدة هنا؟ 👋
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              استغرقت وقتاً أطول من المعتاد في هذا الجزء. يمكن للمساعد الذكي تبسيط وتوضيح الفكرة لك.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDeclineStillReading}
          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-full transition-colors"
          title="إغلاق"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          id="stuck-action-quiz-me"
          onClick={onChooseQuiz}
          className="px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition-all border border-slate-200/60 text-center active:scale-[0.98] flex items-center justify-center gap-1"
        >
          <CheckSquare className="w-3 h-3 text-blue-600" />
          <span>اختبرني</span>
        </button>

        <button
          type="button"
          id="stuck-action-summarize-me"
          onClick={specialistOffered === 'understanding' ? onChooseUnderstanding : onChooseSummarize}
          className="px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition-all border border-slate-200/60 text-center active:scale-[0.98] flex items-center justify-center gap-1"
        >
          <AlignLeft className="w-3 h-3 text-blue-600" />
          <span>لخّص لي</span>
        </button>

        <button
          type="button"
          id="stuck-action-still-reading"
          onClick={onDeclineStillReading}
          className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 text-[11px] font-semibold transition-all border border-slate-200/80 text-center active:scale-[0.98] flex items-center justify-center gap-1"
        >
          <BookOpen className="w-3 h-3 text-slate-400" />
          <span>ما زلت أقرأ</span>
        </button>
      </div>
    </div>
  );
};