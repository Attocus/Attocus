import React, { useState, useEffect } from 'react';
import { X, BookOpen, Trash2, Copy, Check, Sparkles, FileText, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface SavedLectureSummary {
  id: string;
  slideId: string;
  slideNumber: number;
  slideTopic: string;
  date: string;
  studentWordsSummary: string;
  takeaways: string[];
  strengths?: string[];
  corrections?: string[];
}

interface SavedSummariesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lectureId: string;
  lectureTitle: string;
}

export const SavedSummariesModal: React.FC<SavedSummariesModalProps> = ({
  isOpen,
  onClose,
  lectureId,
  lectureTitle,
}) => {
  const { isAr, dir } = useLanguage();
  const storageKey = `attocus_lecture_summaries_${lectureId}`;

  const [summaries, setSummaries] = useState<SavedLectureSummary[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setSummaries(JSON.parse(stored));
        } else {
          setSummaries([]);
        }
      } catch {
        setSummaries([]);
      }
    }
  }, [isOpen, storageKey]);

  if (!isOpen) return null;

  const handleDelete = (id: string) => {
    const updated = summaries.filter(s => s.id !== id);
    setSummaries(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const handleCopy = (summary: SavedLectureSummary) => {
    const textToCopy = [
      `📚 ${lectureTitle} - شريحة ${summary.slideNumber} (${summary.slideTopic})`,
      `التاريخ: ${summary.date}`,
      '',
      '📝 التلخيص:',
      summary.studentWordsSummary,
      '',
      summary.takeaways && summary.takeaways.length > 0 ? `📌 المحاور الرئيسية:\n${summary.takeaways.map(t => `- ${t}`).join('\n')}` : ''
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(summary.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-slide-up max-h-[90vh] flex flex-col transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'ملخصاتي الأكاديمية 📝' : 'My Academic Summaries 📝'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                {lectureTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-saved-summaries-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {summaries.length === 0 ? (
            <div className="py-16 text-center space-y-3 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'لا توجد ملخصات محفوظة بعد' : 'No saved summaries yet'}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  {isAr
                    ? 'عندما تشرح المفاهيم في جلسة الاستيعاب التفاعلية، سيتم تجميع وتوليد التلخيص وحفظه هنا تلقائياً لترجع له في أي وقت.'
                    : 'When you explain concepts during interactive understanding sessions, summaries will be saved here automatically for future review.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map(item => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200/60 dark:border-blue-800">
                        {isAr ? `شريحة ${item.slideNumber}` : `Slide ${item.slideNumber}`}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.slideTopic}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {item.date}
                      </span>

                      {/* Copy summary button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        title={isAr ? 'نسخ الملخص' : 'Copy summary'}
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* Delete summary button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        title={isAr ? 'حذف الملخص' : 'Delete summary'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Text (in student's words) */}
                  <div className={`space-y-1 ${isAr ? 'text-right' : 'text-left'}`}>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {isAr ? 'التلخيص المصاغ بأسلوبك:' : 'Synthesized in your own words:'}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {item.studentWordsSummary}
                    </p>
                  </div>

                  {/* Takeaways / Key Points */}
                  {item.takeaways && item.takeaways.length > 0 && (
                    <div className={`space-y-1.5 ${isAr ? 'text-right' : 'text-left'}`}>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {isAr ? 'المحاور والأفكار الرئيسية المستخلصة:' : 'Key conceptual takeaways:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.takeaways.map((point, pIdx) => (
                          <span
                            key={pIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            {point.replace(/^[-*•\d.]+\s*/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {item.strengths && item.strengths.length > 0 && (
                    <div className={`space-y-1.5 ${isAr ? 'text-right' : 'text-left'}`}>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {isAr ? 'نقاط القوة والاستيعاب لديك:' : 'Your strengths & understanding:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.strengths.map((point, pIdx) => (
                          <span
                            key={pIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium border border-emerald-200/50 dark:border-emerald-900/50"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {point.replace(/^[-*•\d.]+\s*/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Corrections */}
                  {item.corrections && item.corrections.length > 0 && (
                    <div className={`space-y-1.5 ${isAr ? 'text-right' : 'text-left'}`}>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        {isAr ? 'التصحيحات والاستدراكات المعرفية:' : 'Knowledge corrections & clarifications:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.corrections.map((point, pIdx) => (
                          <span
                            key={pIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium border border-amber-200/50 dark:border-amber-900/50"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            {point.replace(/^[-*•\d.]+\s*/, '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {summaries.length > 0 ? (isAr ? `${summaries.length} ملخص محفوظ` : `${summaries.length} saved summaries`) : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
          >
            {isAr ? 'تم' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
