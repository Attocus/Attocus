import React, { useState } from 'react';
import { Slide } from '../types';
import { HelpCircle, Send, X, BookOpen, ExternalLink, Sparkles } from 'lucide-react';

interface ExplainDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slide: Slide;
  allSlides: Slide[];
  lectureTitle: string;
}

interface Message {
  role: 'student' | 'coach';
  text: string;
  citedPages?: number[];
  externalCitation?: string;
}

export const ExplainDrawer: React.FC<ExplainDrawerProps> = ({
  isOpen,
  onClose,
  slide,
  allSlides,
  lectureTitle
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'coach',
      text: `Hello! I'm here studying with you. Ask me anything about "${slide.title}" or any concept in this lecture. I'll ground my answer directly in the lecture notes.`,
      citedPages: [slide.pageNumber]
    }
  ]);
  const [questionInput, setQuestionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!questionInput.trim() || isLoading) return;
    const userQ = questionInput;
    setQuestionInput('');
    setMessages(prev => [...prev, { role: 'student', text: userQ }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/coach/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureTitle,
          currentSlide: slide,
          allSlides,
          question: userQ,
          chatHistory: messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'coach',
          text: data.answer || 'Here is the explanation based on the lecture material.',
          citedPages: data.citedLecturePages || [slide.pageNumber],
          externalCitation: data.citedExternalSource
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'coach',
          text: `Looking at Slide ${slide.pageNumber} ("${slide.title}"), the essential idea is: ${(slide.keyPoints || [])[0] || slide.content[0]}. Let me know if you want to break down any particular term!`,
          citedPages: [slide.pageNumber]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="explain-agent-drawer-overlay"
      className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-2xs flex justify-end"
    >
      <div
        id="explain-agent-drawer"
        className="w-full max-w-md bg-[#FDFDFC] dark:bg-[#16181B] h-full shadow-2xl flex flex-col justify-between border-l border-[#E2E5DC] dark:border-[#2E3339] text-[#222629] dark:text-[#F1F3F5] animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#E6E8E0] dark:border-[#2E3339] bg-white dark:bg-[#1A1D22] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EBF3EA] dark:bg-[#1E3A24] text-[#2E7D32] dark:text-[#4ADE80] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-bold text-[#1A1D20] dark:text-[#F1F3F5]">
                Ask Coach
              </h3>
              <p className="text-[11px] text-[#697076] dark:text-[#9AA0A6]">
                Grounded in Slide {slide.pageNumber}: {slide.topic}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-explain-drawer-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#F0F2EC] dark:hover:bg-[#252930] flex items-center justify-center text-[#697076] dark:text-[#9AA0A6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'student' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`p-3.5 rounded-xl text-xs max-w-[90%] leading-relaxed ${
                  m.role === 'student'
                    ? 'bg-[#2E7D32] dark:bg-[#1B5E20] text-white rounded-br-none shadow-xs'
                    : 'bg-white dark:bg-[#22262C] border border-[#E0E2DA] dark:border-[#2E3339] text-[#272B2F] dark:text-[#F1F3F5] rounded-bl-none shadow-2xs'
                }`}
              >
                {m.text}
              </div>

              {m.role === 'coach' && m.citedPages && (
                <div className="flex items-center gap-2 mt-1 text-[10px] text-[#787F86] dark:text-[#9AA0A6] px-1">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-2.5 h-2.5 text-[#2E7D32] dark:text-[#4ADE80]" />
                    <span>Cited Slide {m.citedPages.join(', ')}</span>
                  </span>
                  {m.externalCitation && (
                    <span className="flex items-center gap-1 italic">
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>{m.externalCitation}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#7B8289] dark:text-[#9AA0A6] p-2 italic">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] dark:bg-[#4ADE80] animate-ping" />
              <span>Consulting lecture notes...</span>
            </div>
          )}
        </div>

        {/* Question Input */}
        <div className="p-3 border-t border-[#E6E8E0] dark:border-[#2E3339] bg-white dark:bg-[#1A1D22]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              id="explain-agent-question-input"
              value={questionInput}
              onChange={e => setQuestionInput(e.target.value)}
              placeholder="e.g. Why is randomized timeout used here?"
              className="flex-1 p-2.5 rounded-xl bg-[#F5F6F2] dark:bg-[#252930] border border-[#D7DAD2] dark:border-[#2E3339] text-xs text-[#202428] dark:text-[#F1F3F5] outline-hidden focus:border-[#2E7D32] dark:focus:border-[#4ADE80] focus:bg-white dark:focus:bg-[#16181B] transition-all"
            />
            <button
              type="submit"
              id="send-explain-question-btn"
              disabled={!questionInput.trim() || isLoading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                questionInput.trim() && !isLoading
                  ? 'bg-[#2E7D32] hover:bg-[#256629] dark:bg-[#1B5E20] dark:hover:bg-[#2E7D32] text-white'
                  : 'bg-[#E3E5DF] dark:bg-[#252930] text-[#8D9298] dark:text-[#64748B] cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

