import React from 'react';
import { Moon, Coffee, Sun } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { language, dir } = useLanguage();
  if (!isOpen) return null;

  const isAr = language === 'ar';

  return (
    <div
      dir={dir}
      id="sleeping-detected-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="sleeping-detected-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden text-slate-900 dark:text-slate-100 p-6 sm:p-7 space-y-5 text-center relative animate-in zoom-in-95 duration-150"
      >
        {/* أيقونة رصد النعاس */}
        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center mx-auto text-2xl shadow-xs">
          <Moon className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-pulse" />
        </div>

        {/* النصوص والعناوين */}
        <div className="space-y-2">
          <h3 className="text-base font-bold tracking-tight text-[#0F172A] dark:text-white">
            {isAr ? 'تغالبك الرغبة في النوم؟ 💤' : 'Feeling Sleepy? 💤'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            {coachMessage || (isAr ? 'تم رصد إغلاق العينين أو انحناء الرأس. أخذ قسط قصير من الراحة أفضل بكثير من المذاكرة تحت وطأة الإرهاق.' : 'Eye closure or head resting detected. Taking a brief break is much better than studying while exhausted.')}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            id="sleeping-take-break-btn"
            onClick={onTakeBreak}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Coffee className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isAr ? 'غفوة تنشيطية (10 د)' : 'Power Nap (10 min)'}</span>
          </button>

          <button
            type="button"
            id="sleeping-awake-btn"
            onClick={onDismiss}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'أنا يقظ! متابعة المذاكرة' : 'I am awake! Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};