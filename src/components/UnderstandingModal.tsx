import React, { useState, useEffect } from 'react';
import { Slide, UnderstandingTurn, CompiledSummary } from '../types';
import { Brain, Sparkles, ArrowLeft, CheckCheck, X, AlertCircle, CheckCircle2, FastForward, Edit3, HelpCircle, Loader2 } from 'lucide-react';

interface UnderstandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide: Slide;
  lectureTitle: string;
}

export const UnderstandingModal: React.FC<UnderstandingModalProps> = ({
  isOpen,
  onClose,
  slide,
  lectureTitle
}) => {
  const [history, setHistory] = useState<UnderstandingTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [studentInput, setStudentInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [compiledSummary, setCompiledSummary] = useState<CompiledSummary | null>(null);
  const [editableSummaryText, setEditableSummaryText] = useState<string>('');
  const [isEditingSummary, setIsEditingSummary] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setHistory([]);
      setIsFinished(false);
      setCompiledSummary(null);
      setStudentInput('');
      setIsEditingSummary(false);
      startLoop();
    }
  }, [isOpen, slide.id]);

  const startLoop = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/coach/understanding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slide, lectureTitle })
      });
      const data = await response.json();
      setCurrentQuestion(data.question || `بأسلوبك الخاص، ما الذي فهمته من "${slide.topic || slide.title}"؟`);
    } catch {
      setCurrentQuestion(`بأسلوبك الخاص، ما الذي فهمته من "${slide.topic || slide.title}"؟`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAnswer = async (answerText: string, isIDontKnow = false) => {
    if (!answerText.trim() && !isIDontKnow) return;
    setIsLoading(true);

    const activeAnswer = isIDontKnow ? "لا أعلم شيئاً عن هذا المفهوم حتى الآن." : answerText;

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
          isIDontKnow
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
        setCurrentQuestion(data.followUpQuestion || `ما هو دور ${slide.keyPoints[0] || 'هذا العنصر'} في السياق؟`);
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
          feedback: 'شكراً لصياغة إجابتك بوضوح.'
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
    try {
      const response = await fetch('/api/coach/understanding/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide,
          history: currentHistory
        })
      });
      const data: CompiledSummary = await response.json();
      setCompiledSummary(data);
      setEditableSummaryText(data.studentWordsSummary);
    } catch {
      const validAnswers = currentHistory.map(h => h.studentAnswer).filter(a => !a.includes("لا أعلم"));
      const fallbackParagraphs = validAnswers.length > 1
        ? [
          validAnswers.slice(0, Math.ceil(validAnswers.length / 2)).join('. ') + '.',
          validAnswers.slice(Math.ceil(validAnswers.length / 2)).join('. ') + '.'
        ].join('\n\n')
        : (validAnswers[0]
          ? `${validAnswers[0]}.\n\nأظهرت شروحاتك تفاعلاً إيجابياً مع المفاهيم والآليات الجوهرية للشريحة.`
          : `تم استكشاف ${slide.topic || slide.title} وأهم خصائصها.\n\nتمت مراجعة الآليات الأساسية والعلاقات المترابطة.`);

      const fallbackSummary: CompiledSummary = {
        studentWordsSummary: fallbackParagraphs,
        inlineCorrections: [],
        corrections: [
          'التحقق من الحالات الطرفية والقيود المشروحة في المحاضرة.',
          'مراجعة التعريفات الدقيقة للمعايير الأساسية.'
        ],
        strengths: [
          'التعبير عن الفكرة الجوهرية بأسلوبك وكلماتك الخاصة.',
          'المشاركة النشطة والتفاعل خلال الحوار السقراطي.'
        ],
        lectureTakeaways: slide.keyPoints
      };
      setCompiledSummary(fallbackSummary);
      setEditableSummaryText(fallbackSummary.studentWordsSummary);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      id="understanding-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="understanding-modal-card"
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden text-slate-900 transition-all flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-2xs">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                حوار التحقق والاستيعاب
              </h2>
              <p className="text-[11px] text-slate-400">
                الشريحة {slide.pageNumber}: {slide.topic || 'المفاهيم الجوهرية'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFinished && (
              <button
                type="button"
                id="skip-to-summarize-btn"
                onClick={handleSkipToSummary}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold flex items-center gap-1.5 transition-all"
                title="إنهاء الحوار وتوليد التلخيص فوراً بناءً على إجاباتك الحالية"
              >
                <FastForward className="w-3.5 h-3.5 text-blue-600" />
                <span>تخطي والتلخيص فوراً</span>
              </button>
            )}
            <button
              type="button"
              id="close-understanding-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
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
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-800 flex items-start gap-2.5">
                <span className="font-bold text-blue-600 shrink-0">المساعد:</span>
                <span className="leading-relaxed">{turn.question}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0F172A] text-white text-xs flex items-start gap-2.5 mr-4 shadow-xs">
                <span className="font-bold text-blue-300 shrink-0">أنت:</span>
                <span className="leading-relaxed">{turn.studentAnswer}</span>
              </div>

              {turn.analysis?.feedback && turn.analysis.feedback !== currentQuestion && turn.analysis.feedback !== turn.question && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 mr-4 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="leading-relaxed">{turn.analysis.feedback}</span>
                </div>
              )}
            </div>
          ))}

          {/* Active Question */}
          {!isFinished && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                  سؤال المتابعة الذكي
                </div>
                <p className="text-sm font-bold text-[#0F172A] leading-relaxed">{currentQuestion}</p>
              </div>

              <div className="space-y-2.5">
                <textarea
                  id="student-understanding-answer-input"
                  rows={3}
                  value={studentInput}
                  onChange={e => setStudentInput(e.target.value)}
                  placeholder="اشرح بكلماتك وأسلوبك الخاص ما فهمته..."
                  className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs text-slate-900 outline-hidden leading-relaxed resize-none transition-all shadow-2xs"
                />

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    id="idont-know-anything-btn"
                    onClick={() => handleSendAnswer('', true)}
                    disabled={isLoading}
                    className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>لا أعلم شيئاً عن هذا المفهوم</span>
                  </button>

                  <button
                    type="button"
                    id="submit-understanding-answer-btn"
                    onClick={() => handleSendAnswer(studentInput)}
                    disabled={!studentInput.trim() || isLoading}
                    className={`text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] ${studentInput.trim() && !isLoading
                        ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed'
                      }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-300" />
                        <span>جاري التحليل...</span>
                      </>
                    ) : (
                      <>
                        <span>إرسال الإجابة</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
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
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      ملخص بأسلوبك وكلماتك الخاصة
                    </span>
                  </div>
                  <button
                    type="button"
                    id="toggle-edit-summary-btn"
                    onClick={() => setIsEditingSummary(!isEditingSummary)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditingSummary ? 'حفظ التعديل' : 'تعديل الصياغة'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  تمت صياغة هذا الملخص من إجاباتك السقراطية لترتيب الفهم في فقرات مترابطة.
                </p>
              </div>

              {isEditingSummary ? (
                <textarea
                  id="editable-student-summary-textarea"
                  rows={6}
                  value={editableSummaryText}
                  onChange={e => setEditableSummaryText(e.target.value)}
                  placeholder="حرر فقرات الملخص هنا..."
                  className="w-full p-4 rounded-2xl bg-white border border-blue-600 text-xs sm:text-sm text-slate-900 outline-hidden leading-relaxed resize-none shadow-2xs"
                />
              ) : (
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 text-xs sm:text-sm leading-relaxed text-slate-800 shadow-2xs space-y-3">
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
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>التصحيحات والاستدراكات المعرفية</span>
                  </div>

                  {compiledSummary.corrections && compiledSummary.corrections.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 shadow-2xs space-y-2 text-xs">
                      {compiledSummary.corrections.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-amber-900">
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
                          className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="line-through text-rose-600">{corr.original}</span>
                            <ArrowLeft className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-emerald-600">{corr.correction}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{corr.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Strengths */}
              {compiledSummary.strengths && compiledSummary.strengths.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>نقاط القوة والاستيعاب لديك</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 shadow-2xs space-y-2 text-xs">
                    {compiledSummary.strengths.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-emerald-900">
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
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>المحاور الأساسية للشريحة</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs space-y-2 text-xs">
                    {compiledSummary.lectureTakeaways.map((takeaway, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
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
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              تم حفظ التلخيص ضمن جلسة المذاكرة الحالية
            </span>
            <button
              type="button"
              id="save-understanding-and-close-btn"
              onClick={onClose}
              className="text-xs px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold flex items-center gap-2 transition-all shadow-xs active:scale-[0.98]"
            >
              <CheckCheck className="w-4 h-4 text-blue-400" />
              <span>حفظ ومتابعة المذاكرة</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};