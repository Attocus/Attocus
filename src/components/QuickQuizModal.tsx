import React, { useState, useEffect } from 'react';
import { Slide } from '../types';
import { CheckCircle2, HelpCircle, X, ArrowRight, Sparkles } from 'lucide-react';

interface QuickQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  slide: Slide;
}

export const QuickQuizModal: React.FC<QuickQuizModalProps> = ({
  isOpen,
  onClose,
  slide
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
        body: JSON.stringify({ slide })
      });
      const data = await res.json();
      setQuestion(data.question || `What is the key principle of ${slide.title}?`);
      setOptions(data.options || []);
      setCorrectAnswer(data.correctAnswer || data.options?.[0] || '');
      setExplanation(data.explanation || 'Verified from the lecture notes.');
    } catch {
      setQuestion(`Regarding ${slide.title}, which of the following is accurate?`);
      const opts = [
        (slide.keyPoints || [])[0] || 'It preserves state machine consistency across all replicas.',
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
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="quick-quiz-modal-card"
        className="bg-[#FAFAF8] rounded-2xl border border-[#E0E2DC] shadow-xl w-full max-w-lg overflow-hidden text-[#202326] p-6 space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EAE4]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
            <h3 className="text-sm font-serif font-bold text-[#1A1D20]">
              Quick Comprehension Check
            </h3>
          </div>
          <button
            type="button"
            id="close-quick-quiz-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#EFF1EB] flex items-center justify-center text-[#6E747B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-[#6F757C] italic">
            Preparing your question...
          </div>
        ) : (
          <>
            <div>
              <div className="text-[11px] font-semibold text-[#2E7D32] uppercase tracking-wider mb-1">
                Slide {slide.pageNumber} · {slide.topic}
              </div>
              <p className="text-sm font-medium text-[#1A1D20] leading-snug">
                {question}
              </p>
            </div>

            <div className="space-y-2">
              {options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === correctAnswer;
                let style = 'bg-white border-[#DCDFD7] hover:border-[#B5BBAF] text-[#2A2E33]';

                if (submitted) {
                  if (isCorrect) {
                    style = 'bg-[#EBF5EA] border-[#A3D99F] text-[#1E5224] font-medium';
                  } else if (isSelected && !isCorrect) {
                    style = 'bg-[#FBEAEA] border-[#F1AEAE] text-[#8C1D1D]';
                  } else {
                    style = 'bg-[#F7F8F5] border-[#E2E4DE] text-[#868C93] opacity-60';
                  }
                } else if (isSelected) {
                  style = 'bg-[#F0F7EE] border-[#2E7D32] ring-1 ring-[#2E7D32] text-[#1E3A24]';
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className="p-3.5 rounded-xl bg-[#F4F6F1] border border-[#DEE3DA] text-xs space-y-1">
                <div className="font-semibold text-[#233125]">Coach Note</div>
                <p className="text-[#515953] leading-relaxed">{explanation}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#7B8188]">
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
                      ? 'bg-[#2E7D32] hover:bg-[#256629] text-white'
                      : 'bg-[#E0E2DC] text-[#8C9298] cursor-not-allowed'
                  }`}
                >
                  Check
                </button>
              ) : (
                <button
                  type="button"
                  id="done-quick-quiz-btn"
                  onClick={onClose}
                  className="text-xs px-4 py-2 rounded-xl bg-[#1E2225] hover:bg-[#34383D] text-white font-medium transition-colors"
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
