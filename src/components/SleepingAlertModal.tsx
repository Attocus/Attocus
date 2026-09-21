import React from 'react';
import { Moon, Coffee, Sun } from 'lucide-react';

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
      dir="rtl"
      id="sleeping-detected-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="sleeping-detected-card"
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-sm overflow-hidden text-slate-900 p-6 sm:p-7 space-y-5 text-center relative animate-in zoom-in-95 duration-150"
      >
        {/* أيقونة رصد النعاس */}
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-2xl shadow-xs">
          <Moon className="w-7 h-7 text-blue-600 animate-pulse" />
        </div>

        {/* النصوص والعناوين */}
        <div className="space-y-2">
          <h3 className="text-base font-bold tracking-tight text-[#0F172A]">
            تغالبك الرغبة في النوم؟ 💤
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {coachMessage || 'تم رصد إغلاق العينين أو انحناء الرأس. أخذ قسط قصير من الراحة أفضل بكثير من المذاكرة تحت وطأة الإرهاق.'}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            id="sleeping-take-break-btn"
            onClick={onTakeBreak}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Coffee className="w-3.5 h-3.5 text-blue-600" />
            <span>غفوة تنشيطية (10 د)</span>
          </button>

          <button
            type="button"
            id="sleeping-awake-btn"
            onClick={onDismiss}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>أنا يقظ! متابعة المذاكرة</span>
          </button>
        </div>
      </div>
    </div>
  );
};