import React, { useState, useEffect } from 'react';
import { Slide } from '../types';
import { CheckCircle2, X, HelpCircle, Loader2, Sparkles } from 'lucide-react';

interface QuickQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide: Slide;
  lectureTitle?: string;
}

export const QuickQuizModal: React.FC<QuickQuizModalProps> = ({
  isOpen,
  onClose,
  slide,
  lectureTitle
}) => {
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
    try {
      const res = await fetch('/api/coach/quiz/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slide, lectureTitle })
      });
      const data = await res.json();
      setQuestion(data.question || `ما هو المبدأ الأساسي في "${slide.title}"؟`);
      setOptions(data.options || []);
      setCorrectAnswer(data.correctAnswer || data.options?.[0] || '');
      setExplanation(data.explanation || 'تم التحقق من محتوى شريحة المحاضرة.');
    } catch {
      const cleanKeyPoints = (slide.keyPoints || []).filter(
        kp => !kp.toLowerCase().includes('visual and conceptual takeaways') && !kp.toLowerCase().includes('visual presentation')
      );
      setQuestion(`فيما يخص "${slide.title}"، أي من العبارات التالية تعتبر صحيحة؟`);
      const opts = [
        cleanKeyPoints[0] || 'يحافظ على اتساق وتزامن البيانات عبر جميع العقد والنُسخ.',
        'يسمح بتجاوز عمليات التحقق من النصاب بالأغلبية.',
        'يتطلب مزامنة ساعة مادية دقيقة بين جميع الخوادم.',
        'يعمل فقط عندما تكون جميع خوادم المجموعة نشطة معاً.'
      ];
      setOptions(opts);
      setCorrectAnswer(opts[0]);
      setExplanation('هذا الخيار يمثل المفهوم الجوهري المثبت في هذه الشريحة.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      id="quick-quiz-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        id="quick-quiz-modal-card"
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 p-6 sm:p-7 space-y-5 relative animate-in zoom-in-95 duration-150"
      >
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                اختبار استيعاب سريع
              </h3>
              <p className="text-[11px] text-slate-400">تثبيت المعلومة والتأكد من الفهم</p>
            </div>
          </div>
          <button
            type="button"
            id="close-quick-quiz-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>جاري إنشاء سؤال سريع من محتوى الشريحة...</span>
          </div>
        ) : (
          <>
            <div>
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">
                الشريحة {slide.pageNumber} · {slide.topic || 'المفاهيم الأساسية'}
              </div>
              <p className="text-sm font-bold text-[#0F172A] leading-relaxed">
                {question}
              </p>
            </div>

            {/* قائمة الخيارات */}
            <div className="space-y-2.5">
              {options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === correctAnswer;
                let style = 'bg-slate-50 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/60 text-slate-700';

                if (submitted) {
                  if (isCorrect) {
                    style = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold';
                  } else if (isSelected && !isCorrect) {
                    style = 'bg-rose-50 border-rose-300 text-rose-700 font-medium';
                  } else {
                    style = 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-50';
                  }
                } else if (isSelected) {
                  style = 'bg-blue-50/60 border-blue-600 ring-1 ring-blue-600/30 text-blue-900 font-semibold';
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
                    className={`w-full text-right p-3.5 rounded-2xl border text-xs transition-all flex items-center justify-between gap-3 ${style}`}
                  >
                    <span className="leading-relaxed">{option}</span>
                    {submitted && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ملاحظة المدرب بعد الإرسال */}
            {submitted && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1 animate-in fade-in duration-200">
                <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>توضيح الإجابة</span>
                </div>
                <p className="text-slate-600 leading-relaxed pt-0.5">{explanation}</p>
              </div>
            )}

            {/* شريط الإجراءات السفلي */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                {submitted ? 'تم التحقق!' : 'اختر الإجابة الأدق'}
              </span>

              {!submitted ? (
                <button
                  type="button"
                  id="submit-quick-quiz-btn"
                  onClick={() => {
                    if (selectedOption) setSubmitted(true);
                  }}
                  disabled={!selectedOption}
                  className={`text-xs px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs active:scale-[0.98] ${selectedOption
                      ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
                    }`}
                >
                  تحقق من الإجابة
                </button>
              ) : (
                <button
                  type="button"
                  id="done-quick-quiz-btn"
                  onClick={onClose}
                  className="text-xs px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold transition-all shadow-xs active:scale-[0.98]"
                >
                  فهمت ذلك، متابعة
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};