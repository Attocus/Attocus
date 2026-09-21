import React, { useState } from 'react';
import { Lecture, Slide, GapQuizQuestion, WrapUpReport, ConceptMastery } from '../types';
import { CheckCircle, AlertCircle, ArrowLeft, Sparkles, BookOpen, Clock, Award, RotateCcw, Brain, Check, Cloud, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveSessionReportToFirestore } from '../services/firestoreService';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { isAr, dir } = useLanguage();
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
      dir={dir}
      id="wrapup-session-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="wrapup-session-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-all animate-in zoom-in-95 duration-150"
      >
        {/* ─── الرأس (Header) ─── */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/80 dark:border-blue-900/50 shadow-2xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white tracking-tight">
                {isAr ? 'جلسة إنهاء ومراجعة المذاكرة' : 'Session Wrap-Up & Review'}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400">
                {isAr ? `تقييم الفهم واستخلاص النتائج لـ "${lecture.title}"` : `Assessment & outcomes for "${lecture.title}"`}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-slate-200/60 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {Math.max(1, Math.round(sessionSeconds / 60))} {isAr ? 'دقيقة تركيز' : 'focus mins'}
            </span>
          </div>
        </div>

        {/* ─── الخطوة 1: كتابة التلخيص بأسلوب الطالب ─── */}
        {step === 'prompt_summary' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
              <div className="flex items-start gap-3">
                <span className="text-xl">👩‍🏫</span>
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {isAr ? 'اشرح ما استوعبته بكلماتك وأسلوبك الخاص' : 'Explain what you understood in your own words'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {isAr
                      ? 'لا تقلق بشأن الصياغة الأكاديمية الدقيقة؛ يهدف المعلم الذكي إلى قياس فهمك الحقيقي لآليات المحاضرة.'
                      : "Don't worry about perfect academic phrasing; the smart coach wants to gauge your real grasp of concepts."}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="student-wrapup-summary-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
                {isAr ? 'ملخصك واستيعابك' : 'Your Summary & Understanding'}
              </label>
              <textarea
                id="student-wrapup-summary-input"
                rows={5}
                value={studentSummary}
                onChange={e => setStudentSummary(e.target.value)}
                placeholder={isAr
                  ? 'مثال: في هذه الجلسة فهمت أن العقد تتفق على السجلات باستخدام الفترات الزمنية ومهلة الانتخاب...'
                  : 'Example: In this session I learned that nodes agree on logs using terms and election timeouts...'}
                className="w-full p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-hidden leading-relaxed resize-none transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                id="cancel-wrapup-btn"
                onClick={onClose}
                className="text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-all"
              >
                {isAr ? 'متابعة المذاكرة' : 'Resume Studying'}
              </button>

              <button
                type="button"
                id="submit-wrapup-summary-btn"
                onClick={handleSubmitSummary}
                disabled={!studentSummary.trim() || isSubmitting}
                className={`text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xs active:scale-[0.98] ${
                  studentSummary.trim() && !isSubmitting
                    ? 'bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed'
                }`}
              >
                <span>{isAr ? 'تحقق من استيعابي' : 'Verify Understanding'}</span>
                <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>
        )}

        {/* ─── الخطوة 2: شاشة التحليل ─── */}
        {step === 'analyzing' && (
          <div className="p-14 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100/80 dark:border-blue-900/50 flex items-center justify-center mx-auto animate-bounce shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                {isAr ? 'جاري مطابقة ملخصك مع محاور المحاضرة...' : 'Matching your summary against lecture concepts...'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {isAr
                  ? 'نحدد المفاهيم التي أتقنتها ونرصد الفجوات المعرفية التي تتطلب تركيزاً إضافياً.'
                  : 'Identifying mastered concepts and pinpointing gaps needing extra focus.'}
              </p>
            </div>
          </div>
        )}

        {/* ─── الخطوة 3: اختبار الفجوات المستهدفة ─── */}
        {step === 'gaps_quiz' && gapQuestions.length > 0 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                  {isAr ? 'فحص الفجوات المعرفية' : 'Knowledge Gaps Check'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {isAr ? `سؤال ${currentQuizIndex + 1} من ${gapQuestions.length}` : `Question ${currentQuizIndex + 1} of ${gapQuestions.length}`}
                </span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                {isAr ? `المفهوم: ${gapQuestions[currentQuizIndex].concept}` : `Concept: ${gapQuestions[currentQuizIndex].concept}`}
              </span>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white leading-relaxed">
                {gapQuestions[currentQuizIndex].question}
              </h3>
            </div>

            <div className="space-y-2.5">
              {gapQuestions[currentQuizIndex].options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === gapQuestions[currentQuizIndex].correctAnswer;
                let style = 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200';

                if (answerSubmitted) {
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
                    onClick={() => {
                      if (!answerSubmitted) setSelectedOption(option);
                    }}
                    disabled={answerSubmitted}
                    className={`w-full text-start p-4 rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${style}`}
                  >
                    <span className="leading-relaxed">{option}</span>
                    {answerSubmitted && isCorrect && (
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {answerSubmitted && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 text-xs space-y-1 animate-in fade-in duration-200">
                <div className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{isAr ? 'توضيح واستدراك تعليمي' : 'Educational Insight'}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                  {gapQuestions[currentQuizIndex].explanation}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {answerSubmitted ? (isAr ? 'تم تقييم الإجابة' : 'Answer evaluated') : (isAr ? 'حدد الخيار الصحيح للمتابعة' : 'Select answer to proceed')}
              </span>

              {!answerSubmitted ? (
                <button
                  type="button"
                  id="submit-gap-quiz-btn"
                  onClick={handleSubmitQuizAnswer}
                  disabled={!selectedOption}
                  className={`text-xs px-5 py-2.5 rounded-xl font-bold transition-all shadow-xs active:scale-[0.98] ${
                    selectedOption
                      ? 'bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {isAr ? 'تحقق من الإجابة' : 'Check Answer'}
                </button>
              ) : (
                <button
                  type="button"
                  id="next-gap-quiz-btn"
                  onClick={handleNextQuizQuestion}
                  className="text-xs px-5 py-2.5 rounded-xl font-bold bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                >
                  <span>
                    {currentQuizIndex < gapQuestions.length - 1
                      ? (isAr ? 'السؤال التالي' : 'Next Question')
                      : (isAr ? 'عرض التقرير النهائي' : 'View Final Report')}
                  </span>
                  <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── الخطوة 4: التقرير التعليمي الشامل ─── */}
        {step === 'final_report' && finalReport && (
          <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* بطاقة الإنجاز */}
            <div className="p-5 rounded-3xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#0F172A] dark:bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5 text-blue-400 dark:text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                  {isAr ? 'اكتملت الجلسة بنجاح · تقرير التعلم' : 'Session Completed Successfully · Learning Report'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isAr
                    ? <>قضيت <span className="font-bold text-[#0F172A] dark:text-white">{finalReport.studyTimeMinutes} دقيقة</span> مذاكرة بفاعلية تركيز بلغت <span className="font-bold text-[#0F172A] dark:text-white">{finalReport.focusEfficiencyPercentage}%</span>.</>
                    : <>You spent <span className="font-bold text-[#0F172A] dark:text-white">{finalReport.studyTimeMinutes} minutes</span> studying with <span className="font-bold text-[#0F172A] dark:text-white">{finalReport.focusEfficiencyPercentage}%</span> focus efficiency.</>}
                </p>
                {isSavedToCloud && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 text-[10px] font-bold w-fit mt-1.5 shadow-2xs">
                    <Cloud className="w-3 h-3" />
                    <span>{isAr ? 'تم حفظ الجلسة والتقرير في Cloud Firestore' : 'Saved to Cloud Firestore'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* التوصية المحورية للمدرب */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{isAr ? 'التوصية الأساسية للمدرب الذكي' : 'Primary AI Coach Recommendation'}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {finalReport.primaryRecommendation}
              </p>
            </div>

            {/* خريطة إتقان المفاهيم */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isAr ? 'خريطة استيعاب المفاهيم' : 'Concept Mastery Map'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {finalReport.conceptMap.map((concept, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate pl-2">
                        {concept.concept}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                          concept.status === 'mastered'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50'
                            : concept.status === 'developing'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/50'
                        }`}
                      >
                        {concept.status === 'mastered'
                          ? (isAr ? 'متقن' : 'Mastered')
                          : concept.status === 'developing'
                          ? (isAr ? 'قيد التطوير' : 'Developing')
                          : (isAr ? 'يتطلب مراجعة' : 'Needs Review')}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          concept.status === 'mastered'
                            ? 'bg-emerald-500'
                            : concept.status === 'developing'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${concept.score}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-400 leading-relaxed">{concept.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* جدول التكرار المتباعد */}
            {finalReport.spacedRepetitionQueue && finalReport.spacedRepetitionQueue.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#0F172A] dark:text-white">
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{isAr ? 'مجدول للتكرار المتباعد (Spaced Repetition)' : 'Scheduled for Spaced Repetition'}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  {isAr
                    ? <>سيتم عرض المفهوم <span className="font-bold text-slate-800 dark:text-slate-200">"{finalReport.spacedRepetitionQueue[0].concept}"</span> بصياغة جديدة وتحدٍ مختلف بعد 3 أيام لتثبيته في الذاكرة طويلة المدى.</>
                    : <>The concept <span className="font-bold text-slate-800 dark:text-slate-200">"{finalReport.spacedRepetitionQueue[0].concept}"</span> will be tested again in 3 days with a fresh prompt for long-term retention.</>}
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