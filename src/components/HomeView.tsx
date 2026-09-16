import React, { useState, useRef } from 'react';
import { Lecture } from '../types';
import { BookOpen, Upload, ArrowRight, Clock, Sparkles, CheckCircle, FileText, ChevronRight, Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import { UploadModal } from './UploadModal';

interface HomeViewProps {
  lectures: Lecture[];
  activeLectureId: string;
  onSelectLecture: (lectureId: string) => void;
  onUploadLecture: (lecture: Lecture) => void;
  onDeleteLecture: (lectureId: string) => void;
  totalFocusPoints: number;
  todayMinutesStudied: number;
}

export const HomeView: React.FC<HomeViewProps> = ({
  lectures,
  activeLectureId,
  onSelectLecture,
  onUploadLecture,
  onDeleteLecture,
  totalFocusPoints,
  todayMinutesStudied
}) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingDeleteLecture, setPendingDeleteLecture] = useState<{ id: string; title: string } | null>(null);

  const activeLecture = lectures.find(l => l.id === activeLectureId) || (lectures.length > 0 ? lectures[0] : null);

  const handleDeleteClick = (e: React.MouseEvent, lectureId: string, lectureTitle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setPendingDeleteLecture({ id: lectureId, title: lectureTitle });
  };

  const confirmDelete = () => {
    if (pendingDeleteLecture) {
      onDeleteLecture(pendingDeleteLecture.id);
      setPendingDeleteLecture(null);
    }
  };

  // Format today's total focus time cleanly
  const formatTotalTime = (totalMins: number) => {
    if (totalMins < 60) return `${totalMins} mins`;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hours`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1E2124] flex flex-col justify-between selection:bg-[#E8F0E6]">
      {/* Quiet Top Navigation */}
      <header className="w-full max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#2E7D32] text-white flex items-center justify-center font-serif font-bold text-base shadow-2xs">
            🎓
          </div>
          <div>
            <h1 className="text-base font-serif font-bold text-[#181A1C] tracking-tight">
              AI Study Coach
            </h1>
            <p className="text-[11px] text-[#6E757C]">
              A teacher sitting next to you
            </p>
          </div>
        </div>

        {/* Quiet Focus Points in Corner */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2E4DE] shadow-2xs text-xs text-[#52575C] font-mono">
          <Sparkles className="w-3.5 h-3.5 text-[#2E7D32]" />
          <span>{totalFocusPoints} Focus Points</span>
        </div>
      </header>

      {/* Main Single-Clear-Action Canvas */}
      <main className="w-full max-w-2xl mx-auto px-6 py-4 flex-1 flex flex-col justify-center space-y-8">
        {/* Total Today's Focus - only count total, no 'of 40 mins' */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E4DC] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EBF3EA] text-[#2E7D32] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#303438] block">Today's Focus</span>
              <span className="text-[11px] text-[#71777E]">Total productive time counted</span>
            </div>
          </div>
          <span className="text-sm font-bold font-mono text-[#2E7D32] bg-[#F2F6F0] px-3 py-1 rounded-full">
            {formatTotalTime(todayMinutesStudied)}
          </span>
        </div>

        {/* Clear Action 1: Continue Last Lecture */}
        {activeLecture && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#DFE2D9] shadow-xs space-y-5 hover:border-[#CED3C7] transition-all">
            <div className="flex items-center justify-between text-xs text-[#6A7178]">
              <span className="font-medium px-2 py-0.5 rounded bg-[#F1F3EE] text-[#42474C] uppercase tracking-wide">
                {activeLecture.subject}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Page {activeLecture.currentPage} of {activeLecture.totalPages}</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#181A1D] tracking-tight leading-snug">
                  {activeLecture.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#5C636A] mt-1.5 font-normal">
                  {activeLecture.authorOrCourse} · Current topic: {activeLecture.slides[activeLecture.currentPage - 1]?.topic || 'Review'}
                </p>
              </div>

              <button
                type="button"
                id={`delete-active-lecture-btn-${activeLecture.id}`}
                onClick={e => handleDeleteClick(e, activeLecture.id, activeLecture.title)}
                className="p-2 rounded-xl text-[#8E949A] hover:text-[#DC2626] hover:bg-[#FEE2E2]/50 transition-colors"
                title="Delete this file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              id="continue-last-lecture-btn"
              onClick={() => onSelectLecture(activeLecture.id)}
              className="w-full py-3.5 px-5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <span>Continue Studying</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clear Action 2: Choose another lecture or upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#52575D] uppercase tracking-wider">
              Or Choose Material to Study
            </h3>

            <button
              type="button"
              id="trigger-file-upload-btn"
              onClick={() => setUploadModalOpen(true)}
              className="text-xs text-[#2E7D32] hover:underline font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add PDF Lecture</span>
            </button>
          </div>

          {lectures.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-[#E2E4DC] text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F2F4F0] text-[#60676E] mx-auto flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-[#25282B]">No lecture files currently loaded</p>
              <p className="text-xs text-[#6B7279]">Click "Add PDF Lecture" above to upload or load materials.</p>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-medium hover:bg-[#256629] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload PDF</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lectures.map(lecture => (
                <div
                  key={lecture.id}
                  id={`lecture-item-row-${lecture.id}`}
                  className="w-full p-3.5 rounded-xl bg-white border border-[#E2E4DC] hover:border-[#2E7D32]/50 hover:bg-[#FAFBF9] transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                  onClick={() => onSelectLecture(lecture.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-[#F2F4F0] text-[#40464C] group-hover:bg-[#EAF1E7] group-hover:text-[#2E7D32] flex items-center justify-center shrink-0 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-medium text-[#1F2225] truncate">
                        {lecture.title}
                      </div>
                      <div className="text-[11px] text-[#71777E] truncate">
                        {lecture.subject} · {lecture.totalPages} slides
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      id={`delete-lecture-btn-${lecture.id}`}
                      onClick={e => handleDeleteClick(e, lecture.id, lecture.title)}
                      className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2]/60 transition-colors"
                      title="Delete lecture file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-[#8C9298] group-hover:text-[#2E7D32] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Quiet Academic Footer */}
      <footer className="w-full max-w-4xl mx-auto px-6 py-6 text-center text-xs text-[#8A9096]">
        A teacher-led experience · Clean, quiet, and document-centered
      </footer>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onLectureCreated={onUploadLecture}
      />

      {/* Delete Confirmation Modal */}
      {pendingDeleteLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DFE2D8] space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteLecture(null)}
                className="p-1 rounded-lg text-[#7C838A] hover:bg-[#F0F2ED]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-serif font-bold text-[#1A1D20]">
                Delete Lecture Notebook?
              </h3>
              <p className="text-xs text-[#5D646B] mt-1.5 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-[#202326]">"{pendingDeleteLecture.title}"</span>? All saved annotations, study progress, and slide notes for this file will be permanently removed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteLecture(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#4D5359] hover:bg-[#F2F4F0] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-lecture-btn"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-colors cursor-pointer shadow-xs"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
