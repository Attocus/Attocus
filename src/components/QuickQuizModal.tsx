import React, { useState, useEffect } from 'react';
import { Slide } from '../types';
import { CheckCircle2, X, HelpCircle, Loader2, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getSlideLanguage } from '../utils/slideLanguage';

interface QuickQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide: Slide;
  lectureTitle?: string;
  source?: 'manual' | 'stuck' | 'phone_recovery';
}

export const QuickQuizModal: React.FC<QuickQuizModalProps> = ({
  isOpen,
  onClose,
  slide,
  lectureTitle,
  source = 'manual'
}) => {
  const { isAr, dir } = useLanguage();
  const { currentUser } = useAuth();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setSubmitted(false);
      loadQuiz();
    }
  }, [isOpen, slide.id]);

  const loadQuiz = async () => {
    setLoading(true);
    const slideLang = getSlideLanguage(slide);
    const pastKey = `attocus_past_quiz_q_${lectureTitle || 'lecture'}_p${slide.pageNumber || 1}_${slide.id}`;
    let pastQuestions: string[] = [];
    try {
      const stored = localStorage.getItem(pastKey);
      if (stored) pastQuestions = JSON.parse(stored);
    } catch {}

    try {
      const res = await fetch('/api/coach/quiz/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide,
          lectureTitle,
          previousQuestions: pastQuestions,
          language: slideLang
        })
      });

      if (!res.ok) {
        throw new Error(`Quiz generation server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.question || !data.options || data.options.length < 2) {
        throw new Error('Invalid quiz response received from server');
      }

      const qText = data.question;
      setQuestion(qText);
      setOptions(data.options);
      setCorrectAnswer(data.correctAnswer || data.options[0]);
      setExplanation(data.explanation || (slideLang === 'ar' ? 'تم التحقق من محتوى شريحة المحاضرة.' : 'Verified from lecture slide content.'));

      // Save question in slide-specific anti-duplication history
      const updated = Array.from(new Set([...pastQuestions, qText])).slice(-30);
      try { localStorage.setItem(pastKey, JSON.stringify(updated)); } catch {}
    } catch {
      const cleanKeyPoints = (slide.keyPoints || []).filter(
        kp => !kp.toLowerCase().includes('visual and conceptual takeaways') && !kp.toLowerCase().includes('visual presentation')
      );
      const cleanContent = (slide.content || []).filter(
        c => !c.toLowerCase().includes('visual presentation') && !c.toLowerCase().includes('section notes')
      );
      const availableFacts = cleanKeyPoints.length > 0 ? cleanKeyPoints : (cleanContent.length > 0 ? cleanContent : [slide.title]);

      const rotIdx = pastQuestions.length;
      const targetFact = availableFacts[rotIdx % availableFacts.length] || slide.title;

      // Rotating contextual questions ensuring distinct concepts matching slide language
      const qVariations = [
        slideLang === 'ar' ? `وفقاً للمحاضرة حول "${slide.topic || slide.title}"، ما هو الدور الأساسي لـ: "${targetFact.slice(0, 70)}..."؟` : `Regarding "${slide.topic || slide.title}", what is the primary role of "${targetFact.slice(0, 70)}..."?`,
        slideLang === 'ar' ? `فيما يخص "${slide.title}"، أي من العبارات التالية تمثل حقيقة مثبتة في الشريحة؟` : `Regarding "${slide.title}", which of the following statements represents an established fact?`,
        slideLang === 'ar' ? `ما هو المبدأ والهدف الأكاديمي الأساسي في موضوع "${slide.topic || slide.title}"؟` : `What is the core principle and objective in "${slide.topic || slide.title}"?`,
        slideLang === 'ar' ? `أي من المفاهيم التالية يعد شرطاً جوهرياً لضمان سلامة تطبيق "${slide.topic || slide.title}"؟` : `Which of the following is a vital requirement for "${slide.topic || slide.title}"?`
      ];

      const selectedQ = qVariations[rotIdx % qVariations.length];
      setQuestion(selectedQ);

      const correctOpt = targetFact.slice(0, 80);
      const opts = slideLang === 'ar' ? [
        correctOpt,
        'إلغاء قيود التحقق والاستجابة الفورية دون معايير اتساق',
        'الاعتماد على عشوائية التخزين المؤقت دون مزامنة موحدة',
        'تعطيل المراقبة والتحقق من صحة المدخلات'
      ] : [
        correctOpt,
        'Allows bypassing majority consensus validation checks.',
        'Requires atomic physical clock synchronization between all servers.',
        'Only operates when every single server in the cluster is healthy.'
      ];

      setOptions(opts);
      setCorrectAnswer(correctOpt);
      setExplanation(slideLang === 'ar' ? 'هذا الخيار يمثل المفهوم الجوهري المثبت في هذه الشريحة.' : 'This option represents the core concept verified in this slide.');

      const updated = Array.from(new Set([...pastQuestions, selectedQ])).slice(-30);
      try { localStorage.setItem(pastKey, JSON.stringify(updated)); } catch {}
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      dir={dir}
      id="quick-quiz-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="quick-quiz-modal-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-slate-100 p-6 sm:p-7 space-y-5 relative animate-in zoom-in-95 duration-150 transition-colors"
      >
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              source === 'phone_recovery'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-100/80 dark:border-blue-900/50'
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white flex items-center gap-2">
                <span>
                  {source === 'phone_recovery'
                    ? (isAr ? 'اختبار استرجاع التركيز 🎯' : 'Focus Recovery Quiz 🎯')
                    : (isAr ? 'اختبار استيعاب سريع' : 'Quick Comprehension Quiz')}
                </span>
                {source === 'phone_recovery' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    {isAr ? 'بعد ترك الجوال' : 'Phone Away'}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                {source === 'phone_recovery'
                  ? (isAr ? 'سؤال سريع وموجز لتثبيت ذهنك في الدرس ومواصلة تقدمك' : 'A quick question to re-lock your focus onto the lesson')
                  : (isAr ? 'تثبيت المعلومة والتأكد من الفهم' : 'Reinforce knowledge and verify understanding')}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-quick-quiz-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-400 flex flex-col items-center justify-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
            <span>{isAr ? 'جاري إنشاء سؤال سريع من محتوى الشريحة...' : 'Generating quick quiz question from slide...'}</span>
          </div>
        ) : (
          <>
            <div>
              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5">
                {isAr
                  ? `الشريحة ${slide.pageNumber} · ${slide.topic || 'المفاهيم الأساسية'}`
                  : `Slide ${slide.pageNumber} · ${slide.topic || 'Core Concepts'}`}
              </div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white leading-relaxed">
                {question}
              </p>
            </div>

            {/* قائمة الخيارات */}
            <div className="space-y-2.5">
              {options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === correctAnswer;
                let style = 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200';

                if (submitted) {
                  if (isCorrect) {
                    style = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold';
                  } else if (isSelected && !isCorrect) {
                    style = 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-medium';
                  } else {
                    style = 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-400 opacity-50';
                  }
                } else if (isSelected) {
                  style = 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-600 dark:border-blue-500 ring-1 ring-blue-600/30 text-blue-900 dark:text-blue-200 font-semibold';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    id={`quick-quiz-option-${idx}`}
                    onClick={() => {
                      if (!submitted) setSelectedOption(option);
                    }}
                    disabled={submitted}
                    className={`w-full text-start p-3.5 rounded-2xl border text-xs transition-all flex items-center justify-between gap-3 ${style}`}
                  >
                    <span className="leading-relaxed">{option}</span>
                    {submitted && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ملاحظة المدرب بعد الإرسال */}
            {submitted && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs space-y-1 animate-in fade-in duration-200">
                <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{isAr ? 'توضيح الإجابة' : 'Explanation'}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">{explanation}</p>
              </div>
            )}

            {/* شريط الإجراءات السفلي */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {submitted ? (isAr ? 'تم التحقق!' : 'Verified!') : (isAr ? 'اختر الإجابة الأدق' : 'Choose the best answer')}
              </span>

              {!submitted ? (
                <button
                  type="button"
                  id="submit-quick-quiz-btn"
                  onClick={() => {
                    if (selectedOption) {
                      setSubmitted(true);
                      if (selectedOption !== correctAnswer) {
                        fetch('/api/spaced-repetition/schedule', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            student_id: currentUser?.uid || 'STU_101',
                            questions: [
                              {
                                id: `quick_missed_${slide.id}_${Date.now()}`,
                                question,
                                topic: slide.topic || slide.title || lectureTitle || (isAr ? 'مفهوم رئيسي' : 'Core Concept'),
                                page: slide.pageNumber || 1,
                                options,
                                correct_answer: correctAnswer,
                                explanation,
                                days_interval: 3
                              }
                            ],
                            days_interval: 3
                          })
                        }).catch(e => console.warn('Could not schedule missed quick quiz:', e));
                      }
                    }
                  }}
                  disabled={!selectedOption}
                  className={`text-xs px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs active:scale-[0.98] ${
                    selectedOption
                      ? 'bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200/60 dark:border-slate-700'
                  }`}
                >
                  {isAr ? 'تحقق من الإجابة' : 'Check Answer'}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="another-quick-quiz-btn"
                    onClick={() => {
                      setSelectedOption(null);
                      setSubmitted(false);
                      loadQuiz();
                    }}
                    className="text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all shadow-xs active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <span>{isAr ? 'سؤال آخر على الشريحة 🔄' : 'Another question 🔄'}</span>
                  </button>
                  <button
                    type="button"
                    id="done-quick-quiz-btn"
                    onClick={onClose}
                    className="text-xs px-5 py-2.5 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white font-bold transition-all shadow-xs active:scale-[0.98]"
                  >
                    {isAr ? 'إنهاء ومتابعة' : 'Done, continue'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};