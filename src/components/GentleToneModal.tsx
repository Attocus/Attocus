import React from 'react';
import { Coffee, Eye } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { language, dir } = useLanguage();
  if (!isOpen) return null;

  const isAr = language === 'ar';

  return (
    <div
      dir={dir}
      id="gentle-tone-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="gentle-tone-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden text-slate-900 dark:text-slate-100 p-6 sm:p-7 space-y-5 text-center relative animate-in zoom-in-95 duration-150"
      >
        {/* أيقونة التنبيه اللطيف */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center mx-auto text-2xl shadow-xs">
          <span className="animate-pulse inline-block">👀</span>
        </div>

        {/* النصوص والعناوين */}
        <div className="space-y-2">
          <h3 className="text-base font-bold tracking-tight text-[#0F172A] dark:text-white">
            {isAr ? 'هل ما زلت معي؟ 👀' : 'Still with me? 👀'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            {isAr ? 'لاحظنا ابتعاد نظرك عن الشاشة للحظات. هل ترغب في إكمال المذاكرة أم تحتاج استراحة لتجديد نشاطك؟' : 'We noticed your gaze wandered away for a moment. Would you like to continue studying or take a refreshing break?'}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            id="attention-take-break-btn"
            onClick={onTakeBreak}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Coffee className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isAr ? 'أحتاج استراحة ☕' : 'Need a Break ☕'}</span>
          </button>

          <button
            type="button"
            id="attention-im-here-btn"
            onClick={onConfirmPresent}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAr ? 'أنا هنا، لنكمل!' : "I'm here, continue!"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};