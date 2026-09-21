import React, { useState, useRef } from 'react';
import { Lecture } from '../types';
import { parseUploadedFile } from '../utils/fileUpload';
import { Upload, FileText, X, Loader2 } from 'lucide-react';

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
    setProgressStatus(`Analyzing and rendering "${file.name}"...`);

    try {
      let parsedLecture = await parseUploadedFile(file, pct => {
        setProgressStatus(`Processing pages & high-res slides (${pct}%)...`);
      });

      // Ingest PDF into Shared Firestore RAG & Enrich slides
      if (file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.pptx')) {
        setProgressStatus(`Indexing in AI Knowledge Base...`);
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
                  title: title || `Slide ${idx + 1}`,
                  subtitle: existingSlide?.subtitle,
                  content: content.length > 0 ? content : (backendText ? [backendText.slice(0, 300)] : [`Slide ${idx + 1}`]),
                  keyPoints: keyPoints.length > 0 ? keyPoints : (content.slice(0, 3)),
                  topic: title || `Slide ${idx + 1}`,
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
      alert('Could not parse this file. Please make sure it is a valid PDF or slide document.');
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
      id="upload-modal-overlay"
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="upload-modal-card"
        className="bg-[#FAFAF8] dark:bg-[#1A1D22] rounded-2xl border border-[#E0E2DC] dark:border-[#2E3339] shadow-xl w-full max-w-lg overflow-hidden text-[#202326] dark:text-[#F1F3F5] transition-all"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E8EAE4] dark:border-[#2E3339] bg-white dark:bg-[#16181B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F0E6] dark:bg-[#1E3A24] text-[#2E7D32] dark:text-[#4ADE80] flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-bold text-[#1A1D20] dark:text-[#F1F3F5]">
                Upload Lecture Material
              </h3>
              <p className="text-[11px] text-[#697076] dark:text-[#9AA0A6]">
                Upload your PDF lecture slides or course document
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-upload-modal-btn"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#EFF1EB] dark:hover:bg-[#252930] flex items-center justify-center text-[#6E747B] dark:text-[#9AA0A6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isProcessing ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2E7D32] dark:text-[#4ADE80] animate-spin mx-auto" />
              <div className="text-sm font-medium text-[#1E2225] dark:text-[#F1F3F5]">{progressStatus}</div>
              <p className="text-xs text-[#6B7279] dark:text-[#9AA0A6]">Rendering ultra-crisp slides and extracting concepts...</p>
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
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#2E7D32] dark:border-[#4ADE80] bg-[#F0F6EE] dark:bg-[#1E3A24]/40'
                    : 'border-[#D5D8D0] dark:border-[#2E3339] bg-white dark:bg-[#16181B] hover:border-[#2E7D32]/60 dark:hover:border-[#4ADE80]/60 hover:bg-[#F9FAF7] dark:hover:bg-[#20242B]'
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

                <div className="w-12 h-12 rounded-2xl bg-[#E8F0E6] dark:bg-[#1E3A24] text-[#2E7D32] dark:text-[#4ADE80] flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>

                <h4 className="text-sm font-serif font-bold text-[#1C2023] dark:text-[#F1F3F5]">
                  Select or drag your PDF here
                </h4>
                <p className="text-xs text-[#646A71] dark:text-[#9AA0A6] mt-1 max-w-xs mx-auto leading-relaxed">
                  Supports multi-page university lecture slides, presentation PDFs, and course handouts.
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E7D32] dark:bg-[#1B5E20] text-white text-xs font-medium shadow-xs hover:bg-[#256629] dark:hover:bg-[#2E7D32] transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose PDF File</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

