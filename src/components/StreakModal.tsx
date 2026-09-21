import React from 'react';
import { X, Flame, Shield, Star, Calendar, Zap } from 'lucide-react';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  longestStreak?: number;
  totalDaysStudied?: number;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  isOpen,
  onClose,
  currentStreak,
  longestStreak = 12,
  totalDaysStudied = 34,
}) => {
  if (!isOpen) return null;

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const label = d.toLocaleDateString('ar-SA', { weekday: 'short' });
    const doneOffset = 6 - i;
    const done = doneOffset < currentStreak;
    const isToday = i === 6;
    return { label, done, isToday };
  });

  const encouragingMessages = [
    'استمر! أنت على الطريق الصحيح 🔥',
    'كل يوم مذاكرة يصنع فرقاً كبيراً 💪',
    'الثبات هو سر التفوق الحقيقي ✨',
    'اليوم أذكى من أمس، وغداً أذكى من اليوم 🚀',
    'ستريكك يتحدث عن إرادتك القوية 🏆',
  ];
  const message = encouragingMessages[currentStreak % encouragingMessages.length];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#D1D5DB]" />
        </div>

        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-[#FFF8E1] via-[#FFF3E0] to-[#FFE0B2] overflow-hidden">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/60 text-[#6B7280] hover:bg-white/90 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-full flame-gradient flex items-center justify-center shadow-lg shadow-orange-400/40">
                <span className="text-4xl animate-flame inline-block select-none">🔥</span>
              </div>
              <div className="absolute inset-0 rounded-full bg-orange-400/20 blur-xl -z-10" />
            </div>

            <div className="text-center">
              <div className="text-5xl font-black text-[#E65100] font-time tracking-tighter leading-none">
                {currentStreak}
              </div>
              <div className="text-base font-bold text-[#BF360C] mt-0.5">يوم ستريك متتالي</div>
              <div className="text-xs text-[#E65100]/80 mt-1 font-medium">{message}</div>
            </div>
          </div>

          <div className="absolute top-4 left-6 text-xl opacity-30 rotate-12">✨</div>
          <div className="absolute bottom-5 right-8 text-lg opacity-20 -rotate-6">⭐</div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-[#F3F4F6] border-t border-[#E5E7EB]">
          {[
            { icon: <Flame className="w-4 h-4 text-orange-500" />, value: currentStreak, label: 'الستريك الحالي' },
            { icon: <Zap className="w-4 h-4 text-yellow-500" />, value: longestStreak, label: 'أطول ستريك' },
            { icon: <Calendar className="w-4 h-4 text-[#2E7D32]" />, value: totalDaysStudied, label: 'إجمالي الأيام' },
          ].map((stat, i) => (
            <div key={i} className="bg-white px-2 py-3 text-center">
              <div className="flex justify-center mb-1">{stat.icon}</div>
              <div className="text-lg font-bold text-[#1A1D20] font-time">{stat.value}</div>
              <div className="text-[10px] text-[#6B7280] font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">الأسبوع الماضي</p>
          <div className="flex justify-between gap-1">
            {days.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-full aspect-square max-w-[36px] rounded-xl flex items-center justify-center transition-all ${
                    day.done
                      ? 'flame-gradient shadow-sm shadow-orange-300/50'
                      : day.isToday
                      ? 'border-2 border-[#F57C00] bg-[#FFF8E1]'
                      : 'bg-[#F3F4F6]'
                  }`}
                >
                  {day.done ? (
                    <span className="text-white text-sm">🔥</span>
                  ) : (
                    <span className={`text-xs font-bold ${day.isToday ? 'text-[#F57C00]' : 'text-[#D1D5DB]'}`}>○</span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${day.isToday ? 'text-[#F57C00]' : 'text-[#9CA3AF]'}`}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-6 mb-5 px-4 py-3 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1D4ED8]">تجميد الستريك</p>
            <p className="text-[11px] text-[#3B82F6] mt-0.5 leading-snug">
              عند اشتراك PRO، يمكنك تجميد ستريكك ليوم واحد إذا فاتتك جلسة دراسية.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#EBF3EA] border border-[#C8E6C9]">
            <Star className="w-4 h-4 text-[#2E7D32] shrink-0" />
            <p className="text-[11px] text-[#2E7D32] font-medium leading-snug">
              تحصل على <strong>نقاط تركيز مضاعفة</strong> عند إكمال الستريك لأكثر من 7 أيام متتالية!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
