import React, { useState, useRef } from 'react';
import { Lecture } from '../types';
import { BookOpen, Upload, ArrowRight, Clock, Sparkles, CheckCircle, FileText, ChevronRight, Plus, Trash2, AlertTriangle, X, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { UploadModal } from './UploadModal';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { ThemeToggle } from './ThemeToggle';

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
  const { currentUser, userProfile, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
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
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#121417] text-[#1E2124] dark:text-[#F3F4F6] flex flex-col justify-between selection:bg-[#E8F0E6] dark:selection:bg-[#1E3A2F] transition-colors duration-200">
      {/* Quiet Top Navigation */}
      <header className="w-full max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#2E7D32] dark:bg-[#1B5E20] text-white flex items-center justify-center font-serif font-bold text-base shadow-2xs">
            🎓
          </div>
          <div>
            <h1 className="text-base font-serif font-bold text-[#181A1C] dark:text-[#F1F3F5] tracking-tight">
              ATTOCUS
            </h1>
            <p className="text-[11px] text-[#6E757C] dark:text-[#9AA0A6]">
              Intelligent Multi-Agent Study Companion
            </p>
          </div>
        </div>

        {/* Quiet Focus Points, User Profile, & Theme Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#1A1D22] border border-[#E2E4DE] dark:border-[#2E3339] shadow-2xs text-xs text-[#52575C] dark:text-[#9AA0A6] font-mono">
            <Sparkles className="w-3.5 h-3.5 text-[#2E7D32] dark:text-[#4ADE80]" />
            <span>{totalFocusPoints} Focus Points</span>
          </div>

          <ThemeToggle id="home-theme-toggle-btn" />

          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-white dark:bg-[#1A1D22] border border-[#E2E4DE] dark:border-[#2E3339] shadow-2xs text-xs text-[#303336] dark:text-[#E2E4E8]">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full object-cover border border-[#D0D4CA] dark:border-[#4B5563]"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#2E7D32] text-white flex items-center justify-center font-bold text-[10px]">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="font-medium max-w-[120px] truncate text-[11px]">
                {currentUser.displayName || currentUser.email?.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                title="تسجيل الخروج"
                className="text-[#888E95] hover:text-[#DC2626] dark:text-[#9CA3AF] dark:hover:text-[#F87171] transition-colors p-0.5 cursor-pointer ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1A1D22] hover:bg-[#F9FAF6] dark:hover:bg-[#252930] border border-[#D5D8CF] dark:border-[#2E3339] text-xs font-medium text-[#2E7D32] dark:text-[#4ADE80] shadow-2xs transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Single-Clear-Action Canvas */}
      <main className="w-full max-w-2xl mx-auto px-6 py-4 flex-1 flex flex-col justify-center space-y-8">
        {/* Total Today's Focus */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#1A1D22] border border-[#E2E4DC] dark:border-[#2E3339] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EBF3EA] dark:bg-[#1E3A24] text-[#2E7D32] dark:text-[#4ADE80] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#303438] dark:text-[#E2E4E8] block">Today's Focus</span>
              <span className="text-[11px] text-[#71777E] dark:text-[#9AA0A6]">Total productive time counted</span>
            </div>
          </div>
          <span className="text-sm font-bold font-mono text-[#2E7D32] dark:text-[#4ADE80] bg-[#F2F6F0] dark:bg-[#1B3520] px-3 py-1 rounded-full">
            {formatTotalTime(todayMinutesStudied)}
          </span>
        </div>

        {/* Clear Action 1: Continue Last Lecture */}
        {activeLecture && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#1A1D22] border border-[#DFE2D9] dark:border-[#2E3339] shadow-xs space-y-5 hover:border-[#CED3C7] dark:hover:border-[#3E454E] transition-all">
            <div className="flex items-center justify-between text-xs text-[#6A7178] dark:text-[#9AA0A6]">
              <span className="font-medium px-2 py-0.5 rounded bg-[#F1F3EE] dark:bg-[#252930] text-[#42474C] dark:text-[#CBD5E1] uppercase tracking-wide">
                {activeLecture.subject}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Page {activeLecture.currentPage} of {activeLecture.totalPages}</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#181A1D] dark:text-[#F1F3F5] tracking-tight leading-snug">
                  {activeLecture.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#5C636A] dark:text-[#9AA0A6] mt-1.5 font-normal">
                  {activeLecture.authorOrCourse} · Current topic: {activeLecture.slides[activeLecture.currentPage - 1]?.topic || 'Review'}
                </p>
              </div>

              <button
                type="button"
                id={`delete-active-lecture-btn-${activeLecture.id}`}
                onClick={e => handleDeleteClick(e, activeLecture.id, activeLecture.title)}
                className="p-2 rounded-xl text-[#8E949A] hover:text-[#DC2626] dark:text-[#9CA3AF] dark:hover:text-[#F87171] hover:bg-[#FEE2E2]/50 dark:hover:bg-[#EF4444]/20 transition-colors"
                title="Delete this file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              id="continue-last-lecture-btn"
              onClick={() => onSelectLecture(activeLecture.id)}
              className="w-full py-3.5 px-5 rounded-xl bg-[#2E7D32] hover:bg-[#256629] dark:bg-[#1B5E20] dark:hover:bg-[#2E7D32] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <span>Continue Studying</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clear Action 2: Choose another lecture or upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#52575D] dark:text-[#9AA0A6] uppercase tracking-wider">
              Or Choose Material to Study
            </h3>

            <button
              type="button"
              id="trigger-file-upload-btn"
              onClick={() => setUploadModalOpen(true)}
              className="text-xs text-[#2E7D32] dark:text-[#4ADE80] hover:underline font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add PDF Lecture</span>
            </button>
          </div>

          {lectures.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white dark:bg-[#1A1D22] border border-[#E2E4DC] dark:border-[#2E3339] text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F2F4F0] dark:bg-[#252930] text-[#60676E] dark:text-[#9AA0A6] mx-auto flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-[#25282B] dark:text-[#F1F3F5]">No lecture files currently loaded</p>
              <p className="text-xs text-[#6B7279] dark:text-[#9AA0A6]">Click "Add PDF Lecture" above to upload or load materials.</p>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E7D32] dark:bg-[#1B5E20] text-white text-xs font-medium hover:bg-[#256629] transition-all cursor-pointer"
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
                  className="w-full p-3.5 rounded-xl bg-white dark:bg-[#1A1D22] border border-[#E2E4DC] dark:border-[#2E3339] hover:border-[#2E7D32]/50 dark:hover:border-[#4ADE80]/50 hover:bg-[#FAFBF9] dark:hover:bg-[#22262D] transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                  onClick={() => onSelectLecture(lecture.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-[#F2F4F0] dark:bg-[#252930] text-[#40464C] dark:text-[#9AA0A6] group-hover:bg-[#EAF1E7] dark:group-hover:bg-[#1E3A24] group-hover:text-[#2E7D32] dark:group-hover:text-[#4ADE80] flex items-center justify-center shrink-0 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-medium text-[#1F2225] dark:text-[#F1F3F5] truncate">
                        {lecture.title}
                      </div>
                      <div className="text-[11px] text-[#71777E] dark:text-[#9AA0A6] truncate">
                        {lecture.subject} · {lecture.totalPages} slides
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      id={`delete-lecture-btn-${lecture.id}`}
                      onClick={e => handleDeleteClick(e, lecture.id, lecture.title)}
                      className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] dark:hover:text-[#F87171] hover:bg-[#FEE2E2]/60 dark:hover:bg-[#EF4444]/20 transition-colors"
                      title="Delete lecture file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-[#8C9298] group-hover:text-[#2E7D32] dark:group-hover:text-[#4ADE80] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Quiet Academic Footer */}
      <footer className="w-full max-w-4xl mx-auto px-6 py-6 text-center text-xs text-[#8A9096] dark:text-[#6B7280]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#1A1D22] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#DFE2D8] dark:border-[#2E3339] space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/40 text-[#DC2626] dark:text-[#F87171] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteLecture(null)}
                className="p-1 rounded-lg text-[#7C838A] dark:text-[#9CA3AF] hover:bg-[#F0F2ED] dark:hover:bg-[#252930]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-serif font-bold text-[#1A1D20] dark:text-[#F1F3F5]">
                Delete Lecture Notebook?
              </h3>
              <p className="text-xs text-[#5D646B] dark:text-[#9AA0A6] mt-1.5 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-[#202326] dark:text-[#F1F3F5]">"{pendingDeleteLecture.title}"</span>? All saved annotations, study progress, and slide notes for this file will be permanently removed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteLecture(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#4D5359] dark:text-[#CBD5E1] hover:bg-[#F2F4F0] dark:hover:bg-[#252930] transition-colors cursor-pointer"
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

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};
