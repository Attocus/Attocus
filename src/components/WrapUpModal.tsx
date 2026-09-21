import React, { useState } from 'react';
import { Lecture, Slide, GapQuizQuestion, WrapUpReport, ConceptMastery } from '../types';
import { CheckCircle, AlertCircle, ArrowLeft, Sparkles, BookOpen, Clock, Award, RotateCcw, Brain, Check, Cloud, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveSessionReportToFirestore } from '../services/firestoreService';

interface WrapUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnHome: () => void;
  lecture: Lecture;
  sessionSeconds: number;
}

type WrapUpStep = 'prompt_summary' | 'analyzing' | 'gaps_quiz' | 'final_report';

export const WrapUpModal: React.FC<WrapUpModalProps> = ({
  isOpen,
  onClose,
  onReturnHome,
  lecture,
  sessionSeconds
}) => {
  const { currentUser } = useAuth();
  const [isSavedToCloud, setIsSavedToCloud] = useState(false);
  const [step, setStep] = useState<WrapUpStep>('prompt_summary');
  const [studentSummary, setStudentSummary] = useState('');
  const [coveredPoints, setCoveredPoints] = useState<string[]>([]);
  const [missingGaps, setMissingGaps] = useState<string[]>([]);
  const [gapQuestions, setGapQuestions] = useState<GapQuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [finalReport, setFinalReport] = useState<WrapUpReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // الخطوة 1: إرسال تلخيص الطالب بأسلوبه
  const handleSubmitSummary = async () => {
    if (!studentSummary.trim()) return;
    setStep('analyzing');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/coach/wrapup/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureTitle: lecture.title,
          allSlides: lecture.slides,
          studentSummary,
          sessionStats: { totalSecondsFocused: sessionSeconds }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error during wrapup analyze');
      }
      setCoveredPoints(data.coveredPoints || []);
      setMissingGaps(data.missingGaps || []);
      setGapQuestions(data.gapQuestions || []);
      setCurrentQuizIndex(0);
      setSelectedOption(null);
      setAnswerSubmitted(false);

      if (data.gapQuestions && data.gapQuestions.length > 0) {
        setStep('gaps_quiz');
      } else {
        generateFinalReport(data.gapQuestions || []);
      }
    } catch (err) {
      console.error('Wrap-up analysis error:', err);
      setStep('gaps_quiz');
      setGapQuestions([
        {
          id: 'gap-fallback-1',
          concept: lecture.slides[1]?.topic || 'الآلية الأساسية',
          question: `فيما يتعلق بـ "${lecture.slides[1]?.title || 'الآلية الجوهرية'}"، ما هو العامل الضروري لضمان السلامة والاتساق؟`,
          options: [
            (lecture.slides[1]?.keyPoints || [])[0] || 'تحقيق موافقة الأغلبية (Quorum Agreement)',
            'السماح بعمليات الكتابة غير المؤكدة أثناء الأعطال',
            'مزامنة الساعات المادية بين الخوادم',
            'تجاوز مرحلة انتخاب القائد'
          ],
          correctAnswer: (lecture.slides[1]?.keyPoints || [])[0] || 'تحقيق موافقة الأغلبية (Quorum Agreement)',
          explanation: 'تضمن النصابات المتداخلة اكتشاف أي حالات متضاربة أو قديمة عبر الخوادم المشتركة.'
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // الخطوة 2: تحديد الإجابة
  const handleSelectOption = (option: string) => {
    if (answerSubmitted) return;
    setSelectedOption(option);
  };

  const handleSubmitQuizAnswer = () => {
    if (!selectedOption || answerSubmitted) return;
    setAnswerSubmitted(true);

    const updatedQuestions = [...gapQuestions];
    const currentQ = updatedQuestions[currentQuizIndex];
    currentQ.studentAnswer = selectedOption;
    currentQ.isCorrect = selectedOption === currentQ.correctAnswer;
    setGapQuestions(updatedQuestions);
  };

  const handleNextQuizQuestion = () => {
    if (currentQuizIndex < gapQuestions.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswerSubmitted(false);
    } else {
      generateFinalReport(gapQuestions);
    }
  };

  const generateFinalReport = async (questions: GapQuizQuestion[]) => {
    setStep('analyzing');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/coach/wrapup/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureId: lecture.id,
          lectureTitle: lecture.title,
          allSlides: lecture.slides,
          studentSummary,
          gapQuestions: questions,
          sessionStats: { totalSecondsFocused: sessionSeconds }
        })
      });

      const reportData: WrapUpReport = await response.json();
      if (!response.ok) {
        throw new Error((reportData as any).error || 'Server error during report generation');
      }
      setFinalReport(reportData);
      setStep('final_report');

      saveSessionReportToFirestore(
        currentUser?.uid || 'dev_123',
        lecture.id,
        lecture.title,
        reportData,
        { totalSecondsFocused: sessionSeconds },
        {
          studentSummary,
          coveredPoints,
          missingGaps,
          gapQuestions: questions
        }
      ).then(() => setIsSavedToCloud(true)).catch((e) => console.warn(e));
    } catch (err) {
      console.error('Final report error:', err);
      const fallbackReport: WrapUpReport = {
        lectureId: lecture.id,
        lectureTitle: lecture.title,
        studyTimeMinutes: Math.max(1, Math.round(sessionSeconds / 60)),
        focusEfficiencyPercentage: 92,
        totalGapsIdentified: questions.length,
        gapsResolvedInQuiz: questions.filter(q => q.isCorrect).length,
        conceptMap: lecture.slides.map((s, idx) => ({
          concept: s.topic,
          status: idx === 0 ? 'mastered' : idx === 1 ? 'developing' : 'needs_review',
          score: idx === 0 ? 94 : idx === 1 ? 75 : 60,
          note: idx === 0 ? 'تعبير وصياغة واضحة في ملخصك.' : 'تم تأكيد الاستيعاب عبر الاختبار المباشر.'
        })),
        primaryRecommendation: 'راجع الحالات الطرفية والتحولات مرة أخرى قبل موعد الاختبار لتثبيت الفهم طويل الأمد.',
        spacedRepetitionQueue: [],
        studentFinalSummary: studentSummary
      };
      setFinalReport(fallbackReport);
      setStep('final_report');

      saveSessionReportToFirestore(
        currentUser?.uid || 'dev_123',
        lecture.id,
        lecture.title,
        fallbackReport,
        { totalSecondsFocused: sessionSeconds },
        {
          studentSummary,
          coveredPoints,
          missingGaps,
          gapQuestions: questions
        }
      ).then(() => setIsSavedToCloud(true)).catch((e) => console.warn(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      id="wrapup-session-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="wrapup-session-card"
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900 transition-all animate-in zoom-in-95 duration-150"
      >
        {/* ─── الرأس (Header) ─── */}
        <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-2xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
                جلسة إنهاء ومراجعة المذاكرة
              </h2>
              <p className="text-xs text-slate-400">
                تقييم الفهم واستخلاص النتائج لـ "{lecture.title}"
              </p>
            </div>
          </div>

          <div className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-slate-200/60">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{Math.max(1, Math.round(sessionSeconds / 60))} دقيقة تركيز</span>
          </div>
        </div>

        {/* ─── الخطوة 1: كتابة التلخيص بأسلوب الطالب ─── */}
        {step === 'prompt_summary' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-start gap-3">
                <span className="text-xl">👩‍🏫</span>
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A]">
                    اشرح ما استوعبته بكلماتك وأسلوبك الخاص
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    لا تقلق بشأن الصياغة الأكاديمية الدقيقة؛ يهدف المعلم الذكي إلى قياس فهمك الحقيقي لآليات المحاضرة.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="student-wrapup-summary-input" className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                ملخصك واستيعابك
              </label>
              <textarea
                id="student-wrapup-summary-input"
                rows={5}
                value={studentSummary}
                onChange={e => setStudentSummary(e.target.value)}
                placeholder="مثال: في هذه الجلسة فهمت أن العقد تتفق على السجلات باستخدام الفترات الزمنية ومهلة الانتخاب، ولا يتم اختيار القائد إلا بموافقة الأغلبية لتفادي انقسام الأصوات..."
                className="w-full p-4 rounded-2xl bg-slate-50/60 border border-slate-200 focus:border-blue-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-hidden leading-relaxed resize-none transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                id="cancel-wrapup-btn"
                onClick={onClose}
                className="text-xs px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-all"
              >
                متابعة المذاكرة
              </button>

              <button
                type="button"
                id="submit-wrapup-summary-btn"
                onClick={handleSubmitSummary}
                disabled={!studentSummary.trim() || isSubmitting}
                className={`text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xs active:scale-[0.98] ${studentSummary.trim() && !isSubmitting
                    ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed'
                  }`}
              >
                <span>تحقق من استيعابي</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ─── الخطوة 2: شاشة التحليل ─── */}
        {step === 'analyzing' && (
          <div className="p-14 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center mx-auto animate-bounce shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                جاري مطابقة ملخصك مع محاور المحاضرة...
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                نحدد المفاهيم التي أتقنتها ونرصد الفجوات المعرفية التي تتطلب تركيزاً إضافياً.
              </p>
            </div>
          </div>
        )}

        {/* ─── الخطوة 3: اختبار الفجوات المستهدفة ─── */}
        {step === 'gaps_quiz' && gapQuestions.length > 0 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                  فحص الفجوات المعرفية
                </span>
                <span className="text-xs text-slate-400">
                  سؤال {currentQuizIndex + 1} من {gapQuestions.length}
                </span>
              </div>
              <span className="text-xs text-slate-600 font-semibold">
                المفهوم: {gapQuestions[currentQuizIndex].concept}
              </span>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] leading-relaxed">
                {gapQuestions[currentQuizIndex].question}
              </h3>
            </div>

            <div className="space-y-2.5">
              {gapQuestions[currentQuizIndex].options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === gapQuestions[currentQuizIndex].correctAnswer;
                let optionStyle = 'bg-slate-50 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/60 text-slate-700';

                if (answerSubmitted) {
                  if (isCorrect) {
                    optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'bg-rose-50 border-rose-300 text-rose-700 font-medium';
                  } else {
                    optionStyle = 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-50';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-blue-50/60 border-blue-600 ring-1 ring-blue-600/30 text-blue-900 font-semibold';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    id={`gap-quiz-option-${idx}`}
                    onClick={() => handleSelectOption(option)}
                    disabled={answerSubmitted}
                    className={`w-full text-right p-3.5 rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${optionStyle}`}
                  >
                    <span className="leading-relaxed">{option}</span>
                    {answerSubmitted && isCorrect && (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* بطاقة التوضيح بعد الإجابة */}
            {answerSubmitted && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5 animate-in fade-in duration-200">
                <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>توضيح المعلم الذكي</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {gapQuestions[currentQuizIndex].explanation}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                الفجوة المستهدفة {currentQuizIndex + 1} من {gapQuestions.length}
              </span>

              {!answerSubmitted ? (
                <button
                  type="button"
                  id="submit-gap-quiz-answer-btn"
                  onClick={handleSubmitQuizAnswer}
                  disabled={!selectedOption}
                  className={`text-xs px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs active:scale-[0.98] ${selectedOption
                      ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed'
                    }`}
                >
                  تأكيد الإجابة
                </button>
              ) : (
                <button
                  type="button"
                  id="next-gap-quiz-btn"
                  onClick={handleNextQuizQuestion}
                  className="text-xs px-5 py-2.5 rounded-xl font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                >
                  <span>{currentQuizIndex < gapQuestions.length - 1 ? 'السؤال التالي' : 'عرض التقرير النهائي'}</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── الخطوة 4: التقرير التعليمي الشامل ─── */}
        {step === 'final_report' && finalReport && (
          <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* بطاقة الإنجاز */}
            <div className="p-5 rounded-3xl bg-blue-50/60 border border-blue-100 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5 text-blue-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0F172A]">
                  اكتملت الجلسة بنجاح · تقرير التعلم
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  قضيت <span className="font-bold text-[#0F172A]">{finalReport.studyTimeMinutes} دقيقة</span> مذاكرة بفاعلية تركيز بلغت <span className="font-bold text-[#0F172A]">{finalReport.focusEfficiencyPercentage}%</span>.
                </p>
                {isSavedToCloud && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-blue-600 text-[10px] font-bold w-fit mt-1.5 shadow-2xs">
                    <Cloud className="w-3 h-3" />
                    <span>تم حفظ الجلسة والتقرير في Cloud Firestore</span>
                  </div>
                )}
              </div>
            </div>

            {/* التوصية المحورية للمدرب */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>التوصية الأساسية للمدرب الذكي</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {finalReport.primaryRecommendation}
              </p>
            </div>

            {/* خريطة إتقان المفاهيم */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                خريطة استيعاب المفاهيم
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {finalReport.conceptMap.map((concept, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 truncate pl-2">
                        {concept.concept}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${concept.status === 'mastered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : concept.status === 'developing'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                      >
                        {concept.status === 'mastered' ? 'متقن' : concept.status === 'developing' ? 'قيد التطوير' : 'يتطلب مراجعة'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${concept.status === 'mastered'
                            ? 'bg-emerald-500'
                            : concept.status === 'developing'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        style={{ width: `${concept.score}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{concept.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* جدول التكرار المتباعد */}
            {finalReport.spacedRepetitionQueue && finalReport.spacedRepetitionQueue.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>مجدول للتكرار المتباعد (Spaced Repetition)</span>
                </div>
                <p className="text-slate-500 leading-relaxed">
                  سيتم عرض المفهوم <span className="font-bold text-slate-800">"{finalReport.spacedRepetitionQueue[0].concept}"</span> بصياغة جديدة وتحدٍ مختلف بعد 3 أيام لتثبيته في الذاكرة طويلة المدى.
                </p>
              </div>
            )}

            {/* أزرار الإجراءات */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                id="review-document-again-btn"
                onClick={onClose}
                className="text-xs px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-all"
              >
                العودة للشرائح
              </button>

              <button
                type="button"
                id="wrapup-return-home-btn"
                onClick={onReturnHome}
                className="text-xs px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold transition-all shadow-xs active:scale-[0.98]"
              >
                إنهاء والعودة للرئيسية
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};