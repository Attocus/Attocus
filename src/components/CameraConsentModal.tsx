import React from 'react';
import { ShieldCheck, Video, X, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CameraConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmConsent: () => void;
}

export const CameraConsentModal: React.FC<CameraConsentModalProps> = ({
  isOpen,
  onClose,
  onConfirmConsent
}) => {
  const { language, dir } = useLanguage();
  if (!isOpen) return null;

  const isAr = language === 'ar';

  return (
    <div
      dir={dir}
      id="camera-consent-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="camera-consent-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden text-slate-900 dark:text-slate-100 p-6 sm:p-7 space-y-5 relative animate-in zoom-in-95 duration-150"
      >
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/80 dark:border-blue-900/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                {isAr ? 'إذن تفعيل مراقب التركيز' : 'Enable Focus Monitor Permission'}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {isAr ? 'حماية الخصوصية ومتابعة الانتباه' : 'Privacy protection & attention tracking'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-camera-consent-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* محتوى الشروط والخصوصية */}
        <div className="space-y-3.5">
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">
            {isAr
              ? '"نقوم فقط برصد خروج الانتباه عن الشاشة أو استخدام الهاتف — لا يتم تسجيل الفيديو أو تخزينه إطلاقاً."'
              : '"We only monitor gaze off-screen or phone usage — video is never recorded or stored."'}
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-3">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {isAr
                  ? 'تتم معالجة حركة العين والوضعية محلياً بالكامل داخل ذاكرة جهازك (On-device Processing).'
                  : 'Eye movements and posture are processed entirely on-device in local memory.'}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Video className="w-4 h-4 text-[#0F172A] dark:text-blue-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                {isAr
                  ? 'يمكنك تعطيل الكاميرا فوراً في أي وقت عبر زر الإيقاف السريع في الشريط الجانبي.'
                  : 'You can disable the camera anytime via the quick toggle in the sidebar.'}
              </span>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            id="decline-camera-consent-btn"
            onClick={onClose}
            className="text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-all active:scale-[0.98]"
          >
            {isAr ? 'لاحقاً' : 'Later'}
          </button>

          <button
            type="button"
            id="accept-camera-consent-btn"
            onClick={onConfirmConsent}
            className="text-xs px-5 py-2.5 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-[0.98]"
          >
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAr ? 'تفعيل مراقبة التركيز' : 'Enable Focus Monitoring'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};