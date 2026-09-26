import React, { useState, useRef } from 'react';
import { Lecture } from '../types';
import { parseUploadedFile } from '../utils/fileUpload';
import { Upload, FileText, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { t, isAr, dir } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'pdf' && file.type !== 'application/pdf') {
      setErrorMessage(
        isAr
          ? 'عذراً، لا يقبل النظام إلا ملفات PDF فقط. يرجى إرفاق المحاضرة بصيغة PDF.'
          : 'Sorry, only PDF files are accepted. Please attach a PDF file.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    setProgressStatus(isAr ? `جاري تحليل ومعالجة "${file.name}"...` : `Analyzing and processing "${file.name}"...`);

    try {
      let parsedLecture = await parseUploadedFile(file, pct => {
        setProgressStatus(isAr ? `جاري معالجة الصفحات والشرائح عالية الدقة (${pct}%)...` : `Processing high-resolution slides (${pct}%)...`);
      });

      // Ingest PDF into Shared Firestore RAG & Enrich slides
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setProgressStatus(isAr ? `جاري الفهرسة في قاعدة المعرفة الذكية...` : `Indexing into smart knowledge base...`);
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('session_id', parsedLecture.id || 'default');
          formData.append('language', isAr ? 'ar' : 'en');


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
                  currentKeyPointsStr.length < 30;

                let title = existingSlide?.title;
                const isGenericTitle = !title || title.toLowerCase().startsWith('slide ') || title.includes('Introduction');
                if (isGenericTitle && backendLines.length > 0) {
                  title = backendLines[0].slice(0, 75);
                }

                let content = existingSlide?.content || [];
                let keyPoints = existingSlide?.keyPoints || [];

                if (isPlaceholder && backendLines.length > 0) {
                  const cleanedLines: string[] = [];
                  for (const line of backendLines) {
                    const parts = line.split(/[●•·]/).map((p: string) => p.trim()).filter((p: string) => p.length > 5);
                    if (parts.length > 1) {
                      cleanedLines.push(...parts);
                    } else {
                      cleanedLines.push(line.replace(/^[●•·\-\*]\s*/, '').trim());
                    }
                  }
                  content = cleanedLines.slice(cleanedLines[0] === title ? 1 : 0, 10);
                  if (content.length === 0) content = [backendText.slice(0, 350)];
                  keyPoints = content.slice(0, 3).map((k: string) => k.replace(/^[0-9]+[\.\-\)]\s*/, '').trim());
                } else if (isPlaceholder && backendText) {
                  content = [backendText.slice(0, 350)];
                  keyPoints = [backendText.slice(0, 100)];
                }

                enrichedSlides.push({
                  id: existingSlide?.id || `slide-${idx + 1}`,
                  pageNumber: idx + 1,
                  title: title || (isAr ? `شريحة ${idx + 1}` : `Slide ${idx + 1}`),
                  subtitle: existingSlide?.subtitle,
                  content: content.length > 0 ? content : (backendText ? [backendText.slice(0, 300)] : [isAr ? `شريحة ${idx + 1}` : `Slide ${idx + 1}`]),
                  keyPoints: keyPoints.length > 0 ? keyPoints : (content.slice(0, 3)),
                  topic: title || (isAr ? `شريحة ${idx + 1}` : `Slide ${idx + 1}`),
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
          console.warn('[RAG] Upload failed, using client parsed content:', ragErr);
        }
      }

      onLectureCreated(parsedLecture);
      onClose();
    } catch (error: any) {
      console.error('Error parsing uploaded file:', error);
      setErrorMessage(
        error?.message ||
        (isAr ? 'عذراً، لا يقبل النظام إلا ملفات PDF فقط. يرجى إرفاق المحاضرة بصيغة PDF.' : 'Error processing file. Please ensure it is a valid PDF.')
      );
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      dir={dir}
      id="upload-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="upload-modal-card"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-slate-100 transition-all animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/80 dark:border-blue-900/50 shadow-2xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white tracking-tight">
                {isAr ? 'رفع مادة دراسية جديدة' : 'Upload New Study Material'}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                {isAr ? 'ارفع شرائح العرض (PDF) أو ملخصات المحاضرات للمذاكرة التفاعلية' : 'Upload lecture slides (PDF) or summaries for interactive studying'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-upload-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div
              id="upload-error-banner"
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="flex-1">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isProcessing ? (
            <div className="py-14 text-center space-y-3.5">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
              <div className="text-sm font-bold text-[#0F172A] dark:text-white">{progressStatus}</div>
              <p className="text-xs text-slate-400 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                {isAr
                  ? 'نقوم بتحويل الشرائح إلى دقة فائقة مع استخراج المفاهيم وتهيئتها للمساعد الذكي...'
                  : 'Converting slides to high-res, extracting concepts, and preparing the smart assistant...'}
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
                className={`border-2 border-dashed rounded-3xl p-9 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-500/70 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className="hidden"
                  id="modal-pdf-file-picker"
                />

                <div className="w-13 h-13 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3.5">
                  <FileText className="w-6 h-6 stroke-[1.8]" />
                </div>

                <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                  {isAr ? 'اسحب وأفلت ملف PDF هنا، أو تصفح جهازك' : 'Drag & drop a PDF file here, or browse device'}
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  {isAr
                    ? 'يدعم ملفات السلايدات الجامعية والمذكرات الدراسية بصيغة PDF حصرياً.'
                    : 'Supports lecture slides and study notes strictly in PDF format.'}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-blue-300 dark:text-white" />
                  <span>{isAr ? 'اختر ملف PDF من جهازك' : 'Choose PDF file from device'}</span>
                </div>
              </div>


              {/* تلميح سفلي خفيف */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-400 pt-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{isAr ? 'تتم معالجة المستندات تلقائياً لدعم الأسئلة والاختبارات الذكية' : 'Documents are processed automatically for smart quizzes & Q&A'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};