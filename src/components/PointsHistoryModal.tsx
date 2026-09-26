import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, ShoppingBag, Clock, Flame } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface PointsHistoryItem {
  id: string;
  title: string;
  titleEn: string;
  folderName: string;
  folderNameEn?: string;
  minutes: number;
  dateString: string;
  dateStringEn?: string;
  pointsEarned: number;
  isDeduction: boolean;
}

const DEFAULT_HISTORY: PointsHistoryItem[] = [
  {
    id: 'ph-1',
    title: 'جلسة بومودورو مكتملة 🎧',
    titleEn: 'Completed Pomodoro Session 🎧',
    folderName: 'علوم الحاسب',
    folderNameEn: 'Computer Science',
    minutes: 25,
    dateString: 'اليوم · 02:45 م',
    dateStringEn: 'Today · 02:45 PM',
    pointsEarned: 10,
    isDeduction: false,
  },
  {
    id: 'ph-2',
    title: 'مكافأة الاستمرار اليومي (Streak) 🔥',
    titleEn: 'Daily Streak Bonus 🔥',
    folderName: 'عام',
    folderNameEn: 'General',
    minutes: 0,
    dateString: 'اليوم · 09:15 ص',
    dateStringEn: 'Today · 09:15 AM',
    pointsEarned: 25,
    isDeduction: false,
  },
  {
    id: 'ph-3',
    title: 'جلسة تركيز عميق ومراجعة سلايدات 📚',
    titleEn: 'Deep Focus & Slide Review 📚',
    folderName: 'الرياضيات',
    folderNameEn: 'Mathematics',
    minutes: 45,
    dateString: 'أمس · 04:30 م',
    dateStringEn: 'Yesterday · 04:30 PM',
    pointsEarned: 20,
    isDeduction: false,
  },
  {
    id: 'ph-4',
    title: 'استبدال شخصية الهاكر الأكاديمي 💻',
    titleEn: 'Unlocked Tech Hacker Avatar 💻',
    folderName: 'متجر الشخصيات',
    folderNameEn: 'Avatar Shop',
    minutes: 0,
    dateString: 'أمس · 06:10 م',
    dateStringEn: 'Yesterday · 06:10 PM',
    pointsEarned: -60,
    isDeduction: true,
  },
  {
    id: 'ph-5',
    title: 'مكافأة التسجيل وبداية الفصل الأكاديمي 🎉',
    titleEn: 'Academic Welcome Bonus 🎉',
    folderName: 'منصة Attocus',
    folderNameEn: 'Attocus Platform',
    minutes: 0,
    dateString: 'منذ يومين',
    dateStringEn: '2 days ago',
    pointsEarned: 50,
    isDeduction: false,
  },
];

const getDisplayFolderName = (item: PointsHistoryItem, isAr: boolean) => {
  if (isAr) return item.folderName;
  if (item.folderNameEn) return item.folderNameEn;
  const folderTranslations: Record<string, string> = {
    'علوم الحاسب': 'Computer Science',
    'عام': 'General',
    'الرياضيات': 'Mathematics',
    'متجر الشخصيات': 'Avatar Shop',
    'منصة Attocus': 'Attocus Platform',
    'جلسة بومودورو': 'Pomodoro Session',
    'اختبار سريع': 'Quick Quiz',
    'الفيزياء': 'Physics',
    'الأحياء': 'Biology',
    'الكيمياء': 'Chemistry',
    'اللغة الإنجليزية': 'English'
  };
  return folderTranslations[item.folderName] || item.folderName;
};

const getDisplayDateString = (item: PointsHistoryItem, isAr: boolean) => {
  if (isAr) return item.dateString;
  if (item.dateStringEn) return item.dateStringEn;
  let str = item.dateString;
  str = str.replace(/اليوم/g, 'Today');
  str = str.replace(/أمس/g, 'Yesterday');
  str = str.replace(/منذ يومين/g, '2 days ago');
  str = str.replace(/منذ ثلاثة أيام/g, '3 days ago');
  str = str.replace(/منذ أسبوع/g, '1 week ago');
  str = str.replace(/منذ ساعة/g, '1 hour ago');
  str = str.replace(/منذ ساعتين/g, '2 hours ago');
  str = str.replace(/منذ لحظات/g, 'Just now');
  str = str.replace(/\bم\b/g, 'PM');
  str = str.replace(/\bص\b/g, 'AM');
  return str;
};


interface PointsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPoints: number;
}

export const PointsHistoryModal: React.FC<PointsHistoryModalProps> = ({
  isOpen,
  onClose,
  totalPoints,
}) => {
  const { isAr, dir, t } = useLanguage();
  const [history, setHistory] = useState<PointsHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('attocus_points_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_HISTORY;
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('attocus_points_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-slide-up max-h-[90vh] flex flex-col transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'تاريخ ونقاط الجلسات' : 'Sessions & Points History'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'سجل تفصيلي لكافة النقاط المكتسبة والمستبدلة' : 'Detailed record of all earned and spent points'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-points-history-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Balance Summary Card (Matches iOS PointsHistoryView) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className={`space-y-0.5 ${isAr ? 'text-right' : 'text-left'}`}>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {isAr ? 'إجمالي نقاط التركيز الحالية' : 'Total Current Focus Points'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                  {totalPoints}
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {isAr ? 'نقطة' : 'pts'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Section Header */}
          <div className={`px-1 flex items-center justify-between text-xs font-bold ${isAr ? 'text-right' : 'text-left'}`}>
            <span className="text-slate-700 dark:text-slate-300">
              {isAr ? 'سجل النشاط والنقاط المكتسبة' : 'Activity & Points History'}
            </span>
            <span className="text-slate-400 font-medium font-mono">
              {history.length} {isAr ? 'عمليات' : 'entries'}
            </span>
          </div>

          {/* History List */}
          <div className="space-y-2.5">
            {history.map(item => {
              const displayTitle = isAr ? item.title : (item.titleEn || item.title);
              const displayFolder = getDisplayFolderName(item, isAr);
              const displayDate = getDisplayDateString(item, isAr);

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.isDeduction
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : item.minutes > 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.isDeduction ? (
                        <ShoppingBag className="w-5 h-5" />
                      ) : item.minutes > 0 ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </div>

                    <div className={`min-w-0 ${isAr ? 'text-right' : 'text-left'}`}>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {displayTitle}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex-wrap">
                        {displayFolder && (
                          <>
                            <span>{displayFolder}</span>
                            <span>•</span>
                          </>
                        )}
                        {item.minutes > 0 && (
                          <>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.minutes} {isAr ? 'دقيقة' : 'min'}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>{displayDate}</span>
                      </div>
                    </div>
                  </div>


                  {/* Points Badge */}
                  <div className="shrink-0">
                    {item.isDeduction ? (
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold font-mono border border-purple-500/20">
                        {item.pointsEarned} {isAr ? 'نقطة' : 'pts'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono border border-emerald-500/20">
                        +{item.pointsEarned} {isAr ? 'نقطة' : 'pts'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm shadow-blue-500/20 active:scale-95"
          >
            {isAr ? 'إغلاق' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
