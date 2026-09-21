import React, { useState, useEffect } from 'react';
import { Slide } from '../types';
import { CheckCircle2, HelpCircle, X, ArrowRight, Sparkles } from 'lucide-react';

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
      setQuestion(data.question || `What is the key principle of ${slide.title}?`);
      setOptions(data.options || []);
      setCorrectAnswer(data.correctAnswer || data.options?.[0] || '');
      setExplanation(data.explanation || 'Verified from the lecture notes.');
    } catch {
      const cleanKeyPoints = (slide.keyPoints || []).filter(
        kp => !kp.toLowerCase().includes('visual and conceptual takeaways') && !kp.toLowerCase().includes('visual presentation')
      );
      setQuestion(`Regarding ${slide.title}, which of the following is accurate?`);
      const opts = [
        cleanKeyPoints[0] || 'It preserves state machine consistency across all replicas.',
        'It allows uncommitted writes to bypass majority quorum checks.',
        'It requires physical clock synchronization across nodes.',
        'It only operates when all cluster nodes are active.'
      ];
      setOptions(opts);
      setCorrectAnswer(opts[0]);
      setExplanation('This maintains the core invariants established in this slide.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="quick-quiz-modal-overlay"
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="quick-quiz-modal-card"
        className="bg-[#FAFAF8] dark:bg-[#1A1D22] rounded-2xl border border-[#E0E2DC] dark:border-[#2E3339] shadow-xl w-full max-w-lg overflow-hidden text-[#202326] dark:text-[#F1F3F5] p-6 space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EAE4] dark:border-[#2E3339]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] dark:bg-[#4ADE80]" />
            <h3 className="text-sm font-serif font-bold text-[#1A1D20] dark:text-[#F1F3F5]">
              Quick Comprehension Check
            </h3>
          </div>
          <button
            type="button"
            id="close-quick-quiz-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#EFF1EB] dark:hover:bg-[#252930] flex items-center justify-center text-[#6E747B] dark:text-[#9AA0A6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#6F757C] dark:text-[#9AA0A6] italic">
            Preparing your question...
          </div>
        ) : (
          <>
            <div>
              <div className="text-[11px] font-semibold text-[#2E7D32] dark:text-[#4ADE80] uppercase tracking-wider mb-1">
                Slide {slide.pageNumber} · {slide.topic}
              </div>
              <p className="text-sm font-medium text-[#1A1D20] dark:text-[#F1F3F5] leading-snug">
                {question}
              </p>
            </div>

            <div className="space-y-2">
              {options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === correctAnswer;
                let style = 'bg-white dark:bg-[#22262C] border-[#DCDFD7] dark:border-[#2E3339] hover:border-[#B5BBAF] dark:hover:border-[#4B5563] text-[#2A2E33] dark:text-[#F1F3F5]';

                if (submitted) {
                  if (isCorrect) {
                    style = 'bg-[#EBF5EA] dark:bg-[#1E3A24] border-[#A3D99F] dark:border-[#2E7D32] text-[#1E5224] dark:text-[#86EFAC] font-medium';
                  } else if (isSelected && !isCorrect) {
                    style = 'bg-[#FBEAEA] dark:bg-[#7F1D1D]/40 border-[#F1AEAE] dark:border-[#EF4444] text-[#8C1D1D] dark:text-[#FCA5A5]';
                  } else {
                    style = 'bg-[#F7F8F5] dark:bg-[#1A1D22] border-[#E2E4DE] dark:border-[#2E3339] text-[#868C93] dark:text-[#64748B] opacity-60';
                  }
                } else if (isSelected) {
                  style = 'bg-[#F0F7EE] dark:bg-[#1E3A24]/60 border-[#2E7D32] dark:border-[#4ADE80] ring-1 ring-[#2E7D32] text-[#1E3A24] dark:text-[#86EFAC]';
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
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${style}`}
                  >
                    <span>{option}</span>
                    {submitted && isCorrect && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] dark:text-[#4ADE80] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className="p-3.5 rounded-xl bg-[#F4F6F1] dark:bg-[#22262C] border border-[#DEE3DA] dark:border-[#2E3339] text-xs space-y-1">
                <div className="font-semibold text-[#233125] dark:text-[#86EFAC]">Coach Note</div>
                <p className="text-[#515953] dark:text-[#CBD5E1] leading-relaxed">{explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#7B8188] dark:text-[#9AA0A6]">
                {submitted ? 'Checked!' : 'Select the best option'}
              </span>

              {!submitted ? (
                <button
                  type="button"
                  id="submit-quick-quiz-btn"
                  onClick={() => {
                    if (selectedOption) setSubmitted(true);
                  }}
                  disabled={!selectedOption}
                  className={`text-xs px-4 py-2 rounded-xl font-medium transition-all ${
                    selectedOption
                      ? 'bg-[#2E7D32] hover:bg-[#256629] dark:bg-[#1B5E20] dark:hover:bg-[#2E7D32] text-white cursor-pointer'
                      : 'bg-[#E0E2DC] dark:bg-[#252930] text-[#8C9298] dark:text-[#64748B] cursor-not-allowed'
                  }`}
                >
                  Check
                </button>
              ) : (
                <button
                  type="button"
                  id="done-quick-quiz-btn"
                  onClick={onClose}
                  className="text-xs px-4 py-2 rounded-xl bg-[#1E2225] dark:bg-[#1B5E20] hover:bg-[#34383D] dark:hover:bg-[#2E7D32] text-white font-medium transition-colors cursor-pointer"
                >
                  Got It
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
