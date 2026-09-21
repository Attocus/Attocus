import React from 'react';
import { Slide } from '../types';
import { BookOpen, Layers, Network, Table as TableIcon, GitBranch, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SlideViewerProps {
  slide: Slide;
  totalSlides: number;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({ slide, totalSlides }) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 sm:p-6 select-text bg-[#FAFAF8] dark:bg-[#16181C] text-[#1E2022] dark:text-[#F1F3F5] font-sans antialiased transition-colors duration-200">
      {/* Top Slide Meta & Title */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E4] dark:border-[#2E3339] mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#EAEBE8] dark:bg-[#252930] text-[#555A60] dark:text-[#CBD5E1] tracking-wide uppercase">
              {slide.topic}
            </span>
            {slide.externalCitations && slide.externalCitations.length > 0 && (
              <span className="text-[10px] text-[#7A8086] dark:text-[#9AA0A6] italic">
                Ref: {slide.externalCitations[0]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#7A8086] dark:text-[#9AA0A6]">
            <span>Page {slide.pageNumber} of {totalSlides}</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#A0A5AA] dark:bg-[#64748B]" />
            <span className="text-[#8B9197] dark:text-[#9AA0A6]">Density {slide.densityScore}/5</span>
          </div>
        </div>

        {/* Title and Subtitle */}
        <h1 className="text-lg sm:text-xl font-serif font-bold text-[#181A1B] dark:text-[#F8FAFC] tracking-tight leading-snug">
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="text-xs sm:text-sm text-[#5D646B] dark:text-[#94A3B8] mt-0.5 font-normal">
            {slide.subtitle}
          </p>
        )}

        {/* Real PDF Page Image Rendering if available */}
        {slide.pageImageUrl ? (
          <div className="mt-3 rounded-xl overflow-hidden border border-[#D8DBD2] dark:border-[#2E3339] shadow-xs bg-white dark:bg-[#1E2024]">
            <img
              src={slide.pageImageUrl}
              alt={`Page ${slide.pageNumber}: ${slide.title}`}
              className="w-full h-auto object-contain select-none"
              style={{ imageRendering: 'high-quality' }}
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          /* Main Content Paragraphs / Points */
          <div className="mt-4 space-y-3 max-w-3xl">
            {slide.content.map((paragraph, idx) => (
              <p key={idx} className="text-[#2D3135] dark:text-[#E2E8F0] text-sm sm:text-base leading-relaxed text-justify">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {/* Diagram / Specialized visual block if present */}
        {slide.diagramType && (
          <div className="mt-4 p-4 rounded-xl bg-white dark:bg-[#1A1D22] border border-[#E4E5E0] dark:border-[#2E3339] shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[#666B70] dark:text-[#9AA0A6] uppercase tracking-wider">
              {slide.diagramType === 'flowchart' && <GitBranch className="w-4 h-4 text-[#4B7055] dark:text-[#4ADE80]" />}
              {slide.diagramType === 'architecture' && <Network className="w-4 h-4 text-[#3A6B88] dark:text-[#38BDF8]" />}
              {slide.diagramType === 'table' && <TableIcon className="w-4 h-4 text-[#7A5A88] dark:text-[#C084FC]" />}
              {slide.diagramType === 'cycle' && <Layers className="w-4 h-4 text-[#8C6239] dark:text-[#FB923C]" />}
              {slide.diagramType === 'equation' && <BookOpen className="w-4 h-4 text-[#335C67] dark:text-[#2DD4BF]" />}
              <span>Analytical Model: {slide.diagramType}</span>
            </div>

            {/* Diagram content variants */}
            {slide.diagramType === 'flowchart' && slide.diagramData?.steps && (
              <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 text-xs text-[#2A2E33] dark:text-[#E2E8F0]">
                {slide.diagramData.steps.map((step: string, i: number) => (
                  <React.Fragment key={i}>
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#F4F5F2] dark:bg-[#252930] border border-[#E0E2DC] dark:border-[#2E3339] font-medium max-w-xs text-center">
                      {step}
                    </div>
                    {i < slide.diagramData.steps.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-[#9EA3A8] dark:text-[#64748B] shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {slide.diagramType === 'flowchart' && slide.diagramData?.transitions && (
              <div className="space-y-1 text-xs text-[#3A3F45] dark:text-[#CBD5E1]">
                <div className="font-medium text-[#1A1D20] dark:text-[#F1F3F5] mb-0.5">State Nodes: {(slide.diagramData.states || []).join(' → ')}</div>
                {slide.diagramData.transitions.map((t: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#888D93] dark:text-[#64748B]">•</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}

            {slide.diagramType === 'table' && slide.diagramData?.headers && (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E0E2DC] dark:border-[#2E3339] text-[#555A60] dark:text-[#9AA0A6]">
                      {slide.diagramData.headers.map((h: string, i: number) => (
                        <th key={i} className="pb-1.5 font-semibold pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEBE6] dark:divide-[#2E3339]">
                    {slide.diagramData.rows.map((row: string[], ri: number) => (
                      <tr key={ri} className="hover:bg-[#F9FAF7] dark:hover:bg-[#22262D]">
                        {row.map((cell: string, ci: number) => (
                          <td key={ci} className={`py-1.5 pr-3 text-[#33373D] dark:text-[#CBD5E1] ${ci === 0 ? 'font-medium' : ''}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {slide.diagramType === 'equation' && (
              <div className="text-center py-2">
                <div className="text-sm sm:text-base font-mono font-bold text-[#1C2024] dark:text-[#F1F3F5] bg-[#F2F4F0] dark:bg-[#252930] py-1.5 px-3 rounded-lg inline-block">
                  {slide.diagramData.formula}
                </div>
                {slide.diagramData.interpretation && (
                  <p className="text-xs text-[#5E646A] dark:text-[#9AA0A6] mt-1 italic">{slide.diagramData.interpretation}</p>
                )}
                {slide.diagramData.implication && (
                  <p className="text-xs text-[#5E646A] dark:text-[#9AA0A6] mt-1 italic">{slide.diagramData.implication}</p>
                )}
              </div>
            )}

            {slide.diagramType === 'architecture' && (
              <div className="space-y-1.5 text-xs text-[#33373D] dark:text-[#CBD5E1]">
                {slide.diagramData.description && (
                  <p className="font-medium text-[#1E2226] dark:text-[#F1F3F5]">{slide.diagramData.description}</p>
                )}
                {slide.diagramData.partitions && slide.diagramData.partitions.map((p: string, i: number) => (
                  <div key={i} className="p-1.5 rounded bg-[#F6F7F4] dark:bg-[#252930] border border-[#E6E8E2] dark:border-[#2E3339]">
                    {p}
                  </div>
                ))}
                {slide.diagramData.complexes && (
                  <ul className="list-disc pl-4 space-y-0.5">
                    {slide.diagramData.complexes.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {slide.diagramType === 'cycle' && (
              <div className="text-xs text-[#33373D] dark:text-[#CBD5E1]">
                {slide.diagramData.cycle && (
                  <div className="font-mono bg-[#F5F6F3] dark:bg-[#252930] p-2.5 rounded-lg leading-relaxed">
                    {slide.diagramData.cycle}
                  </div>
                )}
                {slide.diagramData.inputs && (
                  <div className="flex gap-4 font-mono text-xs mt-1.5">
                    <span className="text-[#3A6B88] dark:text-[#38BDF8]">In: {slide.diagramData.inputs}</span>
                    <span className="text-[#4B7055] dark:text-[#4ADE80]">Out: {slide.diagramData.outputs}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Takeaways Footer on the slide */}
      <div className="mt-4 pt-3 border-t border-[#E8E8E4] dark:border-[#2E3339]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3D4247] dark:text-[#E2E4E8] uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] dark:text-[#4ADE80]" />
            <span>Core Takeaways</span>
            <span className="text-[10px] text-[#6B7280] dark:text-[#9AA0A6] font-normal normal-case hidden sm:inline bg-[#EFF1EC] dark:bg-[#252930] px-2 py-0.5 rounded-full border border-[#DCE0D6] dark:border-[#2E3339]">
              Synthesized by AI Coach from this slide's concepts
            </span>
          </div>
          <span className="text-[10px] text-[#7A8086] dark:text-[#9AA0A6] italic">
            Essential points to remember for exam review
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {slide.keyPoints.map((point, idx) => (
            <div key={idx} className="text-xs text-[#42474D] dark:text-[#CBD5E1] bg-white dark:bg-[#1A1D22] p-2 rounded-lg border border-[#E6E8E2] dark:border-[#2E3339] leading-relaxed shadow-2xs">
              <span className="font-semibold text-[#1F2937] dark:text-[#F1F3F5] mr-1.5">{idx + 1}.</span>
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};