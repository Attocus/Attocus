import React from 'react';
import { Slide } from '../types';
import { BookOpen, Layers, Network, Table as TableIcon, GitBranch, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface SlideViewerProps {
  slide: Slide;
  totalSlides: number;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ slide, totalSlides }) => {
  return (
    <div
      dir="rtl"
      className="w-full h-full flex flex-col justify-between p-6 sm:p-8 select-text bg-white text-slate-900 font-sans antialiased"
    >
      {/* ─── رأس الشريحة والبيانات الوصفية (Header Metadata) ─── */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 tracking-wide">
              {slide.topic || 'عام'}
            </span>
            {slide.externalCitations && slide.externalCitations.length > 0 && (
              <span className="text-[11px] text-slate-400">
                مرجع: {slide.externalCitations[0]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>صفحة {slide.pageNumber} من {totalSlides}</span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-slate-500 font-semibold">كثافة المحتوى {slide.densityScore}/5</span>
          </div>
        </div>

        {/* عنوان الشريحة */}
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight leading-snug">
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal leading-relaxed">
            {slide.subtitle}
          </p>
        )}

        {/* عرض صورة الصفحة المرفوعة إن وُجدت */}
        {slide.pageImageUrl ? (
          <div className="mt-5 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-50">
            <img
              src={slide.pageImageUrl}
              alt={`صفحة ${slide.pageNumber}: ${slide.title}`}
              className="w-full h-auto object-contain select-none"
              style={{ imageRendering: 'high-quality' }}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          /* محتوى الشريحة النصي */
          <div className="mt-5 space-y-3.5 max-w-4xl">
            {slide.content.map((paragraph, idx) => (
              <p key={idx} className="text-slate-700 text-sm sm:text-base leading-relaxed text-justify">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* ─── المخططات والرسومات البيانية إن وُجدت ─── */}
        {slide.diagramType && (
          <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200/70 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
              {slide.diagramType === 'flowchart' && <GitBranch className="w-4 h-4 text-blue-600" />}
              {slide.diagramType === 'architecture' && <Network className="w-4 h-4 text-indigo-600" />}
              {slide.diagramType === 'table' && <TableIcon className="w-4 h-4 text-purple-600" />}
              {slide.diagramType === 'cycle' && <Layers className="w-4 h-4 text-amber-600" />}
              {slide.diagramType === 'equation' && <BookOpen className="w-4 h-4 text-blue-600" />}
              <span>النموذج التحليلي: {slide.diagramType}</span>
            </div>

            {/* تفاصيل المخطط الانسيابي (Flowchart Steps) */}
            {slide.diagramType === 'flowchart' && slide.diagramData?.steps && (
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 text-xs text-slate-800">
                {slide.diagramData.steps.map((step: string, i: number) => (
                  <React.Fragment key={i}>
                    <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 font-semibold shadow-2xs text-center">
                      {step}
                    </div>
                    {i < slide.diagramData.steps.length - 1 && (
                      <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* تفاصيل حالات المخطط (Transitions) */}
            {slide.diagramType === 'flowchart' && slide.diagramData?.transitions && (
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="font-bold text-[#0F172A] mb-1">
                  مسار الحالات: {(slide.diagramData.states || []).join(' ← ')}
                </div>
                {slide.diagramData.transitions.map((t: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}

            {/* الجداول التحليلية (Tables) */}
            {slide.diagramType === 'table' && slide.diagramData?.headers && (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600">
                      {slide.diagramData.headers.map((h: string, i: number) => (
                        <th key={i} className="pb-2 font-bold pl-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slide.diagramData.rows.map((row: string[], ri: number) => (
                      <tr key={ri} className="hover:bg-white/80 transition-colors">
                        {row.map((cell: string, ci: number) => (
                          <td key={ci} className={`py-2 pl-3 text-slate-700 ${ci === 0 ? 'font-bold text-[#0F172A]' : ''}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* المعادلات الرياضية (Equations) */}
            {slide.diagramType === 'equation' && (
              <div className="text-center py-2 space-y-2">
                <div className="text-sm sm:text-base font-mono font-bold text-[#0F172A] bg-white border border-slate-200 py-2 px-4 rounded-xl inline-block shadow-2xs" dir="ltr">
                  {slide.diagramData.formula}
                </div>
                {slide.diagramData.interpretation && (
                  <p className="text-xs text-slate-500 italic">{slide.diagramData.interpretation}</p>
                )}
                {slide.diagramData.implication && (
                  <p className="text-xs text-slate-500 italic">{slide.diagramData.implication}</p>
                )}
              </div>
            )}

            {/* النماذج الهيكلية (Architecture) */}
            {slide.diagramType === 'architecture' && (
              <div className="space-y-2 text-xs text-slate-700">
                {slide.diagramData.description && (
                  <p className="font-semibold text-[#0F172A]">{slide.diagramData.description}</p>
                )}
                {slide.diagramData.partitions && slide.diagramData.partitions.map((p: string, i: number) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200/80 font-medium">
                    {p}
                  </div>
                ))}
                {slide.diagramData.complexes && (
                  <ul className="list-disc pr-4 space-y-1 text-slate-600">
                    {slide.diagramData.complexes.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* الدورات والعمليات الدائرية (Cycles) */}
            {slide.diagramType === 'cycle' && (
              <div className="text-xs text-slate-700 space-y-2">
                {slide.diagramData.cycle && (
                  <div className="font-mono bg-white p-3 rounded-xl border border-slate-200/80 leading-relaxed shadow-2xs">
                    {slide.diagramData.cycle}
                  </div>
                )}
                {slide.diagramData.inputs && (
                  <div className="flex gap-4 font-mono text-xs pt-1">
                    <span className="text-blue-600 font-semibold">المدخلات: {slide.diagramData.inputs}</span>
                    <span className="text-emerald-600 font-semibold">المخرجات: {slide.diagramData.outputs}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── النقاط الجوهرية ومراجعة الاختبار (Core Takeaways) ─── */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>النقاط الجوهرية للشريحة</span>
            <span className="text-[10px] text-slate-500 font-medium normal-case hidden sm:inline bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
              ملخصة تلقائياً عبر المساعد الذكي
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            مفاهيم أساسية للاختبار والمراجعة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {slide.keyPoints.map((point, idx) => (
            <div
              key={idx}
              className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/70 leading-relaxed shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <span className="font-bold text-[#0F172A] ml-1.5">{idx + 1}.</span>
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};