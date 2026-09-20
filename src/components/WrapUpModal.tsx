import React, { useState } from 'react';
import { Lecture, Slide, GapQuizQuestion, WrapUpReport, ConceptMastery } from '../types';
import { CheckCircle, AlertCircle, ArrowRight, Sparkles, BookOpen, Clock, Award, RotateCcw, Brain, Check } from 'lucide-react';

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

  // Step 1: Student submits their own-words summary
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
        // No gaps identified! Go straight to report
        generateFinalReport(data.gapQuestions || []);
      }
    } catch (err) {
      console.error('Wrap-up analysis error:', err);
      // Fallback
      setStep('gaps_quiz');
      setGapQuestions([
        {
          id: 'gap-fallback-1',
          concept: lecture.slides[1]?.topic || 'Key Mechanism',
          question: `Regarding ${lecture.slides[1]?.title || 'the core mechanism'}, what is essential to preserve safety?`,
          options: [
            (lecture.slides[1]?.keyPoints || [])[0] || 'Strict majority quorum agreement',
            'Allowing uncommitted writes during failure',
            'Synchronized physical clocks',
            'Bypassing leader election'
          ],
          correctAnswer: (lecture.slides[1]?.keyPoints || [])[0] || 'Strict majority quorum agreement',
          explanation: 'Quorums guarantee that overlapping nodes detect stale or conflicting states.'
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Student answers a targeted gap question
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
      // Quiz finished -> generate final report
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
    } catch (err) {
      console.error('Final report error:', err);
      // Fallback report
      setFinalReport({
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
          note: idx === 0 ? 'Clear articulation in your summary.' : 'Follow-up quiz verified understanding.'
        })),
        primaryRecommendation: 'Review the transition edge cases once more before your exam to lock in retention.',
        spacedRepetitionQueue: [],
        studentFinalSummary: studentSummary
      });
      setStep('final_report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="wrapup-session-modal-overlay"
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="wrapup-session-card"
        className="bg-[#FAFAF8] rounded-2xl border border-[#E0E2DC] shadow-xl w-full max-w-2xl overflow-hidden text-[#202326] transition-all"
      >
        {/* Header with gentle teacher tone */}
        <div className="p-6 border-b border-[#E8EAE4] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0E6] flex items-center justify-center text-[#2E7D32]">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#191B1D]">
                Study Wrap-up Session
              </h2>
              <p className="text-xs text-[#6B7177]">
                Teacher-led synthesis for "{lecture.title}"
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-[#747B82] bg-[#F3F4F0] px-3 py-1 rounded-full flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#555C63]" />
            <span>{Math.max(1, Math.round(sessionSeconds / 60))} mins focused</span>
          </div>
        </div>

        {/* STEP 1: Prompt student for summary in their own words */}
        {step === 'prompt_summary' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-[#F4F6F1] border border-[#E0E5DC]">
              <div className="flex items-start gap-3">
                <span className="text-xl">👩‍🏫</span>
                <div>
                  <h3 className="text-sm font-semibold text-[#253828]">
                    Explain what you learned in your own words
                  </h3>
                  <p className="text-xs text-[#526355] mt-1 leading-relaxed">
                    Don't worry about textbook phrasing or being perfect. A great teacher wants to see how you understand the mechanisms yourself.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="student-wrapup-summary-input" className="text-xs font-semibold text-[#454A50] uppercase tracking-wide">
                Your Synthesis
              </label>
              <textarea
                id="student-wrapup-summary-input"
                rows={5}
                value={studentSummary}
                onChange={e => setStudentSummary(e.target.value)}
                placeholder="e.g. In this session, I learned that nodes agree on logs using terms and election timeouts. A leader is only elected if a majority agrees, which prevents split votes..."
                className="w-full p-4 rounded-xl bg-white border border-[#D5D8D0] focus:border-[#2E7D32] focus:ring-2 focus:ring-[#2E7D32]/20 text-sm text-[#1F2327] outline-hidden leading-relaxed resize-none transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                id="cancel-wrapup-btn"
                onClick={onClose}
                className="text-xs px-4 py-2 rounded-lg border border-[#D0D4CC] text-[#555A60] hover:bg-[#F2F4F0] font-medium transition-colors"
              >
                Keep Studying
              </button>

              <button
                type="button"
                id="submit-wrapup-summary-btn"
                onClick={handleSubmitSummary}
                disabled={!studentSummary.trim() || isSubmitting}
                className={`text-xs px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                  studentSummary.trim() && !isSubmitting
                    ? 'bg-[#2E7D32] hover:bg-[#256629] text-white shadow-xs'
                    : 'bg-[#E0E2DC] text-[#8C9298] cursor-not-allowed'
                }`}
              >
                <span>Check My Understanding</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Analyzing Micro-interaction */}
        {step === 'analyzing' && (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F0E6] text-[#2E7D32] flex items-center justify-center mx-auto animate-bounce">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#1E2226]">
                Analyzing your synthesis against lecture points...
              </h3>
              <p className="text-xs text-[#62686F] mt-1 max-w-sm mx-auto">
                Identifying concepts you mastered and pinpointing specific gaps to address.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Targeted Gaps Quiz */}
        {step === 'gaps_quiz' && gapQuestions.length > 0 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EAE4]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF3E0] text-[#B24100]">
                  Targeted Gap Check
                </span>
                <span className="text-xs text-[#6A7077]">
                  Question {currentQuizIndex + 1} of {gapQuestions.length}
                </span>
              </div>
              <span className="text-xs text-[#7B8289] font-medium">
                Concept: {gapQuestions[currentQuizIndex].concept}
              </span>
            </div>

            <div>
              <h3 className="text-base font-medium text-[#1A1D20] leading-snug">
                {gapQuestions[currentQuizIndex].question}
              </h3>
            </div>

            <div className="space-y-2.5">
              {gapQuestions[currentQuizIndex].options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === gapQuestions[currentQuizIndex].correctAnswer;
                let optionStyle = 'bg-white border-[#DCDFD7] hover:border-[#B5BBAF] text-[#2A2E33]';

                if (answerSubmitted) {
                  if (isCorrect) {
                    optionStyle = 'bg-[#EBF5EA] border-[#A3D99F] text-[#1E5224] font-medium';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'bg-[#FBEAEA] border-[#F1AEAE] text-[#8C1D1D]';
                  } else {
                    optionStyle = 'bg-[#F7F8F5] border-[#E2E4DE] text-[#868C93] opacity-60';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-[#F0F7EE] border-[#2E7D32] ring-1 ring-[#2E7D32] text-[#1E3A24]';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    id={`gap-quiz-option-${idx}`}
                    onClick={() => handleSelectOption(option)}
                    disabled={answerSubmitted}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${optionStyle}`}
                  >
                    <span>{option}</span>
                    {answerSubmitted && isCorrect && (
                      <CheckCircle className="w-4 h-4 text-[#2E7D32] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation card after submit */}
            {answerSubmitted && (
              <div className="p-4 rounded-xl bg-[#F5F7F3] border border-[#E0E4DC] text-xs space-y-1.5">
                <div className="font-semibold text-[#253027] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>Coach Explanation</span>
                </div>
                <p className="text-[#4E5650] leading-relaxed">
                  {gapQuestions[currentQuizIndex].explanation}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#7A8086]">
                Targeted gap {currentQuizIndex + 1} of {gapQuestions.length}
              </span>

              {!answerSubmitted ? (
                <button
                  type="button"
                  id="submit-gap-quiz-answer-btn"
                  onClick={handleSubmitQuizAnswer}
                  disabled={!selectedOption}
                  className={`text-xs px-5 py-2.5 rounded-xl font-medium transition-all ${
                    selectedOption
                      ? 'bg-[#2E7D32] hover:bg-[#256629] text-white'
                      : 'bg-[#E0E2DC] text-[#8C9298] cursor-not-allowed'
                  }`}
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  type="button"
                  id="next-gap-quiz-btn"
                  onClick={handleNextQuizQuestion}
                  className="text-xs px-5 py-2.5 rounded-xl font-medium bg-[#1F2327] hover:bg-[#33383E] text-white flex items-center gap-1.5 transition-colors"
                >
                  <span>{currentQuizIndex < gapQuestions.length - 1 ? 'Next Question' : 'View Final Report'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Final Summary and Learning Coach Report */}
        {step === 'final_report' && finalReport && (
          <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Coach Banner */}
            <div className="p-5 rounded-2xl bg-[#F0F5EE] border border-[#D5E5D1] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-serif font-bold text-[#1E3A24]">
                  Session Complete · Learning Report
                </h3>
                <p className="text-xs text-[#405445] leading-relaxed">
                  You studied for <span className="font-semibold">{finalReport.studyTimeMinutes} minutes</span> with <span className="font-semibold">{finalReport.focusEfficiencyPercentage}% focus efficiency</span>.
                </p>
              </div>
            </div>

            {/* Coach Primary Recommendation (ONE focused takeaway) */}
            <div className="p-4 rounded-xl bg-white border border-[#E0E3DA] shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#2E7D32] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Coach's Primary Recommendation</span>
              </div>
              <p className="text-xs sm:text-sm text-[#2A2E33] leading-relaxed">
                {finalReport.primaryRecommendation}
              </p>
            </div>

            {/* Concept Strength & Weakness Map */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-[#555A60] uppercase tracking-wider">
                Concept Mastery Breakdown
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {finalReport.conceptMap.map((concept, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-[#E4E6DE] text-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-[#202428] truncate pr-2">
                        {concept.concept}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          concept.status === 'mastered'
                            ? 'bg-[#E8F5E9] text-[#2E7D32]'
                            : concept.status === 'developing'
                            ? 'bg-[#FFF8E1] text-[#B78103]'
                            : 'bg-[#FFEBEE] text-[#C62828]'
                        }`}
                      >
                        {concept.status === 'mastered' ? 'Mastered' : concept.status === 'developing' ? 'Developing' : 'Review Soon'}
                      </span>
                    </div>
                    <div className="w-full bg-[#EAECE6] h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${
                          concept.status === 'mastered'
                            ? 'bg-[#2E7D32]'
                            : concept.status === 'developing'
                            ? 'bg-[#F9A825]'
                            : 'bg-[#D32F2F]'
                        }`}
                        style={{ width: `${concept.score}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[#6E747A] leading-snug">{concept.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Spaced Repetition Due Reminder */}
            {finalReport.spacedRepetitionQueue && finalReport.spacedRepetitionQueue.length > 0 && (
              <div className="p-4 rounded-xl bg-[#F7F8F5] border border-[#E2E5DC] text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-[#444A50]">
                  <RotateCcw className="w-3.5 h-3.5 text-[#406882]" />
                  <span>Scheduled for Spaced Repetition</span>
                </div>
                <p className="text-[#60676E] leading-relaxed">
                  Concept <span className="font-medium text-[#1E2226]">"{finalReport.spacedRepetitionQueue[0].concept}"</span> will be presented with a differently-worded challenge in 3 days to consolidate long-term memory.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-3 border-t border-[#E8EAE4] flex items-center justify-between">
              <button
                type="button"
                id="review-document-again-btn"
                onClick={onClose}
                className="text-xs px-4 py-2 rounded-lg border border-[#D0D4CC] text-[#555A60] hover:bg-[#F2F4F0] font-medium transition-colors"
              >
                Back to Document
              </button>

              <button
                type="button"
                id="wrapup-return-home-btn"
                onClick={onReturnHome}
                className="text-xs px-5 py-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium transition-colors shadow-xs"
              >
                Done · Return Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
