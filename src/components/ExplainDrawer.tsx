import React, { useState } from 'react';
import { Slide } from '../types';
import { Send, X, BookOpen, ExternalLink, Sparkles, Loader2, Bot } from 'lucide-react';

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
      text: `أهلاً بك! أنا رفيقك الذكي في المذاكرة. يمكنك سؤالي عن أي مفهوم أو مصطلح في "${slide.title}" وسأشرحه لك مباشرة بالاعتماد على محتوى المحاضرة.`,
      citedPages: [slide.pageNumber]
    }
  ]);
  const [questionInput, setQuestionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!questionInput.trim() || isLoading) return;
    const userQ = questionInput.trim();
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
        throw new Error(errorData.error || `خطأ في الخادم ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'coach',
          text: data.answer || 'إليك التوضيح بناءً على محتوى الشريحة المحددة.',
          citedPages: data.citedLecturePages || [slide.pageNumber],
          externalCitation: data.citedExternalSource
        }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'coach',
          text: `بالنظر إلى الشريحة رقم ${slide.pageNumber} ("${slide.title}")، الفكرة المحورية هي: ${(slide.keyPoints || [])[0] || slide.content[0] || 'المفاهيم الأساسية للموضوع'}. أخبرني إذا كنت ترغب في تبسيط جزئية معينة!`,
          citedPages: [slide.pageNumber]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      id="explain-agent-drawer-overlay"
      className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-xs flex justify-start animate-in fade-in duration-200"
    >
      <div
        id="explain-agent-drawer"
        className="w-full max-w-md bg-[#FCFCFD] h-full shadow-2xl flex flex-col justify-between border-l border-slate-200/80 text-slate-900 animate-in slide-in-from-right duration-250"
      >
        {/* رأس الدرج (Header) */}
        <div className="p-4 border-b border-slate-200/70 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                المساعد الذكي للشرح
              </h3>
              <p className="text-[11px] text-slate-400">
                مرتبط بالشريحة {slide.pageNumber}: {slide.topic || 'المفاهيم الحالية'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-explain-drawer-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* سجل المحادثة (Message History) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'student' ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`p-3.5 rounded-2xl text-xs max-w-[88%] leading-relaxed ${m.role === 'student'
                    ? 'bg-[#0F172A] text-white rounded-br-xs shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                  }`}
              >
                {m.text}
              </div>

              {/* مصادر الاقتباس */}
              {m.role === 'coach' && m.citedPages && (
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 px-1">
                  <span className="flex items-center gap-1 font-medium text-blue-600">
                    <BookOpen className="w-3 h-3" />
                    <span>مقتبس من الشريحة {m.citedPages.join('، ')}</span>
                  </span>
                  {m.externalCitation && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>{m.externalCitation}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* مؤشر جاري البحث والتفكير */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-slate-50 rounded-xl w-fit border border-slate-100">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>جاري استخراج وتحليل محتوى الشريحة...</span>
            </div>
          )}
        </div>

        {/* حقل إدخال السؤال (Input Bar) */}
        <div className="p-3.5 border-t border-slate-200/70 bg-white">
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
              placeholder="اسأل عن أي نقطة، مثال: ما هو دور هذا المصطلح؟"
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 outline-hidden focus:border-blue-600 focus:bg-white transition-all"
            />
            <button
              type="submit"
              id="send-explain-question-btn"
              disabled={!questionInput.trim() || isLoading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${questionInput.trim() && !isLoading
                  ? 'bg-[#0F172A] text-white hover:bg-slate-800 shadow-xs active:scale-95'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
            >
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};