import React, { useState, useEffect } from 'react';
import { Slide } from '../types';
import { Send, X, BookOpen, ExternalLink, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { isAr, dir } = useLanguage();
  const storageKey = `attocus_explain_chat_${lectureTitle || 'lecture'}_p${slide.pageNumber || 1}_${slide.id}`;

  const defaultWelcomeMessage: Message = {
    role: 'coach',
    text: isAr
      ? `أهلاً بك! أنا رفيقك الذكي في المذاكرة. يمكنك سؤالي عن أي مفهوم أو مصطلح في "${slide.title}" وسأشرحه لك مباشرة بالاعتماد على محتوى المحاضرة.`
      : `Welcome! I am your AI study companion. Ask me anything about "${slide.title}" and I will explain it directly based on the lecture.`,
    citedPages: [slide.pageNumber]
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [defaultWelcomeMessage];
  });
  const [questionInput, setQuestionInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync messages when slide changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    setMessages([defaultWelcomeMessage]);
  }, [storageKey]);

  if (!isOpen) return null;

  const saveMessages = (newMessages: Message[]) => {
    setMessages(newMessages);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newMessages));
    } catch {}
  };

  const handleClearHistory = () => {
    const reset = [defaultWelcomeMessage];
    setMessages(reset);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const handleSend = async () => {
    if (!questionInput.trim() || isLoading) return;
    const userQ = questionInput.trim();
    setQuestionInput('');
    const updatedWithUser = [...messages, { role: 'student' as const, text: userQ }];
    saveMessages(updatedWithUser);
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
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const updatedWithCoach = [
        ...updatedWithUser,
        {
          role: 'coach' as const,
          text: data.answer || data.reply || (isAr ? 'عذراً، لم أستطع العثور على إجابة محددة.' : 'Sorry, could not find a specific answer.'),
          citedPages: data.citedPages || data.citedLecturePages || [slide.pageNumber],
          externalCitation: data.externalCitation
        }
      ];
      saveMessages(updatedWithCoach);
    } catch (err: any) {
      console.warn('Explain API error:', err);
      const updatedWithFallback = [
        ...updatedWithUser,
        {
          role: 'coach' as const,
          text: isAr
            ? `بالإشارة إلى الشريحة ${slide.pageNumber} ("${slide.title}"): هذا المفهوم يرتبط بالنص الأساسي للمحاضرة ويتم تناوله لتوضيح الخطوات المنطقية.`
            : `Referring to slide ${slide.pageNumber} ("${slide.title}"): This concept relates to the core lecture content and outlines the logical progression.`,
          citedPages: [slide.pageNumber]
        }
      ];
      saveMessages(updatedWithFallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir={dir}
      id="explain-agent-drawer-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      <div
        id="explain-agent-drawer-panel"
        className="w-full max-w-md bg-[#FBFBFC] dark:bg-[#111827] text-slate-900 dark:text-slate-100 h-full shadow-2xl border-l border-slate-200/80 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300 transition-colors"
      >
        {/* شريط رأس الدرج (Header) */}
        <div className="p-4 border-b border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/80 dark:border-blue-900/50 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white tracking-tight">
                {isAr ? 'المساعد الذكي للشرح' : 'Smart Explanation Assistant'}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                {isAr
                  ? `مرتبط بالشريحة ${slide.pageNumber}: ${slide.topic || 'المفاهيم الحالية'}`
                  : `Linked to slide ${slide.pageNumber}: ${slide.topic || 'Current concepts'}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearHistory}
              title={isAr ? 'بدء محادثة جديدة' : 'Clear conversation'}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="close-explain-drawer-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* سجل المحادثة (Message History) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'student' ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`p-3.5 rounded-2xl text-xs max-w-[88%] leading-relaxed ${
                  m.role === 'student'
                    ? 'bg-[#0F172A] dark:bg-blue-600 text-white rounded-br-xs shadow-xs'
                    : 'bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-xs shadow-xs'
                }`}
              >
                {m.text}
              </div>

              {/* مصادر الاقتباس */}
              {m.role === 'coach' && m.citedPages && (
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 dark:text-slate-400 px-1">
                  <span className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                    <BookOpen className="w-3 h-3" />
                    <span>{isAr ? `مقتبس من الشريحة ${m.citedPages.join('، ')}` : `Cited from slide ${m.citedPages.join(', ')}`}</span>
                  </span>
                  {m.externalCitation && (
                    <span className="flex items-center gap-1 text-slate-400 dark:text-slate-400">
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
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl w-fit border border-slate-100 dark:border-slate-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
              <span>{isAr ? 'جاري استخراج وتحليل محتوى الشريحة...' : 'Extracting and analyzing slide content...'}</span>
            </div>
          )}
        </div>

        {/* حقل إدخال السؤال (Input Bar) */}
        <div className="p-3.5 border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#111827]">
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
              placeholder={isAr ? 'اسأل عن أي نقطة، مثال: ما هو دور هذا المصطلح؟' : 'Ask anything, e.g.: What is the role of this term?'}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-hidden focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            <button
              type="submit"
              id="send-explain-question-btn"
              disabled={!questionInput.trim() || isLoading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                questionInput.trim() && !isLoading
                  ? 'bg-[#0F172A] dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 shadow-xs active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Send className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};