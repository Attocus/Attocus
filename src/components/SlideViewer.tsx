import React from 'react';
import { Slide } from '../types';
import { BookOpen, Layers, Network, Table as TableIcon, GitBranch, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SlideViewerProps {
  slide: Slide;
  totalSlides: number;
  isDarkMode?: boolean;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ slide, totalSlides, isDarkMode }) => {
  const dm = isDarkMode;
  const { isAr, dir, t } = useLanguage();

  return (
    <div
      dir={dir}
      className={`w-full h-full flex flex-col justify-between p-6 sm:p-8 select-text font-sans antialiased transition-colors duration-300 ${
        dm ? 'bg-[#141b2d] text-slate-100' : 'bg-white text-slate-900'
      }`}
    >
      {/* ─── رأس الشريحة ─── */}
      <div>
        <div className={`flex items-center justify-between pb-3 border-b mb-4 ${dm ? 'border-slate-700/60' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg tracking-wide ${dm ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
              {slide.topic || (isAr ? 'عام' : 'General')}
            </span>
            {slide.externalCitations && slide.externalCitations.length > 0 && (
              <span className={`text-[11px] ${dm ? 'text-slate-400' : 'text-slate-400'}`}>
                {t('workspace.citation', 'مرجع:')} {slide.externalCitations[0]}
              </span>
            )}
          </div>

          <div className={`flex items-center gap-2 text-xs font-medium ${dm ? 'text-slate-400' : 'text-slate-400'}`}>
            <span>{isAr ? `صفحة ${slide.pageNumber} من ${totalSlides}` : `Page ${slide.pageNumber} of ${totalSlides}`}</span>
            <span className={`inline-block w-1 h-1 rounded-full ${dm ? 'bg-slate-600' : 'bg-slate-300'}`} />
            <span className={`font-semibold ${dm ? 'text-slate-300' : 'text-slate-500'}`}>
              {t('workspace.contentDensity', 'كثافة المحتوى')} {slide.densityScore}/5
            </span>
          </div>
        </div>

        {/* عنوان الشريحة */}
        <h1 className={`text-xl sm:text-2xl font-bold tracking-tight leading-snug ${dm ? 'text-white' : 'text-[#0F172A]'}`}>
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className={`text-xs sm:text-sm mt-1 font-normal leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            {slide.subtitle}
          </p>
        )}

        {/* صورة الشريحة */}
        {slide.pageImageUrl ? (
          <div className={`mt-5 rounded-2xl overflow-hidden border shadow-xs ${dm ? 'border-slate-700/50 bg-slate-800' : 'border-slate-200/80 bg-slate-50'}`}>
            <img
              src={slide.pageImageUrl}
              alt={`صفحة ${slide.pageNumber}: ${slide.title}`}
              className={`w-full h-auto object-contain select-none ${dm ? 'opacity-90' : ''}`}
              style={{ imageRendering: 'high-quality' }}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3.5 max-w-4xl">
            {slide.content.map((paragraph, idx) => (
              <p key={idx} className={`text-sm sm:text-base leading-relaxed text-justify ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* المخططات */}
        {slide.diagramType && (
          <div className={`mt-5 p-5 rounded-2xl border shadow-2xs ${dm ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-50 border-slate-200/70'}`}>
            <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
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
                    <div className={`px-3.5 py-2 rounded-xl border font-semibold shadow-2xs text-center ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200/80 text-slate-800'}`}>
                      {step}
                    </div>
                    {i < slide.diagramData.steps.length - 1 && (
                      <ArrowLeft className={`w-4 h-4 shrink-0 ${dm ? 'text-slate-500' : 'text-slate-400'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {slide.diagramType === 'flowchart' && slide.diagramData?.transitions && (
              <div className={`space-y-1.5 text-xs ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                <div className={`font-bold mb-1 ${dm ? 'text-white' : 'text-[#0F172A]'}`}>
                  مسار الحالات: {(slide.diagramData.states || []).join(' ← ')}
                </div>
                {slide.diagramData.transitions.map((t: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
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
                        <th key={i} className="pb-2 font-bold pl-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-100'}`}>
                    {slide.diagramData.rows.map((row: string[], ri: number) => (
                      <tr key={ri} className={`transition-colors ${dm ? 'hover:bg-slate-700/40' : 'hover:bg-white/80'}`}>
                        {row.map((cell: string, ci: number) => (
                          <td key={ci} className={`py-2 pl-3 ${ci === 0 ? (dm ? 'font-bold text-white' : 'font-bold text-[#0F172A]') : (dm ? 'text-slate-300' : 'text-slate-700')}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {slide.diagramType === 'equation' && (
              <div className="text-center py-2 space-y-2">
                <div className={`text-sm sm:text-base font-mono font-bold py-2 px-4 rounded-xl inline-block shadow-2xs border ${dm ? 'bg-slate-700 border-slate-600 text-blue-300' : 'bg-white border-slate-200 text-[#0F172A]'}`} dir="ltr">
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
              <div className={`space-y-2 text-xs ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                {slide.diagramData.description && (
                  <p className={`font-semibold ${dm ? 'text-white' : 'text-[#0F172A]'}`}>{slide.diagramData.description}</p>
                )}
                {slide.diagramData.partitions && slide.diagramData.partitions.map((p: string, i: number) => (
                  <div key={i} className={`p-2.5 rounded-xl border font-medium ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200/80'}`}>
                    {p}
                  </div>
                ))}
                {slide.diagramData.complexes && (
                  <ul className="list-disc pr-4 space-y-1">
                    {slide.diagramData.complexes.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {slide.diagramType === 'cycle' && (
              <div className={`text-xs space-y-2 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                {slide.diagramData.cycle && (
                  <div className={`font-mono p-3 rounded-xl border leading-relaxed shadow-2xs ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200/80'}`}>
                    {slide.diagramData.cycle}
                  </div>
                )}
                {slide.diagramData.inputs && (
                  <div className="flex gap-4 font-mono text-xs pt-1">
                    <span className="text-blue-400 font-semibold">المدخلات: {slide.diagramData.inputs}</span>
                    <span className="text-emerald-400 font-semibold">المخرجات: {slide.diagramData.outputs}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── النقاط الجوهرية ─── */}
      <div className={`mt-6 pt-4 border-t ${dm ? 'border-slate-700/60' : 'border-slate-100'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${dm ? 'text-slate-200' : 'text-[#0F172A]'}`}>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>{isAr ? 'النقاط الجوهرية للشريحة' : 'Slide Key Takeaways'}</span>
            <span className={`text-[10px] font-medium normal-case hidden sm:inline px-2.5 py-0.5 rounded-full border ${dm ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-500 bg-slate-100 border-slate-200/60'}`}>
              {isAr ? 'ملخصة تلقائياً عبر المساعد الذكي' : 'Auto-summarized by AI'}
            </span>
          </div>
          <span className={`text-[11px] ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
            {isAr ? 'مفاهيم أساسية للاختبار والمراجعة' : 'Core concepts for exam review'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {slide.keyPoints.map((point, idx) => (
            <div
              key={idx}
              className={`text-xs p-3 rounded-2xl border leading-relaxed shadow-2xs transition-colors ${
                dm
                  ? 'text-slate-300 bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                  : 'text-slate-700 bg-slate-50/70 border-slate-200/70 hover:bg-slate-50'
              }`}
            >
              <span className={`font-bold ml-1.5 ${dm ? 'text-blue-400' : 'text-[#0F172A]'}`}>{idx + 1}.</span>
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};