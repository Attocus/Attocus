import React from 'react';
import { Smartphone, Coffee, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { language, dir } = useLanguage();
  if (!isOpen) return null;

  const isAr = language === 'ar';
  const defaultArabic = 'لاحظنا وجود الجوال في يدك. اقلب الشاشة للأسفل لإنهاء هذه الشريحة بتركيز كامل وبدون مشتتات!';
  const defaultEnglish = 'We noticed phone usage. Put your screen face down to finish this slide with full focus!';

  const displayMessage = !isAr && coachMessage && /[\u0600-\u06FF]/.test(coachMessage)
    ? defaultEnglish
    : (coachMessage || (isAr ? defaultArabic : defaultEnglish));

  return (
    <div
      dir={dir}
      id="phone-detected-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="phone-detected-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden text-slate-900 dark:text-slate-100 p-6 sm:p-7 space-y-5 text-center relative animate-in zoom-in-95 duration-150"
      >
        {/* أيقونة رصد الجوال */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center mx-auto text-2xl shadow-xs">
          <Smartphone className="w-7 h-7 text-rose-600 dark:text-rose-400 animate-bounce" />
        </div>

        {/* النصوص والعناوين */}
        <div className="space-y-2">
          <h3 className="text-base font-bold tracking-tight text-[#0F172A] dark:text-white">
            {isAr ? 'تم رصد استخدام الهاتف 📱' : 'Phone Usage Detected 📱'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            {displayMessage}
          </p>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            id="phone-take-break-btn"
            onClick={onTakeBreak}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Coffee className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isAr ? 'أخذ استراحة ☕' : 'Take a Break ☕'}</span>
          </button>

          <button
            type="button"
            id="phone-put-away-btn"
            onClick={onDismiss}
            className="w-full sm:w-auto flex-1 text-xs py-2.5 px-4 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAr ? 'أبعدت الهاتف، لنكمل' : 'Put phone away, continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};