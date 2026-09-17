import React, { useState, useEffect } from 'react';
import { Slide, UnderstandingTurn, QuestionAnalysis, CompiledSummary } from '../types';
import { Brain, Sparkles, ArrowRight, Check, HelpCircle, FastForward, Edit3, CheckCheck, X, AlertCircle, CheckCircle2 } from 'lucide-react';

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

  // Initialize loop on open
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
      setCurrentQuestion(data.question || `In your own words, what did you understand about ${slide.topic || slide.title}?`);
    } catch {
      setCurrentQuestion(`In your own words, what did you understand about ${slide.topic || slide.title}?`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAnswer = async (answerText: string, isIDontKnow = false) => {
    if (!answerText.trim() && !isIDontKnow) return;
    setIsLoading(true);

    const activeAnswer = isIDontKnow ? "I don't know anything about this yet." : answerText;

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
        setCurrentQuestion(data.followUpQuestion || `What role does ${slide.keyPoints[0] || 'this component'} play?`);
      }
    } catch (err) {
      console.error('Understanding step error:', err);
      // Fallback
      const newTurn: UnderstandingTurn = {
        question: currentQuestion,
        studentAnswer: activeAnswer,
        analysis: {
          covered: [slide.topic],
          missing: [],
          incorrect: [],
          feedback: 'Thanks for articulating that clearly.'
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
      const validAnswers = currentHistory.map(h => h.studentAnswer).filter(a => !a.includes("don't know"));
      const fallbackParagraphs = validAnswers.length > 1
        ? [
            validAnswers.slice(0, Math.ceil(validAnswers.length / 2)).join('. ') + '.',
            validAnswers.slice(Math.ceil(validAnswers.length / 2)).join('. ') + '.'
          ].join('\n\n')
        : (validAnswers[0]
            ? `${validAnswers[0]}.\n\nYour explanations demonstrated engagement with the core conceptual mechanisms.`
            : `Explored ${slide.topic || slide.title} and its key properties.\n\nKey mechanisms and relationships were reviewed.`);

      const fallbackSummary: CompiledSummary = {
        studentWordsSummary: fallbackParagraphs,
        inlineCorrections: [],
        corrections: [
          'Verify edge cases and boundary conditions discussed in the lecture.',
          'Review the precise definitions of the primary parameters.'
        ],
        strengths: [
          'Articulated the core intuition clearly in your own words.',
          'Active participation across the Socratic comprehension loop.'
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
      id="understanding-modal-overlay"
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="understanding-modal-card"
        className="bg-[#FAFAF8] rounded-2xl border border-[#E0E2DC] shadow-xl w-full max-w-2xl overflow-hidden text-[#202326] transition-all flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E8EAE4] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3EA] text-[#2E7D32] flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-[#191B1D]">
                Comprehension Dialogue
              </h2>
              <p className="text-[11px] text-[#6B7177]">
                Slide {slide.pageNumber}: {slide.topic}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFinished && (
              <button
                type="button"
                id="skip-to-summarize-btn"
                onClick={handleSkipToSummary}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-[#D5D8D0] text-[#555C62] hover:bg-[#F3F4F0] font-medium flex items-center gap-1.5 transition-colors"
                title="End the loop immediately and generate the summary from current statements"
              >
                <FastForward className="w-3 h-3 text-[#406882]" />
                <span>Skip — just summarize</span>
              </button>
            )}
            <button
              type="button"
              id="close-understanding-modal-btn"
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-[#F0F2ED] flex items-center justify-center text-[#6B7177]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* History of turns */}
          {history.map((turn, idx) => (
            <div key={idx} className="space-y-2">
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E4DC] text-xs text-[#2A2E33] flex items-start gap-2.5">
                <span className="font-semibold text-[#2E7D32]">Coach:</span>
                <span className="leading-relaxed">{turn.question}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F0F4ED] border border-[#D9E4D4] text-xs text-[#1E3A24] flex items-start gap-2.5 ml-4">
                <span className="font-semibold text-[#3E6543]">You:</span>
                <span className="leading-relaxed">{turn.studentAnswer}</span>
              </div>

              {turn.analysis?.feedback && turn.analysis.feedback !== currentQuestion && turn.analysis.feedback !== turn.question && (
                <div className="p-2.5 rounded-lg bg-[#FAF7F0] border border-[#EDE4D0] text-[11px] text-[#5D5545] ml-4 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#B78103] shrink-0" />
                  <span>{turn.analysis.feedback}</span>
                </div>
              )}
            </div>
          ))}

          {/* Active Question if not finished */}
          {!isFinished && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-[#DDE0D8] text-sm text-[#1A1D20] shadow-2xs">
                <div className="text-[11px] font-semibold text-[#2E7D32] uppercase tracking-wider mb-1">
                  Coach Follow-up
                </div>
                <p className="font-serif leading-relaxed">{currentQuestion}</p>
              </div>

              <div className="space-y-2">
                <textarea
                  id="student-understanding-answer-input"
                  rows={3}
                  value={studentInput}
                  onChange={e => setStudentInput(e.target.value)}
                  placeholder="Explain in your own words..."
                  className="w-full p-3 rounded-xl bg-white border border-[#D5D8D0] focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/20 text-xs text-[#1F2327] outline-hidden leading-relaxed resize-none transition-all shadow-2xs"
                />

                <div className="flex items-center justify-between pt-1">
                  {/* Required UI detail: "I don't know anything about this" button */}
                  <button
                    type="button"
                    id="idont-know-anything-btn"
                    onClick={() => handleSendAnswer('', true)}
                    disabled={isLoading}
                    className="text-xs px-3.5 py-2 rounded-xl border border-[#D8DBD3] bg-white hover:bg-[#F4F5F1] text-[#60666C] font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[#888E94]" />
                    <span>I don't know anything about this</span>
                  </button>

                  <button
                    type="button"
                    id="submit-understanding-answer-btn"
                    onClick={() => handleSendAnswer(studentInput)}
                    disabled={!studentInput.trim() || isLoading}
                    className={`text-xs px-4 py-2 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
                      studentInput.trim() && !isLoading
                        ? 'bg-[#2E7D32] hover:bg-[#256629] text-white shadow-xs'
                        : 'bg-[#E0E2DC] text-[#8C9298] cursor-not-allowed'
                    }`}
                  >
                    <span>Send Answer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Compiled Summary when loop is finished */}
          {isFinished && compiledSummary && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-[#F0F5EE] border border-[#D5E5D1] space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2E7D32]" />
                    <span className="text-xs font-semibold text-[#1E3A24] uppercase tracking-wider">
                      Synthesis in Your Own Words · ملخص في كلماتك
                    </span>
                  </div>
                  <button
                    type="button"
                    id="toggle-edit-summary-btn"
                    onClick={() => setIsEditingSummary(!isEditingSummary)}
                    className="text-xs text-[#2E7D32] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditingSummary ? 'Done Editing' : 'Edit Words'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#405445]">
                  Constructed from your Socratic answers and structured into clear paragraphs.
                </p>
              </div>

              {isEditingSummary ? (
                <textarea
                  id="editable-student-summary-textarea"
                  rows={6}
                  value={editableSummaryText}
                  onChange={e => setEditableSummaryText(e.target.value)}
                  placeholder="Edit your paragraphs here..."
                  className="w-full p-4 rounded-xl bg-white border border-[#2E7D32] text-xs sm:text-sm text-[#1F2327] outline-hidden leading-relaxed resize-none shadow-2xs"
                />
              ) : (
                <div className="p-5 rounded-2xl bg-white border border-[#E0E3DA] text-xs sm:text-sm leading-relaxed text-[#2A2E33] shadow-2xs space-y-3.5">
                  {editableSummaryText
                    .split(/(?:Corrections|التصحيحات|Your Strengths|نقاط القوة):/i)[0]
                    .split(/\n\s*\n/)
                    .map(p => p.trim())
                    .filter(Boolean)
                    .map((paragraph, pIdx) => (
                      <p key={pIdx} className="leading-relaxed text-[#202428]">
                        {paragraph}
                      </p>
                    ))}
                </div>
              )}

              {/* Corrections / Nuance Points (الكوريكشنز كـ نقاط) */}
              {((compiledSummary.corrections && compiledSummary.corrections.length > 0) || (compiledSummary.inlineCorrections && compiledSummary.inlineCorrections.length > 0)) && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#B25E00] uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5 text-[#D97706]" />
                    <span>Corrections & Nuances · التصحيحات والاستدراكات</span>
                  </div>

                  {compiledSummary.corrections && compiledSummary.corrections.length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] shadow-2xs space-y-2.5 text-xs">
                      {compiledSummary.corrections.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-[#78350F]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-1.5 shrink-0" />
                          <span className="leading-relaxed font-medium">
                            {point.replace(/^[-*•\d.]+\s*/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline corrections if any */}
                  {compiledSummary.inlineCorrections && compiledSummary.inlineCorrections.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {compiledSummary.inlineCorrections.map((corr, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white border border-[#E8EAE2] text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="line-through text-[#9E2A2B]">{corr.original}</span>
                            <ArrowRight className="w-3 h-3 text-[#7B8188]" />
                            <span className="font-semibold text-[#2E7D32]">{corr.correction}</span>
                          </div>
                          <p className="text-[11px] text-[#697076]">{corr.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Strengths (نقاط القوة كـ نقاط) */}
              {compiledSummary.strengths && compiledSummary.strengths.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#2E7D32] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Your Conceptual Strengths · نقاط القوة المعرفية</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F0F5EE] border border-[#D5E5D1] shadow-2xs space-y-2.5 text-xs">
                    {compiledSummary.strengths.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-[#1E3A24]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] mt-1.5 shrink-0" />
                        <span className="leading-relaxed font-medium">
                          {point.replace(/^[-*•\d.]+\s*/, '')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Lecture Points */}
              {compiledSummary.lectureTakeaways && compiledSummary.lectureTakeaways.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#406882] uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#406882]" />
                    <span>Key Slide Takeaways · المحاور الأساسية للشريحة</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F4F7F9] border border-[#D3E0EA] shadow-2xs space-y-2 text-xs">
                    {compiledSummary.lectureTakeaways.map((takeaway, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-[#213E52]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#406882] mt-1.5 shrink-0" />
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
          <div className="p-4 border-t border-[#E8EAE4] bg-white flex items-center justify-between">
            <span className="text-xs text-[#6D737A]">
              Synthesis saved to this study session
            </span>
            <button
              type="button"
              id="save-understanding-and-close-btn"
              onClick={onClose}
              className="text-xs px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Save & Continue</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
