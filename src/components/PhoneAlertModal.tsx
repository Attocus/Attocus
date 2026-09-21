import React from 'react';
import { Smartphone, Coffee, Check } from 'lucide-react';

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
      dir="rtl"
      id="phone-detected-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="phone-detected-card"
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-sm overflow-hidden text-slate-900 p-6 sm:p-7 space-y-5 text-center relative animate-in zoom-in-95 duration-150"
      >
        {/* أيقونة رصد الجوال */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-2xl shadow-xs">
          <Smartphone className="w-7 h-7 text-rose-600 animate-bounce" />
        </div>

        {/* النصوص والعناوين */}
        <div className="space-y-2">
          <h3 className="text-base font-bold tracking-tight text-[#0F172A]">
            تم رصد استخدام الهاتف 📱
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {coachMessage || 'لاحظنا وجود الجوال في يدك. اقلب الشاشة للأسفل لإنهاء هذه الشريحة بتركيز كامل وبدون مشتتات!'}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            id="phone-take-break-btn"
            onClick={onTakeBreak}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Coffee className="w-3.5 h-3.5 text-blue-600" />
            <span>أخذ استراحة ☕</span>
          </button>

          <button
            type="button"
            id="phone-put-away-btn"
            onClick={onDismiss}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>أبعدت الهاتف، لنكمل</span>
          </button>
        </div>
      </div>
    </div>
  );
};