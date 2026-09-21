import React, { useState, useRef } from 'react';
import { Lecture } from '../types';
import { parseUploadedFile } from '../utils/fileUpload';
import { Upload, FileText, X, Loader2, Sparkles } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLectureCreated: (lecture: Lecture) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onLectureCreated
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setProgressStatus(`جاري تحليل ومعالجة "${file.name}"...`);

    try {
      let parsedLecture = await parseUploadedFile(file, pct => {
        setProgressStatus(`جاري معالجة الصفحات والشرائح عالية الدقة (${pct}%)...`);
      });

      // Ingest PDF into Shared Firestore RAG & Enrich slides
      if (file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.pptx')) {
        setProgressStatus(`جاري الفهرسة في قاعدة المعرفة الذكية...`);
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('session_id', parsedLecture.id || 'default');

          const ragRes = await fetch('/api/rag/upload', {
            method: 'POST',
            body: formData
          });

          if (ragRes.ok) {
            const ragData = await ragRes.json();
            console.log('[RAG] Indexed successfully:', ragData);

            // Always enrich slides with backend extracted text from Shared RAG
            if (ragData.pages && ragData.pages.length > 0) {
              console.log('[Upload] Enriching lecture from backend RAG pages:', ragData.pages.length);

              const baseLength = Math.max(parsedLecture.slides.length, ragData.pages.length);
              const enrichedSlides = [];

              for (let idx = 0; idx < baseLength; idx++) {
                const existingSlide = parsedLecture.slides[idx];
                const backendPage = ragData.pages[idx];
                const backendText = (backendPage?.text || '').trim();
                const backendLines = backendText
                  ? backendText.split(/\n+/).map((l: string) => l.trim()).filter((l: string) => l.length > 2)
                  : [];

                const currentContentStr = (existingSlide?.content || []).join(' ');
                const currentKeyPointsStr = (existingSlide?.keyPoints || []).join(' ');
                const isPlaceholder = !existingSlide ||
                  !currentContentStr ||
                  currentContentStr.includes('Visual presentation content') ||
                  currentContentStr.includes('Section notes and key lecture points') ||
                  currentKeyPointsStr.includes('Visual and conceptual takeaways') ||
                  currentContentStr.length < 30;

                let title = existingSlide?.title;
                const isGenericTitle = !title || title.toLowerCase().startsWith('slide ') || title.includes('Introduction');
                if (isGenericTitle && backendLines.length > 0) {
                  title = backendLines[0].slice(0, 75);
                }

                let content = existingSlide?.content || [];
                let keyPoints = existingSlide?.keyPoints || [];

                if (isPlaceholder && backendLines.length > 0) {
                  content = backendLines.slice(backendLines[0] === title ? 1 : 0, 8);
                  if (content.length === 0) content = [backendText.slice(0, 350)];
                  keyPoints = content.slice(0, 3);
                } else if (isPlaceholder && backendText) {
                  content = [backendText.slice(0, 350)];
                  keyPoints = [backendText.slice(0, 100)];
                }

                enrichedSlides.push({
                  id: existingSlide?.id || `slide-${idx + 1}`,
                  pageNumber: idx + 1,
                  title: title || `شريحة ${idx + 1}`,
                  subtitle: existingSlide?.subtitle,
                  content: content.length > 0 ? content : (backendText ? [backendText.slice(0, 300)] : [`شريحة ${idx + 1}`]),
                  keyPoints: keyPoints.length > 0 ? keyPoints : (content.slice(0, 3)),
                  topic: title || `شريحة ${idx + 1}`,
                  densityScore: existingSlide?.densityScore || 3,
                  pageImageUrl: existingSlide?.pageImageUrl,
                  rawText: backendText || (existingSlide as any)?.rawText || ''
                });
              }

              parsedLecture = {
                ...parsedLecture,
                title: parsedLecture.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
                totalPages: enrichedSlides.length,
                slides: enrichedSlides
              };
            }
          }
        } catch (ragErr) {
          console.warn('[RAG] Background indexing error:', ragErr);
        }
      }

      setIsProcessing(false);
      onLectureCreated(parsedLecture);
      onClose();
    } catch (err: any) {
      console.error('File parsing error:', err);
      setIsProcessing(false);
      alert('تعذر استخراج ومعالجة هذا الملف. يرجى التأكد من اختيار ملف PDF صالح.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      dir="rtl"
      id="upload-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="upload-modal-card"
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 transition-all animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-2xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                رفع مادة دراسية جديدة
              </h3>
              <p className="text-[11px] text-slate-400">
                ارفع شرائح العرض (PDF) أو ملخصات المحاضرات للمذاكرة التفاعلية
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-upload-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isProcessing ? (
            <div className="py-14 text-center space-y-3.5">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <div className="text-sm font-bold text-[#0F172A]">{progressStatus}</div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                نقوم بتحويل الشرائح إلى دقة فائقة مع استخراج المفاهيم وتهيئتها للمساعد الذكي...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-9 text-center cursor-pointer transition-all duration-200 ${isDragging
                    ? 'border-blue-600 bg-blue-50/50 scale-[1.01]'
                    : 'border-slate-200 bg-slate-50/60 hover:border-blue-500/70 hover:bg-slate-50'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.pptx"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className="hidden"
                  id="modal-pdf-file-picker"
                />

                <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200 shadow-2xs text-blue-600 flex items-center justify-center mx-auto mb-3.5">
                  <FileText className="w-6 h-6 stroke-[1.8]" />
                </div>

                <h4 className="text-sm font-bold text-[#0F172A]">
                  اسحب وأفلت ملف PDF هنا، أو تصفح جهازك
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  يدعم ملفات السلايدات الجامعية، عروض PowerPoint بصيغة PDF، والمذكرات الدراسية.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold shadow-xs transition-all active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-blue-300" />
                  <span>اختر ملف من جهازك</span>
                </div>
              </div>

              {/* تلميح سفلي خفيف */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>تتم معالجة المستندات تلقائياً لدعم الأسئلة والاختبارات الذكية</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};