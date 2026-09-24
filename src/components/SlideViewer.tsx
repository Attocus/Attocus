import React, { useState, useEffect, useCallback } from 'react';
import { Slide } from '../types';
import { BookOpen, Layers, Network, Table as TableIcon, GitBranch, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { runTakeawaysAgent } from '../agents/takeawaysAgent';

interface SlideViewerProps {
  slide: Slide;
  totalSlides: number;
  isDarkMode?: boolean;
  pureSlideOnly?: boolean;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({
  slide,
  totalSlides,
  isDarkMode,
  pureSlideOnly = false
}) => {
  const dm = isDarkMode;
  const { isAr, dir, t } = useLanguage();
  const [isCopied, setIsCopied] = useState(false);

  // Check if current points are raw or overly verbose prose
  const isRawPoints = (pts: string[]) => {
    if (!pts || pts.length === 0) return true;
    return pts.some(p =>
      p.includes('●') ||
      p.includes('•') ||
      p.length > 95 ||
      p.includes('Visual presentation') ||
      p.includes('Visual and conceptual') ||
      p.includes('Section notes and key')
    );
  };

  const [takeaways, setTakeaways] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(`attocus_llm_takeaways_v3_${slide.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return slide.keyPoints || [];
  });
  const [isLoadingTakeaways, setIsLoadingTakeaways] = useState<boolean>(false);

  const handleCopySlideContent = () => {
    const textToCopy = [
      slide.title || '',
      slide.subtitle || '',
      ...(slide.content || []),
      ...(takeaways || [])
    ].filter(Boolean).join('\n\n');

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const fetchLLMTakeaways = useCallback(async (force = false) => {
    const slideFullText = [
      slide.title || '',
      slide.subtitle || '',
      (slide.content || []).join('\n'),
      (slide.keyPoints || []).join('\n'),
      (slide as any).rawText || ''
    ].join('\n').trim();

    // Auto-detect the slide's dominant language directly from the content
    const arabicCount = (slideFullText.match(/[\u0600-\u06FF]/g) || []).length;
    const latinCount = (slideFullText.match(/[a-zA-Z]/g) || []).length;
    const slideLanguage = arabicCount > latinCount ? 'ar' : 'en';

    if (!force) {
      try {
        const cached = localStorage.getItem(`attocus_llm_takeaways_v3_${slide.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTakeaways(parsed);
            return;
          }
        }
      } catch {}
    }

    if (!slideFullText || slideFullText.length < 15) return;

    setIsLoadingTakeaways(true);
    try {
      const res = await runTakeawaysAgent({
        slideTitle: slide.title,
        slideText: slideFullText,
        topic: slide.topic,
        language: slideLanguage
      });
      if (res && res.coreTakeaways && res.coreTakeaways.length > 0) {
        setTakeaways(res.coreTakeaways);
        slide.keyPoints = res.coreTakeaways;
        try {
          localStorage.setItem(`attocus_llm_takeaways_v3_${slide.id}`, JSON.stringify(res.coreTakeaways));
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to fetch LLM takeaways:', e);
    } finally {
      setIsLoadingTakeaways(false);
    }
  }, [slide]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(`attocus_llm_takeaways_v3_${slide.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTakeaways(parsed);
          slide.keyPoints = parsed;
          return;
        }
      }
    } catch {}

    if (isRawPoints(slide.keyPoints || [])) {
      fetchLLMTakeaways();
    } else {
      setTakeaways(slide.keyPoints || []);
    }
  }, [slide.id, fetchLLMTakeaways]);

  // Pure Slide Mode for Full Screen: Only the slide image / content, no title, no borders, no takeaways
  if (pureSlideOnly) {
    return (
      <div
        dir={dir}
        className={`w-full h-full flex items-center justify-center select-text font-sans antialiased overflow-hidden p-0 m-0 ${
          dm ? 'bg-[#0f172a]' : 'bg-[#F8FAFC]'
        }`}
      >
        {slide.pageImageUrl ? (
          <img
            src={slide.pageImageUrl}
            alt={`صفحة ${slide.pageNumber}: ${slide.title}`}
            className={`w-full h-full object-contain transition-all duration-300 ${
              dm ? 'filter invert-[0.92] hue-rotate-180 brightness-95 contrast-110 drop-shadow-md' : ''
            }`}
            style={{ imageRendering: 'high-quality' }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-full h-full p-8 flex flex-col justify-center items-center text-center ${dm ? 'bg-[#0f172a] text-slate-100' : 'bg-white text-slate-900'}`}>
            <h1 className="text-3xl font-bold mb-4">{slide.title}</h1>
            {slide.subtitle && <p className="text-lg opacity-80 mb-6">{slide.subtitle}</p>}
            <div className="space-y-4 max-w-2xl text-left">
              {slide.content.map((paragraph, idx) => (
                <p key={idx} className="text-base leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      dir={dir}
      className={`w-full h-full flex flex-col justify-between p-6 sm:p-7 select-text font-sans antialiased overflow-hidden transition-colors duration-300 ${
        dm ? 'bg-[#141b2d] text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      {/* ─── رأس الشريحة ─── */}
      <div className="shrink-0">
        <div className={`flex items-center justify-between pb-2.5 border-b mb-3 ${dm ? 'border-slate-700/60' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg tracking-wide ${dm ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
              {slide.topic || (isAr ? 'عام' : 'General')}
            </span>
            {slide.externalCitations && slide.externalCitations.length > 0 && (
              <span className={`text-[11px] ${dm ? 'text-slate-400' : 'text-slate-400'}`}>
                {t('workspace.citation', 'مرجع:')} {slide.externalCitations[0]}
              </span>
            )}
            <button
              type="button"
              onClick={handleCopySlideContent}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border font-semibold transition-all ${
                isCopied
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : dm
                    ? 'border-slate-700 hover:bg-slate-700/60 text-slate-300'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              title={isAr ? 'نسخ نص الشريحة' : 'Copy slide text'}
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-blue-500" />}
              <span>{isCopied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص' : 'Copy')}</span>
            </button>
          </div>

          <div className={`flex items-center gap-2 text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-400'}`}>
            <span>{isAr ? `صفحة ${slide.pageNumber} من ${totalSlides}` : `Page ${slide.pageNumber} of ${totalSlides}`}</span>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${dm ? 'bg-slate-600' : 'bg-slate-300'}`} />
            <span className={`font-semibold ${dm ? 'text-slate-300' : 'text-slate-500'}`}>
              {t('workspace.contentDensity', 'كثافة المحتوى')} {slide.densityScore}/5
            </span>
          </div>
        </div>

        {/* عنوان الشريحة */}
        <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-snug select-text ${dm ? 'text-white' : 'text-[#0F172A]'}`}>
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className={`text-xs sm:text-sm mt-1 font-normal leading-relaxed select-text ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            {slide.subtitle}
          </p>
        )}
      </div>

      {/* ─── محتوى الشريحة الرئيسي ─── */}
      <div className="flex-1 min-h-0 flex flex-col justify-center my-3 overflow-hidden">
        {/* صورة الشريحة - تدعم النمط الداكن مثل Notability */}
        {slide.pageImageUrl ? (
          <div className={`h-full max-h-[300px] flex items-center justify-center rounded-2xl overflow-hidden border shadow-xs transition-colors duration-300 ${dm ? 'border-slate-700/50 bg-[#141b2d]' : 'border-slate-200/80 bg-slate-50'}`}>
            <img
              src={slide.pageImageUrl}
              alt={`صفحة ${slide.pageNumber}: ${slide.title}`}
              className={`max-h-full w-auto object-contain transition-all duration-300 ${
                dm ? 'filter invert-[0.92] hue-rotate-180 brightness-95 contrast-110 drop-shadow-md' : ''
              }`}
              style={{ imageRendering: 'high-quality' }}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {slide.content.map((paragraph, idx) => (
              <p key={idx} className={`text-sm sm:text-base leading-relaxed text-justify ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* المخططات */}
        {slide.diagramType && (
          <div className={`p-4 rounded-2xl border shadow-2xs ${dm ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-50 border-slate-200/70'}`}>
            <div className={`flex items-center gap-2 mb-2.5 text-xs font-bold uppercase tracking-wider ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
              {slide.diagramType === 'flowchart' && <GitBranch className="w-4 h-4 text-blue-400" />}
              {slide.diagramType === 'architecture' && <Network className="w-4 h-4 text-indigo-400" />}
              {slide.diagramType === 'table' && <TableIcon className="w-4 h-4 text-purple-400" />}
              {slide.diagramType === 'cycle' && <Layers className="w-4 h-4 text-amber-400" />}
              {slide.diagramType === 'equation' && <BookOpen className="w-4 h-4 text-blue-400" />}
              <span>{t('workspace.analyticalModel', 'النموذج التحليلي:')} {slide.diagramType}</span>
            </div>

            {slide.diagramType === 'flowchart' && slide.diagramData?.steps && (
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 text-xs">
                {slide.diagramData.steps.map((step: string, i: number) => (
                  <React.Fragment key={i}>
                    <div className={`px-3 py-1.5 rounded-xl border font-semibold shadow-2xs text-center ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200/80 text-slate-800'}`}>
                      {step}
                    </div>
                    {i < slide.diagramData.steps.length - 1 && (
                      <ArrowLeft className={`w-3.5 h-3.5 shrink-0 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {slide.diagramType === 'flowchart' && slide.diagramData?.transitions && (
              <div className={`space-y-1 text-xs ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                <div className={`font-bold mb-1 ${dm ? 'text-white' : 'text-[#0F172A]'}`}>
                  مسار الحالات: {(slide.diagramData.states || []).join(' ← ')}
                </div>
                {slide.diagramData.transitions.map((t: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className={dm ? 'text-slate-500' : 'text-slate-400'}>•</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}

            {slide.diagramType === 'table' && slide.diagramData?.headers && (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className={`border-b ${dm ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                      {slide.diagramData.headers.map((h: string, i: number) => (
                        <th key={i} className="pb-1.5 font-bold pl-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
                    {slide.diagramData.rows.map((row: string[], ri: number) => (
                      <tr key={ri} className={`transition-colors ${dm ? 'hover:bg-slate-700/40' : 'hover:bg-white/80'}`}>
                        {row.map((cell: string, ci: number) => (
                          <td key={ci} className={`py-1.5 pl-3 ${ci === 0 ? (dm ? 'font-bold text-white' : 'font-bold text-[#0F172A]') : (dm ? 'text-slate-300' : 'text-slate-700')}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {slide.diagramType === 'equation' && (
              <div className="text-center py-2 space-y-1.5">
                <div className={`text-base sm:text-lg font-mono font-bold py-2 px-4 rounded-xl inline-block shadow-2xs border ${dm ? 'bg-slate-700 border-slate-600 text-blue-300' : 'bg-white border-slate-200 text-[#0F172A]'}`} dir="ltr">
                  {slide.diagramData.formula}
                </div>
                {slide.diagramData.interpretation && (
                  <p className={`text-xs italic ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{slide.diagramData.interpretation}</p>
                )}
                {slide.diagramData.implication && (
                  <p className={`text-xs italic ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{slide.diagramData.implication}</p>
                )}
              </div>
            )}

            {slide.diagramType === 'architecture' && (
              <div className={`space-y-1.5 text-xs ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                {slide.diagramData.description && (
                  <p className={`font-semibold ${dm ? 'text-white' : 'text-[#0F172A]'}`}>{slide.diagramData.description}</p>
                )}
                {slide.diagramData.partitions && slide.diagramData.partitions.map((p: string, i: number) => (
                  <div key={i} className={`p-2 rounded-xl border font-medium ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200/80'}`}>
                    {p}
                  </div>
                ))}
                {slide.diagramData.complexes && (
                  <ul className="list-disc pr-4 space-y-0.5">
                    {slide.diagramData.complexes.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {slide.diagramType === 'cycle' && (
              <div className={`text-xs space-y-1.5 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                {slide.diagramData.cycle && (
                  <div className={`font-mono p-2.5 rounded-xl border leading-relaxed shadow-2xs ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200/80'}`}>
                    {slide.diagramData.cycle}
                  </div>
                )}
                {slide.diagramData.inputs && (
                  <div className="flex gap-4 font-mono text-xs pt-0.5">
                    <span className="text-blue-400 font-semibold">المدخلات: {slide.diagramData.inputs}</span>
                    <span className="text-emerald-400 font-semibold">المخرجات: {slide.diagramData.outputs}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── النقاط الجوهرية (أسفل الشريحة) ─── */}
      <div className={`shrink-0 pt-3 border-t ${dm ? 'border-slate-700/60' : 'border-slate-100'}`}>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${dm ? 'text-slate-200' : 'text-[#0F172A]'}`}>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>{isAr ? 'النقاط الجوهرية للشريحة' : 'Slide Key Takeaways'}</span>

            {/* زر وحالة استخلاص الذكاء الاصطناعي */}
            <button
              type="button"
              onClick={() => fetchLLMTakeaways(true)}
              disabled={isLoadingTakeaways}
              className={`text-[10px] font-semibold normal-case px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                isLoadingTakeaways
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 cursor-wait'
                  : dm
                    ? 'text-blue-300 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                    : 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
              title={isAr ? 'إعادة استخلاص النقاط بالذكاء الاصطناعي LLM' : 'Regenerate takeaways with LLM'}
            >
              {isLoadingTakeaways ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  <span>{isAr ? 'جاري الاستخلاص بالذكاء الاصطناعي...' : 'Extracting with AI...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>{isAr ? 'استخلاص ذكي عبر LLM' : 'AI LLM Takeaways'}</span>
                </>
              )}
            </button>
          </div>
          <span className={`text-[11px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
            {isAr ? 'مفاهيم أساسية للاختبار والمراجعة' : 'Core concepts for exam review'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {takeaways.map((point, idx) => {
            const isPointArabic = /[\u0600-\u06FF]/.test(point);
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 text-xs p-3 rounded-xl border leading-relaxed shadow-2xs transition-all ${
                  dm
                    ? 'text-slate-200 bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                    : 'text-slate-800 bg-slate-50/80 border-slate-200/80 hover:bg-slate-100/60'
                }`}
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                    dm
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-blue-50 text-blue-600 border border-blue-200/60'
                  }`}
                >
                  {idx + 1}
                </span>
                <div
                  className="flex-1 min-w-0 font-medium leading-relaxed"
                  dir={isPointArabic ? 'rtl' : 'ltr'}
                >
                  {(() => {
                    const colonIdx = point.indexOf(':');
                    if (colonIdx > 0 && colonIdx < 35) {
                      const heading = point.slice(0, colonIdx);
                      const body = point.slice(colonIdx + 1);
                      return (
                        <>
                          <span className={`font-bold ${dm ? 'text-blue-300' : 'text-[#0F172A]'}`}>{heading}:</span>
                          <span>{body}</span>
                        </>
                      );
                    }
                    return point;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};