import React from 'react';
import { ShieldCheck, Video, X, Lock } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      id="camera-consent-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="camera-consent-card"
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden text-slate-900 p-6 sm:p-7 space-y-5 relative animate-in zoom-in-95 duration-150"
      >
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                إذن تفعيل مراقب التركيز
              </h3>
              <p className="text-[11px] text-slate-400">حماية الخصوصية ومتابعة الانتباه</p>
            </div>
          </div>

          <button
            type="button"
            id="close-camera-consent-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* محتوى الشروط والخصوصية */}
        <div className="space-y-3.5">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-semibold">
            "نقوم فقط برصد خروج الانتباه عن الشاشة أو استخدام الهاتف — لا يتم تسجيل الفيديو أو تخزينه إطلاقاً."
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-3">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                تتم معالجة حركة العين والوضعية محلياً بالكامل داخل ذاكرة جهازك (On-device Processing).
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Video className="w-4 h-4 text-[#0F172A] shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                يمكنك تعطيل الكاميرا فوراً في أي وقت عبر زر الإيقاف السريع في الشريط الجانبي.
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
            className="text-xs px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-all active:scale-[0.98]"
          >
            لاحقاً
          </button>

          <button
            type="button"
            id="accept-camera-consent-btn"
            onClick={onConfirmConsent}
            className="text-xs px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-[0.98]"
          >
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span>تفعيل مراقبة التركيز</span>
          </button>
        </div>
      </div>
    </div>
  );
};