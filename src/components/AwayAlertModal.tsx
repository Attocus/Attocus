import React from 'react';
import { Coffee, Check, Footprints } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { language, dir } = useLanguage();
  if (!isOpen) return null;

  const isAr = language === 'ar';

  return (
    <div
      dir={dir}
      id="away-detected-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="away-detected-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden text-slate-900 dark:text-slate-100 p-6 sm:p-7 space-y-5 text-center relative animate-in zoom-in-95 duration-150"
      >
        {/* أيقونة الحالة الدائرية */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center mx-auto text-2xl shadow-xs">
          <Footprints className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>

        {/* النصوص والعناوين */}
        <div className="space-y-2">
          <h3 className="text-base font-bold tracking-tight text-[#0F172A] dark:text-white">
            {isAr ? 'ابتعدت عن مكان المذاكرة؟ 🚶‍♂️' : 'Stepped away from your desk? 🚶‍♂️'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            {coachMessage || (isAr ? 'لاحظنا مغادرتك للمكتب. تم إيقاف جلسة المذاكرة مؤقتاً لحفظ تركيزك حتى تعود.' : 'We noticed you left your desk. Study session paused to preserve focus until you return.')}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            id="away-take-break-btn"
            onClick={onTakeBreak}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Coffee className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isAr ? 'أخذ استراحة 5 د' : 'Take 5-min Break'}</span>
          </button>

          <button
            type="button"
            id="away-resume-btn"
            onClick={onDismiss}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'عدت! متابعة المذاكرة' : 'Back! Resume session'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};