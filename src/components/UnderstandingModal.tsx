import React, { useState, useEffect } from 'react';
import { Slide, UnderstandingTurn, CompiledSummary } from '../types';
import { Brain, Sparkles, ArrowLeft, CheckCheck, X, AlertCircle, CheckCircle2, FastForward, Edit3, HelpCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getSlideLanguage } from '../utils/slideLanguage';

interface UnderstandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide: Slide;
  lectureTitle: string;
  lectureId?: string;
}

export const UnderstandingModal: React.FC<UnderstandingModalProps> = ({
  isOpen,
  onClose,
  slide,
  lectureTitle,
  lectureId
}) => {
  const [history, setHistory] = useState<UnderstandingTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [studentInput, setStudentInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [compiledSummary, setCompiledSummary] = useState<CompiledSummary | null>(null);
  const [editableSummaryText, setEditableSummaryText] = useState<string>('');
  const [isEditingSummary, setIsEditingSummary] = useState<boolean>(false);
  const [slideAxes, setSlideAxes] = useState<string[]>([]);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const saveSummaryToStorage = (summaryObj: CompiledSummary, text: string) => {
    const targetLectureId = lectureId || 'current';
    const storageKey = `attocus_lecture_summaries_${targetLectureId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const newEntry = {
        id: `sum-${Date.now()}`,
        slideId: slide.id,
        slideNumber: slide.pageNumber,
        slideTopic: slide.topic || slide.title,
        date: new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        studentWordsSummary: text,
        takeaways: summaryObj.lectureTakeaways || slide.keyPoints || [],
        strengths: summaryObj.strengths || [],
        corrections: summaryObj.corrections || []
      };
      const filtered = existing.filter((s: any) => s.slideId !== slide.id);
      const updated = [newEntry, ...filtered];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSaveNotice(isAr ? '✓ تم حفظ الملخص بنجاح في مذكراتك الأكاديمية!' : '✓ Summary saved to your academic notes!');
      setTimeout(() => setSaveNotice(null), 3000);
    } catch (err) {
      console.warn('Failed to save summary to localStorage:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setHistory([]);
      setIsFinished(false);
      setCompiledSummary(null);
      setStudentInput('');
      setIsEditingSummary(false);
      setSlideAxes([]);
      startLoop();
    }
  }, [isOpen, slide.id]);

  const startLoop = async () => {
    setIsLoading(true);
    const slideLang = getSlideLanguage(slide);
    try {
      const response = await fetch('/api/coach/understanding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slide, lectureTitle, language: slideLang })
      });
      const data = await response.json();
      setCurrentQuestion(
        data.question ||
        (slideLang === 'ar'
          ? `بأسلوبك الخاص، ما الذي فهمته من "${slide.topic || slide.title}"؟`
          : `In your own words, what did you understand about "${slide.topic || slide.title}"?`)
      );
      if (data.slideAxes && data.slideAxes.length > 0) {
        setSlideAxes(data.slideAxes);
      }
    } catch {
      setCurrentQuestion(
        slideLang === 'ar'
          ? `بأسلوبك الخاص، ما الذي فهمته من "${slide.topic || slide.title}"؟`
          : `In your own words, what did you understand about "${slide.topic || slide.title}"?`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAnswer = async (answerText: string, isIDontKnow = false) => {
    if (!answerText.trim() && !isIDontKnow) return;
    setIsLoading(true);
    const slideLang = getSlideLanguage(slide);

    const activeAnswer = isIDontKnow
      ? (slideLang === 'ar' ? "لا أعلم شيئاً عن هذا المفهوم حتى الآن." : "I don't know much about this concept yet.")
      : answerText;

    try {
      const response = await fetch('/api/coach/understanding/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide,
          lectureTitle,
          question: currentQuestion,
          studentAnswer: activeAnswer,
          history,
          isIDontKnow,
          language: slideLang
        })
      });

      const data = await response.json();
      const newTurn: UnderstandingTurn = {
        question: currentQuestion,
        studentAnswer: activeAnswer,
        analysis: data.analysis
      };

      const updatedHistory = [...history, newTurn];
      setHistory(updatedHistory);
      setStudentInput('');

      if (data.isFinished) {
        setIsFinished(true);
        generateSummary(updatedHistory);
      } else {
        setCurrentQuestion(
          data.followUpQuestion ||
          (slideLang === 'ar'
            ? `ما هو دور ${(slide.keyPoints || [])[0] || 'هذا العنصر'} في السياق؟`
            : `What role does ${(slide.keyPoints || [])[0] || 'this element'} play in this context?`)
        );
      }
    } catch (err) {
      console.error('Understanding step error:', err);
      const newTurn: UnderstandingTurn = {
        question: currentQuestion,
        studentAnswer: activeAnswer,
        analysis: {
          covered: [slide.topic],
          missing: [],
          incorrect: [],
          feedback: slideLang === 'ar' ? 'شكراً لصياغة إجابتك بوضوح.' : 'Thank you for explaining clearly.'
        }
      };
      setHistory([...history, newTurn]);
      setIsFinished(true);
      generateSummary([...history, newTurn]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipToSummary = () => {
    setIsFinished(true);
    generateSummary(history);
  };

  const generateSummary = async (currentHistory: UnderstandingTurn[]) => {
    setIsLoading(true);
    const slideLang = getSlideLanguage(slide);
    try {
      const response = await fetch('/api/coach/understanding/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide,
          history: currentHistory,
          language: slideLang
        })
      });
      const data: CompiledSummary = await response.json();
      setCompiledSummary(data);
      setEditableSummaryText(data.studentWordsSummary);
      saveSummaryToStorage(data, data.studentWordsSummary);
    } catch {
      const validAnswers = currentHistory.map(h => h.studentAnswer).filter(a => !a.includes("لا أعلم") && !a.toLowerCase().includes("don't know"));
      const fallbackParagraphs = slideLang === 'ar'
        ? (validAnswers.length > 1
          ? [
            validAnswers.slice(0, Math.ceil(validAnswers.length / 2)).join('. ') + '.',
            validAnswers.slice(Math.ceil(validAnswers.length / 2)).join('. ') + '.'
          ].join('\n\n')
          : (validAnswers[0]
            ? `${validAnswers[0]}.\n\nأظهرت شروحاتك تفاعلاً إيجابياً مع المفاهيم والآليات الجوهرية للشريحة.`
            : `تم استكشاف ${slide.topic || slide.title} وأهم خصائصها.\n\nتمت مراجعة الآليات الأساسية والعلاقات المترابطة.`))
        : (validAnswers.length > 1
          ? [
            validAnswers.slice(0, Math.ceil(validAnswers.length / 2)).join('. ') + '.',
            validAnswers.slice(Math.ceil(validAnswers.length / 2)).join('. ') + '.'
          ].join('\n\n')
          : (validAnswers[0]
            ? `${validAnswers[0]}.\n\nYour explanations demonstrated direct engagement with the core conceptual mechanisms.`
            : `Explored the foundations of ${slide.topic || slide.title}.\n\nKey mechanisms and relationships were reviewed.`));

      const fallbackSummary: CompiledSummary = {
        studentWordsSummary: fallbackParagraphs,
        inlineCorrections: [],
        corrections: slideLang === 'ar' ? [
          'التحقق من الحالات الطرفية والقيود المشروحة في المحاضرة.',
          'مراجعة التعريفات الدقيقة للمعايير الأساسية.'
        ] : [
          'Verify edge cases and operational constraints discussed in the lecture.',
          'Review precise formal definitions of core principles.'
        ],
        strengths: slideLang === 'ar' ? [
          'التعبير عن الفكرة الجوهرية بأسلوبك وكلماتك الخاصة.',
          'المشاركة النشطة والتفاعل خلال الحوار التفاعلي.'
        ] : [
          'Articulating the core intuition using your own authentic words.',
          'Active analytical engagement during the interactive dialogue.'
        ],
        lectureTakeaways: slideAxes.length > 0 ? slideAxes : (slide.keyPoints || [slide.title])
      };
      setCompiledSummary(fallbackSummary);
      setEditableSummaryText(fallbackSummary.studentWordsSummary);
      saveSummaryToStorage(fallbackSummary, fallbackSummary.studentWordsSummary);
    } finally {
      setIsLoading(false);
    }
  };

  const { isAr, dir } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      dir={dir}
      id="understanding-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="understanding-modal-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-all flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/80 dark:border-blue-900/50 shadow-2xs">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] dark:text-white tracking-tight">
                {isAr ? 'حوار التحقق والاستيعاب' : 'Comprehension & Verification Dialogue'}
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                {isAr ? `الشريحة ${slide.pageNumber}: ${slide.topic || 'المفاهيم الجوهرية'}` : `Slide ${slide.pageNumber}: ${slide.topic || 'Core Concepts'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFinished && (
              <button
                type="button"
                id="skip-to-summarize-btn"
                onClick={handleSkipToSummary}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition-all"
                title={isAr ? 'إنهاء الحوار وتوليد التلخيص فوراً بناءً على إجاباتك الحالية' : 'End dialogue and generate summary immediately based on current answers'}
              >
                <FastForward className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{isAr ? 'تخطي والتلخيص فوراً' : 'Skip & Summarize Now'}</span>
              </button>
            )}
            <button
              type="button"
              id="close-understanding-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* History */}
          {history.map((turn, idx) => (
            <div key={idx} className="space-y-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">{isAr ? 'المساعد:' : 'Assistant:'}</span>
                <span className="leading-relaxed">{turn.question}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0F172A] dark:bg-blue-600 text-white text-xs flex items-start gap-2.5 mr-4 shadow-xs">
                <span className="font-bold text-blue-300 dark:text-blue-100 shrink-0">{isAr ? 'أنت:' : 'You:'}</span>
                <span className="leading-relaxed">{turn.studentAnswer}</span>
              </div>

              {turn.analysis?.feedback && turn.analysis.feedback !== currentQuestion && turn.analysis.feedback !== turn.question && (
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 mr-4 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="leading-relaxed">{turn.analysis.feedback}</span>
                </div>
              )}
            </div>
          ))}

          {/* Slide Axes Roadmap */}
          {slideAxes.length > 0 && history.length === 0 && !isFinished && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                  {isAr ? 'المحاور الأساسية للشريحة' : 'Key Axes of This Topic'}
                </span>
              </div>
              <div className="space-y-1.5">
                {slideAxes.map((axis, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                    <span className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 border border-indigo-200/60 dark:border-indigo-800/50">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-medium">{axis}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 pt-1">
                {isAr ? 'سيتم توجيه الحوار التفاعلي لتغطية هذه المحاور تدريجياً.' : 'The interactive dialogue will guide you through these axes step by step.'}
              </p>
            </div>
          )}

          {/* Active Question */}
          {!isFinished && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                  {isAr ? 'سؤال المتابعة الذكي' : 'Smart Follow-up Question'}
                </div>
                <p className="text-sm font-bold text-[#0F172A] dark:text-white leading-relaxed">{currentQuestion}</p>
              </div>

              <div className="space-y-2.5">
                <textarea
                  id="student-understanding-answer-input"
                  rows={3}
                  value={studentInput}
                  onChange={e => setStudentInput(e.target.value)}
                  placeholder={isAr ? 'اشرح بكلماتك وأسلوبك الخاص ما فهمته...' : 'Explain what you understood in your own words...'}
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-600/10 text-xs text-slate-900 dark:text-slate-100 outline-hidden leading-relaxed resize-none transition-all shadow-2xs"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    id="idont-know-anything-btn"
                    onClick={() => handleSendAnswer('', true)}
                    disabled={isLoading}
                    className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isAr ? 'لا أعلم شيئاً عن هذا المفهوم' : "I don't know yet"}</span>
                  </button>

                  <button
                    type="button"
                    id="submit-understanding-answer-btn"
                    onClick={() => handleSendAnswer(studentInput)}
                    disabled={!studentInput.trim() || isLoading}
                    className={`text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] ${
                      studentInput.trim() && !isLoading
                        ? 'bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white cursor-pointer'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300 dark:text-white" />
                        <span>{isAr ? 'جاري التحليل...' : 'Analyzing...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{isAr ? 'إرسال الإجابة' : 'Submit Answer'}</span>
                        <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compiled Summary */}
          {isFinished && compiledSummary && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white uppercase tracking-wider">
                      {isAr ? 'ملخص بأسلوبك وكلماتك الخاصة' : 'Summary in Your Own Words'}
                    </span>
                  </div>
                  <button
                    type="button"
                    id="toggle-edit-summary-btn"
                    onClick={() => {
                      if (isEditingSummary && compiledSummary) {
                        saveSummaryToStorage(compiledSummary, editableSummaryText);
                      }
                      setIsEditingSummary(!isEditingSummary);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 font-bold transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditingSummary ? (isAr ? 'حفظ التعديل' : 'Save Edit') : (isAr ? 'تعديل الصياغة' : 'Edit Text')}</span>
                  </button>
                </div>

                {saveNotice && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center animate-in fade-in duration-150">
                    {saveNotice}
                  </div>
                )}

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr
                    ? 'تمت صياغة هذا الملخص من إجاباتك التفاعلية لترتيب الفهم في فقرات مترابطة.'
                    : 'This summary was synthesized from your interactive answers to organize understanding.'}
                </p>
              </div>

              {isEditingSummary ? (
                <textarea
                  id="editable-student-summary-textarea"
                  rows={6}
                  value={editableSummaryText}
                  onChange={e => setEditableSummaryText(e.target.value)}
                  placeholder={isAr ? 'حرر فقرات الملخص هنا...' : 'Edit summary paragraphs here...'}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-blue-600 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-hidden leading-relaxed resize-none shadow-2xs"
                />
              ) : (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 shadow-2xs space-y-3">
                  {editableSummaryText
                    .split(/(?:Corrections|التصحيحات|Your Strengths|نقاط القوة):/i)[0]
                    .split(/\n\s*\n/)
                    .map(p => p.trim())
                    .filter(Boolean)
                    .map((paragraph, pIdx) => (
                      <p key={pIdx} className="leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                </div>
              )}

              {/* Corrections */}
              {((compiledSummary.corrections && compiledSummary.corrections.length > 0) || (compiledSummary.inlineCorrections && compiledSummary.inlineCorrections.length > 0)) && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{isAr ? 'التصحيحات والاستدراكات المعرفية' : 'Knowledge Corrections & Clarifications'}</span>
                  </div>

                  {compiledSummary.corrections && compiledSummary.corrections.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 shadow-2xs space-y-2 text-xs">
                      {compiledSummary.corrections.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span className="leading-relaxed font-semibold">
                            {point.replace(/^[-*•\d.]+\s*/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {compiledSummary.inlineCorrections && compiledSummary.inlineCorrections.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {compiledSummary.inlineCorrections.map((corr, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="line-through text-rose-600 dark:text-rose-400">{corr.original}</span>
                            <ArrowLeft className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{corr.correction}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{corr.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Strengths */}
              {compiledSummary.strengths && compiledSummary.strengths.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{isAr ? 'نقاط القوة والاستيعاب لديك' : 'Your Strengths & Understanding'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 shadow-2xs space-y-2 text-xs">
                    {compiledSummary.strengths.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed font-semibold">
                          {point.replace(/^[-*•\d.]+\s*/, '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Lecture Takeaways */}
              {compiledSummary.lectureTakeaways && compiledSummary.lectureTakeaways.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isAr ? 'المحاور الأساسية للشريحة' : 'Key Lecture Takeaways'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-2 text-xs">
                    {compiledSummary.lectureTakeaways.map((takeaway, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{takeaway.replace(/^[-*•\d.]+\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isFinished && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-400 font-medium">
              {isAr ? 'تم حفظ التلخيص ضمن جلسة المذاكرة الحالية' : 'Summary saved to current study session'}
            </span>
            <button
              type="button"
              id="save-understanding-and-close-btn"
              onClick={() => {
                if (compiledSummary) {
                  saveSummaryToStorage(compiledSummary, editableSummaryText);
                }
                onClose();
              }}
              className="text-xs px-5 py-2.5 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white font-bold flex items-center gap-2 transition-all shadow-xs active:scale-[0.98]"
            >
              <CheckCheck className="w-4 h-4 text-blue-400 dark:text-white" />
              <span>{isAr ? 'حفظ ومتابعة المذاكرة' : 'Save & Continue'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};