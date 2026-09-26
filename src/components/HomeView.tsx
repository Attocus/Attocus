import React, { useState } from 'react';
import { Lecture } from '../types';
import {
  Plus, Trash2, LogIn, LogOut, Search,
  FileText, Clock, Sparkles, Flame, GraduationCap,
  Folder, Layers, Calculator, Laptop, Compass, Dna,
  Languages, ChevronRight, X, ArrowUpRight, Upload
} from 'lucide-react';
import { UploadModal } from './UploadModal';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { StreakModal } from './StreakModal';
import { ShopModal } from './ShopModal';
import { PointsHistoryModal } from './PointsHistoryModal';
import { ScheduledReviewsModal } from './ScheduledReviewsModal';
import { CalendarCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
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

interface FolderItem {
  id: string;
  key: string;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const FOLDER_ITEMS: FolderItem[] = [
  { id: 'all', key: 'folder.all', defaultLabel: 'جميع المواد', icon: Folder, color: '#3B82F6' },
  { id: 'math', key: 'folder.math', defaultLabel: 'الرياضيات', icon: Calculator, color: '#2563EB' },
  { id: 'cs', key: 'folder.cs', defaultLabel: 'علوم الحاسب', icon: Laptop, color: '#7C3AED' },
  { id: 'physics', key: 'folder.physics', defaultLabel: 'الفيزياء', icon: Compass, color: '#4F46E5' },
  { id: 'bio', key: 'folder.bio', defaultLabel: 'الأحياء', icon: Dna, color: '#059669' },
  { id: 'chem', key: 'folder.chem', defaultLabel: 'الكيمياء', icon: Sparkles, color: '#D97706' },
  { id: 'english', key: 'folder.english', defaultLabel: 'اللغة الإنجليزية', icon: Languages, color: '#0284C7' },
];

const SUBJECT_THEMES: Record<string, { bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  'Mathematics': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/60', darkBg: 'dark:bg-blue-950/40', darkText: 'dark:text-blue-300', darkBorder: 'dark:border-blue-800/50' },
  'Physics': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/60', darkBg: 'dark:bg-indigo-950/40', darkText: 'dark:text-indigo-300', darkBorder: 'dark:border-indigo-800/50' },
  'Computer Science': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', darkBg: 'dark:bg-slate-800/80', darkText: 'dark:text-slate-200', darkBorder: 'dark:border-slate-700' },
  'Biology': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60', darkBg: 'dark:bg-emerald-950/40', darkText: 'dark:text-emerald-300', darkBorder: 'dark:border-emerald-800/50' },
  'Chemistry': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60', darkBg: 'dark:bg-amber-950/40', darkText: 'dark:text-amber-300', darkBorder: 'dark:border-amber-800/50' },
  'English': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/60', darkBg: 'dark:bg-sky-950/40', darkText: 'dark:text-sky-300', darkBorder: 'dark:border-sky-800/50' },
};

export const HomeView: React.FC<HomeViewProps> = ({
  lectures,
  activeLectureId,
  onSelectLecture,
  onUploadLecture,
  onDeleteLecture,
  totalFocusPoints,
  todayMinutesStudied,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { t, isAr, dir } = useLanguage();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [scheduledReviewsModalOpen, setScheduledReviewsModalOpen] = useState(false);
  const [pendingDeleteLecture, setPendingDeleteLecture] = useState<{ id: string; title: string } | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentStreak = (() => {
    try { return parseInt(localStorage.getItem('attocus_streak') || '5', 10); } catch { return 5; }
  })();

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

  const formatTime = (totalMins: number) => {
    if (totalMins < 60) {
      return t('time.minutes', `${totalMins} دقيقة`).replace('{m}', String(totalMins));
    }
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (mins > 0) {
      return t('time.hoursMins', `${hrs} س ${mins} د`).replace('{h}', String(hrs)).replace('{m}', String(mins));
    }
    return t('time.hours', `${hrs} ساعة`).replace('{h}', String(hrs));
  };

  const getLectureCountForFolder = (folderId: string) => {
    if (folderId === 'all') return lectures.length;
    return lectures.filter(l => {
      const s = (l.subject || '').toLowerCase();
      if (folderId === 'math') return s.includes('math') || s.includes('رياضيات');
      if (folderId === 'cs') return s.includes('cs') || s.includes('computer') || s.includes('حاسب') || s.includes('os') || s.includes('operating');
      if (folderId === 'physics') return s.includes('physic') || s.includes('فيزياء');
      if (folderId === 'bio') return s.includes('bio') || s.includes('أحياء') || s.includes('احياء');
      if (folderId === 'chem') return s.includes('chem') || s.includes('كيمياء');
      if (folderId === 'english') return s.includes('eng') || s.includes('إنجليزي') || s.includes('انجليزي');
      return s.includes(folderId);
    }).length;
  };

  const filteredLectures = lectures.filter(l => {
    const s = (l.subject || '').toLowerCase();
    let matchesFolder = selectedFolder === 'all';
    if (!matchesFolder) {
      if (selectedFolder === 'math') matchesFolder = s.includes('math') || s.includes('رياضيات');
      else if (selectedFolder === 'cs') matchesFolder = s.includes('cs') || s.includes('computer') || s.includes('حاسب') || s.includes('os') || s.includes('operating');
      else if (selectedFolder === 'physics') matchesFolder = s.includes('physic') || s.includes('فيزياء');
      else if (selectedFolder === 'bio') matchesFolder = s.includes('bio') || s.includes('أحياء') || s.includes('احياء');
      else if (selectedFolder === 'chem') matchesFolder = s.includes('chem') || s.includes('كيمياء');
      else if (selectedFolder === 'english') matchesFolder = s.includes('eng') || s.includes('إنجليزي') || s.includes('انجليزي');
      else matchesFolder = s.includes(selectedFolder);
    }

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      l.title.toLowerCase().includes(q) ||
      (l.subtitle && l.subtitle.toLowerCase().includes(q)) ||
      (l.subject && l.subject.toLowerCase().includes(q)) ||
      (l.authorOrCourse && l.authorOrCourse.toLowerCase().includes(q));

    return matchesFolder && matchesSearch;
  });

  const getSubjectStyle = (subject?: string) => {
    if (!subject || !SUBJECT_THEMES[subject]) {
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200/60',
        darkBg: 'dark:bg-blue-950/40',
        darkText: 'dark:text-blue-300',
        darkBorder: 'dark:border-blue-800/50'
      };
    }
    return SUBJECT_THEMES[subject];
  };

  const currentFolderObj = FOLDER_ITEMS.find(f => f.id === selectedFolder) || FOLDER_ITEMS[0];
  const currentFolderName = t(currentFolderObj.key, currentFolderObj.defaultLabel);
  const displayName = currentUser?.displayName || userProfile?.displayName || t('home.welcomeStudent', 'طالب متميز');

  return (
    <div dir={dir} className="min-h-screen bg-[#FBFBFC] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-[#0F172A] selection:text-white dark:selection:bg-blue-600 transition-colors duration-200">

      {/* ─── الهيدر الممتد النظيف (بدون تبويبات منفصلة) ───────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 transition-colors duration-200">
        <div className="w-full px-6 sm:px-8 xl:px-12 h-16 flex items-center justify-between gap-4">

          {/* اللوجو والاسم الأكاديمي */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] dark:bg-blue-600 flex items-center justify-center text-white shadow-sm ring-1 ring-black/5">
              <GraduationCap className="w-5 h-5 text-blue-400 dark:text-white" />
            </div>
            <div className={`flex flex-col ${isAr ? 'text-right' : 'text-left'}`}>
              <span className="text-base font-bold tracking-wider text-[#0F172A] dark:text-white font-serif uppercase">
                {t('app.title', 'ATTOCUS')}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                {t('app.subtitle', 'المنصة الأكاديمية الذكية')}
              </span>
            </div>
          </div>

          {/* أدوات التحكم: مبدل اللغة + الوضع الداكن + تسجيل الدخول / الملف الشخصي */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* مبدل اللغة AR / EN */}
            <LanguageSelector />

            {/* مبدل الوضع الداكن */}
            <ThemeToggle />

            {/* زر الحساب أو تسجيل الدخول */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="user-profile-btn"
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors border border-slate-200/50 dark:border-slate-700"
                >
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#0F172A] dark:bg-blue-600 text-white text-[11px] font-semibold flex items-center justify-center">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                    {displayName.split(' ')[0]}
                  </span>
                </button>
                <button
                  type="button"
                  id="logout-btn"
                  onClick={() => logout()}
                  title={t('nav.logout', 'تسجيل الخروج')}
                  className="p-2 rounded-xl text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="login-btn"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-300 dark:text-white" />
                <span>{t('nav.login', 'تسجيل الدخول')}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── الحاوية الموحدة لجميع المحتوى (Home + Study Content مدمجة) ── */}
      <main className="flex-1 w-full px-6 sm:px-8 xl:px-12 py-8 space-y-8 animate-in fade-in duration-200">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 1. البانر العلوي الترحيبي وبطاقات الإحصائيات (مثل تطبيق iOS) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs transition-colors duration-200">
          <div className={`space-y-1.5 ${isAr ? 'text-right' : 'text-left'}`}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white font-serif">
              {t('home.welcome', 'مرحباً بك، {name} 👋').replace('{name}', displayName.split(' ')[0])}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal max-w-xl">
              {t('home.bannerDesc', 'استأنف جلساتك واستمر في مراكمة ساعات التركيز والتقدم الأكاديمي.')}
            </p>
          </div>

          {/* بطاقات الإحصائيات والشخصيات والستريك المطابقة لتطبيق iOS */}
          <div className="flex items-center flex-wrap gap-3">
            {/* بطاقة الستريك المشتعل */}
            <button
              type="button"
              id="open-streak-btn"
              onClick={() => setStreakModalOpen(true)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/25 hover:border-orange-500/50 hover:bg-orange-500/15 transition-all text-start group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center shadow-sm shadow-orange-500/30 shrink-0">
                <Flame className="w-4 h-4 fill-white" />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <span className="block text-xs font-black text-orange-600 dark:text-orange-400 font-mono leading-tight">
                  {t('home.streakDays', '{count} أيام').replace('{count}', String(currentStreak))}
                </span>
                <span className="text-[10px] text-orange-600/80 dark:text-orange-400/80 font-bold">
                  {t('home.streakActive', 'ستريك مشتعل 🔥')}
                </span>
              </div>
            </button>

            {/* بطاقة متجر الشخصيات */}
            <button
              type="button"
              id="open-shop-btn"
              onClick={() => setShopModalOpen(true)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/25 hover:border-purple-500/50 hover:bg-purple-500/15 transition-all text-start group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-purple-500/30 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <span className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {t('home.avatarShop', 'متجر الشخصيات')}
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                  {t('home.spendPoints', 'استبدال النقاط')}
                </span>
              </div>
            </button>

            {/* بطاقة رصيد نقاط التركيز وسجل النقاط */}
            <button
              type="button"
              id="open-points-history-btn"
              onClick={() => setPointsModalOpen(true)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/15 transition-all text-start group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 shrink-0">
                <Sparkles className="w-4 h-4 text-blue-200" />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <span className="block text-xs font-bold text-slate-900 dark:text-white font-mono leading-tight">
                  {totalFocusPoints}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  {t('home.pointsHistory', 'سجل النقاط')}
                </span>
              </div>
            </button>

            {/* بطاقة الأسئلة المجدولة والتكرار المتباعد */}
            <button
              type="button"
              id="open-scheduled-reviews-btn"
              onClick={() => setScheduledReviewsModalOpen(true)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/15 transition-all text-start group active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30 shrink-0">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <span className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {t('home.scheduledReviews', 'مراجعات مجدولة')}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {t('home.spacedRepetition', 'تكرار متباعد')}
                </span>
              </div>
            </button>

            {/* بطاقة ساعات المذاكرة */}
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <span className="block text-xs font-bold text-slate-900 dark:text-white font-mono leading-tight">
                  {formatTime(todayMinutesStudied)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {t('home.studyHours', 'ساعات المذاكرة')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 2. رف المقررات والمجلدات الدراسية (مثل Folders Shelf في iOS)  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <div className={`flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 ${isAr ? 'justify-start' : 'justify-start'}`}>
            <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('home.coursesAndFolders', 'المقررات والمجلدات الدراسية')}</span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
            {FOLDER_ITEMS.map(folder => {
              const active = selectedFolder === folder.id;
              const count = getLectureCountForFolder(folder.id);
              const label = t(folder.key, folder.defaultLabel);
              const IconComp = folder.icon;

              return (
                <button
                  key={folder.id}
                  type="button"
                  id={`folder-filter-${folder.id}`}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                    active
                      ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-white border-2 shadow-sm'
                      : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                  style={{
                    borderColor: active ? folder.color : undefined
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${folder.color}20`,
                      color: folder.color
                    }}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                  </div>

                  <span>{label}</span>

                  <span
                    className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: active ? `${folder.color}25` : 'rgba(148, 163, 184, 0.15)',
                      color: active ? folder.color : undefined
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3. شريط البحث السريع وزر رفع الملفات (Search & Action Bar)  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* عنوان القسم والمجلد المختار */}
            <div className={`space-y-1 ${isAr ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 ${isAr ? 'flex-row' : 'flex-row'}`}>
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: currentFolderObj.color }}
                />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {currentFolderName}
                </h2>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-400">
                {t('home.docsCount', 'المستندات والمحاضرات الدراسية ({count} مستند)').replace('{count}', String(filteredLectures.length))}
              </p>
            </div>

            {/* أدوات البحث وزر الرفع المباشر */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* حقل البحث المتوافق تماماً مع LTR و RTL */}
              <div className="relative flex-1 md:w-80">
                <Search
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none ${
                    isAr ? 'right-3.5' : 'left-3.5'
                  }`}
                />
                <input
                  type="text"
                  id="main-lectures-search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={
                    selectedFolder === 'all'
                      ? t('home.searchPlaceholder', 'ابحث في المواد، المحاضرات والملاحظات...')
                      : t('home.searchInFolder', 'ابحث في ملفات ومفاهيم {folder}...').replace('{folder}', currentFolderName)
                  }
                  className={`w-full py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all ${
                    isAr ? 'pr-10 pl-9 text-right' : 'pl-10 pr-9 text-left'
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className={`absolute top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${
                      isAr ? 'left-2.5' : 'right-2.5'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* زر رفع ملف جديد بجانب البحث مباشرة كما في iOS */}
              <button
                type="button"
                id="quick-upload-doc-btn"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{t('home.uploadNewDoc', 'رفع مستند جديد')}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 4. شبكة بطاقات المحاضرات (Lecture Cards Grid مطابقة للتطبيق)  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          {filteredLectures.length === 0 ? (
            /* حالة لا توجد ملفات (Empty State) */
            <div className="py-20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col items-center justify-center text-center p-8 space-y-4 shadow-xs">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: `${currentFolderObj.color}15`,
                  color: currentFolderObj.color
                }}
              >
                <FileText className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {selectedFolder === 'all'
                    ? t('home.noLecturesTitle', 'لا توجد محاضرات')
                    : t('home.noDocsInFolder', 'لا توجد مستندات في مادة "{folder}"').replace('{folder}', currentFolderName)}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  {selectedFolder === 'all'
                    ? t('home.noLecturesDesc', 'ارفع ملف PDF الآن للبدء في القراءة والتلخيص التفاعلي وحل الاختبارات.')
                    : t('home.noDocsInFolderDesc', 'يمكنك رفع ملف PDF أو مستند نصي جديد لإضافته فورياً لهذه المادة.')}
                </p>
              </div>
              <button
                type="button"
                id="empty-state-upload-btn"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {selectedFolder === 'all'
                    ? t('home.uploadNewDoc', 'رفع مستند جديد')
                    : t('home.uploadFirstDoc', 'رفع أول مستند في {folder}').replace('{folder}', currentFolderName)}
                </span>
              </button>
            </div>
          ) : (
            /* شبكة البطاقات - تصميم متناسق تماماً مع iOS LectureCardView */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredLectures.map(lecture => {
                const isActive = lecture.id === activeLectureId;
                const badgeStyle = getSubjectStyle(lecture.subject);
                const progress = lecture.totalPages > 0 ? (lecture.currentPage / lecture.totalPages) : 0;
                const percent = Math.round(progress * 100);
                const firstSlideTopic = lecture.slides?.[0]?.topic || lecture.subject || t('home.general', 'عام');

                return (
                  <div
                    key={lecture.id}
                    id={`lecture-card-${lecture.id}`}
                    onClick={() => onSelectLecture(lecture.id)}
                    className={`group relative flex flex-col justify-between p-5 min-h-[220px] rounded-3xl bg-white dark:bg-[#111827] border transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                      isActive
                        ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/20 dark:ring-blue-500/20 shadow-md'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* الصف العلوي: أيقونة المستند + شارة الصفحات + زر الحذف */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        {/* أيقونة المستند المربعة المطابقة لـ iOS */}
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                          <FileText className="w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* شارة عدد الصفحات */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-medium font-mono">
                            <Layers className="w-3.5 h-3.5" />
                            <span>
                              {t('home.pagesCount', '{count} صفحة').replace('{count}', String(lecture.totalPages))}
                            </span>
                          </div>

                          {/* مؤشر المستند النشط */}
                          {isActive && (
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800">
                              {t('home.current', 'الحالي')}
                            </span>
                          )}

                          {/* زر الحذف الخفي حتى يتم تمرير الماوس */}
                          <button
                            type="button"
                            id={`delete-lecture-btn-${lecture.id}`}
                            onClick={e => handleDeleteClick(e, lecture.id, lecture.title)}
                            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors opacity-0 group-hover:opacity-100"
                            title={t('home.delete', 'حذف')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* نصوص العنوان والمؤلف - متوافقة LTR في الإنجليزي و RTL في العربي */}
                      <div className={`space-y-1.5 ${isAr ? 'text-right' : 'text-left'}`}>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                          {lecture.title}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-400 line-clamp-2">
                          {lecture.authorOrCourse || lecture.subtitle || t('home.noDetailsDoc', 'مستند بدون تفاصيل إضافية')}
                        </p>
                      </div>
                    </div>

                    {/* الصف السفلي: شريحة الموضوع + شريط التقدم + سهم الانتقال */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {/* رقاقة المفاهيم والموضوع (📌 Concept Chip كما في iOS) */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-medium max-w-[70%] truncate">
                          <span>📌</span>
                          <span className="truncate">{firstSlideTopic}</span>
                        </div>

                        {/* سهم الانتقال - يتجه لليمين في الإنجليزي ولليسار في العربي */}
                        <div className="text-blue-600 dark:text-blue-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                          <ChevronRight className={`w-4 h-4 ${isAr ? 'rotate-180' : 'rotate-0'}`} />
                        </div>
                      </div>

                      {/* شريط الإنجاز والصفحات */}
                      <div className="space-y-1.5">
                        <div className={`flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400 ${isAr ? 'text-right' : 'text-left'}`}>
                          <span>
                            {t('home.pageOf', 'صفحة {current} من {total}')
                              .replace('{current}', String(lecture.currentPage))
                              .replace('{total}', String(lecture.totalPages))}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{percent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ─── الفوتر الأكاديمي الشامل ───────────────────────────── */}
      <footer className="mt-36 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0b0f19] transition-colors duration-200">
        <div className="w-full px-6 sm:px-8 xl:px-12 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-100 dark:border-slate-800/80">

            {/* نبذة وشعار آبل الرسمي */}
            <div className={`lg:col-span-2 space-y-4 ${isAr ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-3 ${isAr ? 'justify-start' : 'justify-start'}`}>
                <div className="w-9 h-9 rounded-xl bg-[#0F172A] dark:bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <GraduationCap className="w-5 h-5 text-blue-400 dark:text-white" />
                </div>
                <span className="text-base font-bold tracking-wider text-[#0F172A] dark:text-white font-serif uppercase">
                  {t('app.title', 'ATTOCUS')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                {t('footer.desc', 'منصة المذاكرة والتركيز الذكية المدعومة بالذكاء الاصطناعي، مصممة لمساعدتك على استيعاب المحاضرات، إدارة الوقت، ومتابعة إنجازك الأكاديمي بسلاسة.')}
              </p>

              {/* زر App Store النظيف بتصميم آبل المعتمد */}
              <div className="pt-2">
                <a
                  href="#download-ios"
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-black dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white transition-all shadow-sm active:scale-95 group border border-slate-800 dark:border-slate-700"
                >
                  <svg className="w-6 h-6 fill-white shrink-0" viewBox="0 0 384 512">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                  </svg>
                  <div className={`flex flex-col ${isAr ? 'text-right' : 'text-left'}`}>
                    <span className="text-[9px] text-slate-400 leading-none">{t('footer.availableOn', 'متاح على')}</span>
                    <span className="text-sm font-semibold tracking-tight leading-snug">App Store</span>
                  </div>
                </a>
              </div>
            </div>

            {/* المنصة */}
            <div className={`space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-white tracking-wider uppercase">
                {t('footer.platform', 'المنصة')}
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.featuresTitle', 'المميزات والخصائص')}</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.pricingTitle', 'الباقات الأكاديمية')}</a></li>
                <li><a href="#updates" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.updatesTitle', 'تحديثات المنصة')}</a></li>
              </ul>
            </div>

            {/* عن Attocus */}
            <div className={`space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-white tracking-wider uppercase">
                {t('footer.aboutAttocus', 'عن Attocus')}
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <li><a href="#about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.aboutTitle', 'من نحن (About Us)')}</a></li>
                <li><a href="#developers" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.developersTitle', 'المطورون')}</a></li>
                <li><a href="#contact" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.contactTitle', 'تواصل معنا والدعم الفني')}</a></li>
              </ul>
            </div>

            {/* القانونية والسياسات */}
            <div className={`space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
              <h4 className="text-xs font-bold text-[#0F172A] dark:text-white tracking-wider uppercase">
                {t('footer.legal', 'القانونية والسياسات')}
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <li><a href="#privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.privacyTitle', 'سياسة الخصوصية')}</a></li>
                <li><a href="#terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.termsTitle', 'شروط الاستخدام')}</a></li>
                <li><a href="#security" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.securityTitle', 'أمان وحماية البيانات')}</a></li>
                <li><a href="#cookies" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{t('footer.cookiesTitle', 'إعدادات ملفات الارتباط')}</a></li>
              </ul>
            </div>
          </div>

          <div className={`pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500 ${isAr ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0F172A] dark:text-slate-300 tracking-wider font-serif">ATTOCUS</span>
              <span>&copy; {new Date().getFullYear()} {t('footer.rights', 'جميع الحقوق محفوظة. صُمم لدعم الطلاب والباحثين.')}</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              {t('footer.trademarks', 'جميع العلامات التجارية وحقوق النشر محفوظة لمنصة Attocus.')}
            </div>
          </div>
        </div>
      </footer>

      {/* ─── مودال تأكيد الحذف ─────────────────────────────────── */}
      {pendingDeleteLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className={`space-y-1 ${isAr ? 'text-right' : 'text-left'}`}>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('modal.deleteTitle', 'حذف المستند نهائياً؟')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('modal.deleteDesc', 'هل أنت متأكد من حذف "{title}"؟ ستفقد الملاحظات وسجل التقدم المسجل لهذا المستند.').replace('{title}', pendingDeleteLecture.title)}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                id="cancel-delete-lecture-btn"
                onClick={() => setPendingDeleteLecture(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                {t('modal.cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                id="confirm-delete-lecture-btn"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm"
              >
                {t('modal.confirmDelete', 'تأكيد الحذف')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* المودالات المساعدة */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onLectureCreated={onUploadLecture}
      />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <StreakModal isOpen={streakModalOpen} onClose={() => setStreakModalOpen(false)} currentStreak={currentStreak} />
      <ShopModal isOpen={shopModalOpen} onClose={() => setShopModalOpen(false)} focusPoints={totalFocusPoints} />
      <PointsHistoryModal
        isOpen={pointsModalOpen}
        onClose={() => setPointsModalOpen(false)}
        totalPoints={totalFocusPoints}
      />
      <ScheduledReviewsModal
        isOpen={scheduledReviewsModalOpen}
        onClose={() => setScheduledReviewsModalOpen(false)}
      />
    </div>
  );
};