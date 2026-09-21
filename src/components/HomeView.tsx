import React, { useState } from 'react';
import { Lecture } from '../types';
import {
  Plus, Trash2, LogIn, LogOut, Search,
  FileText, Clock, Sparkles, Flame, GraduationCap,
  BookOpen, Home as HomeIcon, ChevronRight, ArrowLeft, ArrowRight
} from 'lucide-react';
import { UploadModal } from './UploadModal';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { StreakModal } from './StreakModal';
import { ShopModal } from './ShopModal';
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

const FOLDER_ITEMS = [
  { id: 'all', key: 'folder.all', defaultLabel: 'جميع المواد' },
  { id: 'math', key: 'folder.math', defaultLabel: 'الرياضيات' },
  { id: 'physics', key: 'folder.physics', defaultLabel: 'الفيزياء' },
  { id: 'cs', key: 'folder.cs', defaultLabel: 'علوم الحاسب' },
  { id: 'bio', key: 'folder.bio', defaultLabel: 'الأحياء' },
  { id: 'chem', key: 'folder.chem', defaultLabel: 'الكيمياء' },
  { id: 'english', key: 'folder.english', defaultLabel: 'اللغة الإنجليزية' },
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

  const [currentTab, setCurrentTab] = useState<'home' | 'content'>('home');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [pendingDeleteLecture, setPendingDeleteLecture] = useState<{ id: string; title: string } | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredLectures = lectures.filter(l => {
    const matchesFolder = selectedFolder === 'all' || (l.subject?.toLowerCase().includes(selectedFolder));
    const matchesSearch = !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const getSubjectStyle = (subject?: string) => {
    if (!subject || !SUBJECT_THEMES[subject]) {
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200/60',
        darkBg: 'dark:bg-slate-800/80',
        darkText: 'dark:text-slate-200',
        darkBorder: 'dark:border-slate-700'
      };
    }
    return SUBJECT_THEMES[subject];
  };

  const displayName = currentUser?.displayName || userProfile?.displayName || t('home.welcomeStudent', 'طالب متميز');

  return (
    <div dir={dir} className="min-h-screen bg-[#FBFBFC] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-[#0F172A] selection:text-white dark:selection:bg-blue-600 transition-colors duration-200">

      {/* ─── الهيدر الممتد ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 transition-colors duration-200">
        <div className="w-full px-6 sm:px-8 xl:px-12 h-16 flex items-center justify-between gap-4">

          {/* اللوجو والاسم */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] dark:bg-blue-600 flex items-center justify-center text-white shadow-sm ring-1 ring-black/5">
              <GraduationCap className="w-5 h-5 text-blue-400 dark:text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-wider text-[#0F172A] dark:text-white font-serif uppercase">
                {t('app.title', 'ATTOCUS')}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                {t('app.subtitle', 'المنصة الأكاديمية الذكية')}
              </span>
            </div>
          </div>

          {/* تبويبات التنقل الرئيسية (الرئيسية | المحتوى الدراسي) */}
          <nav className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700">
            <button
              type="button"
              id="nav-tab-home"
              onClick={() => setCurrentTab('home')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'home'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span>{t('nav.home', 'الرئيسية')}</span>
            </button>

            <button
              type="button"
              id="nav-tab-content"
              onClick={() => setCurrentTab('content')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'content'
                  ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('nav.studyContent', 'المحتوى الدراسي')}</span>
              {lectures.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold">
                  {lectures.length}
                </span>
              )}
            </button>
          </nav>

          {/* أدوات التحكم: اللغة + الثيم + الحساب */}
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

      {/* ─── الحاوية الرئيسية ───────────────────────────────────── */}
      <main className="flex-1 min-h-[78vh] w-full px-6 sm:px-8 xl:px-12 py-8 space-y-8">

        {/* ═════════════════════════════════════════════════════════ */}
        {/* التبويب 1: الصفحة الرئيسية (Home)                          */}
        {/* يحتوي على البانر، الإحصائيات، وزر رفع ملف PDF             */}
        {/* ═════════════════════════════════════════════════════════ */}
        {currentTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* البانر العلوي والترحيب */}
            <section className="bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm transition-colors duration-200">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white">
                  {t('home.welcome', 'مرحباً بك، {name} 👋').replace('{name}', displayName.split(' ')[0])}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-normal">
                  {t('home.bannerDesc', 'استأنف جلساتك واستمر في مراكمة ساعات التركيز والتقدم الأكاديمي.')}
                </p>
              </div>

              {/* بطاقات الإحصائيات التفاعلية */}
              <div className="flex items-center flex-wrap gap-3.5">
                <button
                  type="button"
                  id="open-streak-btn"
                  onClick={() => setStreakModalOpen(true)}
                  className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition-all text-start"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Flame className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white leading-none">
                      {t('home.streakDays', '{count} أيام').replace('{count}', String(currentStreak))}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                      {t('home.streak', 'الاستمرار اليومي')}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  id="open-shop-btn"
                  onClick={() => setShopModalOpen(true)}
                  className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition-all text-start"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white leading-none">
                      {totalFocusPoints}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                      {t('home.focusPoints', 'نقاط التركيز')}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700">
                  <div className="w-9 h-9 rounded-xl bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-start">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white leading-none">
                      {formatTime(todayMinutesStudied)}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                      {t('home.todayAchievement', 'إنجاز اليوم')}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* بطاقة رفع ملف PDF الرئيسية (حصرية في الصفحة الرئيسية فقط) */}
            <section className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 dark:from-[#111827] dark:via-[#131b2e] dark:to-[#0f172a] border border-blue-100/80 dark:border-blue-900/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                  <Plus className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-[#0F172A] dark:text-white">
                    {t('home.uploadPdf', 'رفع ملف PDF جديد')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                    {isAr
                      ? 'ارفع شرائح المحاضرات (PDF) للبدء في القراءة التفاعلية، التحليل الذكي، وتوليد الأسئلة الفورية.'
                      : 'Upload lecture slides (PDF) to start interactive reading, intelligent analysis, and instant quizzes.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="home-primary-upload-btn"
                onClick={() => setUploadModalOpen(true)}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{t('home.uploadPdf', 'رفع ملف PDF جديد')}</span>
              </button>
            </section>

            {/* نظرة سريعة على المواد المحملة مؤخراً */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isAr ? 'المحاضرات والمستندات الحالية' : 'Current Lectures & Documents'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
                    {isAr ? 'يمكنك متابعة المذاكرة من هنا أو استعراض كافة المواد في تبويب المحتوى الدراسي' : 'Resume studying or browse all materials in the Study Content tab'}
                  </p>
                </div>

                <button
                  type="button"
                  id="switch-to-content-btn"
                  onClick={() => setCurrentTab('content')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>{t('nav.studyContent', 'المحتوى الدراسي')}</span>
                  {isAr ? <ChevronRight className="w-4 h-4 rotate-180" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {lectures.length === 0 ? (
                <div className="py-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col items-center justify-center text-center p-6 space-y-4 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400">
                    <FileText className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {isAr ? 'لا توجد مستندات بعد' : 'No documents yet'}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                      {t('home.noLecturesDesc', 'ارفع ملف PDF الآن للبدء في القراءة والتلخيص التفاعلي وحل الاختبارات.')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('home.uploadNewDoc', 'رفع مستند جديد')}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {lectures.slice(0, 4).map(lecture => {
                    const isActive = lecture.id === activeLectureId;
                    const badgeStyle = getSubjectStyle(lecture.subject);
                    const progress = lecture.totalPages > 0 ? (lecture.currentPage / lecture.totalPages) : 0;
                    const percent = Math.round(progress * 100);

                    return (
                      <div
                        key={lecture.id}
                        onClick={() => onSelectLecture(lecture.id)}
                        className={`group relative flex flex-col justify-between p-5 min-h-[200px] rounded-3xl bg-white dark:bg-[#111827] border transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
                          isActive
                            ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/20 dark:ring-blue-500/20 shadow-md'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} ${badgeStyle.darkBg} ${badgeStyle.darkText} ${badgeStyle.darkBorder}`}>
                              {lecture.subject || t('home.general', 'عام')}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">
                                {t('home.current', 'الحالي')}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                            {lecture.title}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-slate-400 truncate mt-1">
                            {lecture.authorOrCourse || t('home.noDetailsDoc', 'مستند بدون تفاصيل إضافية')}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400">
                            <span>
                              {t('home.pageOf', 'صفحة {current} من {total}')
                                .replace('{current}', String(lecture.currentPage))
                                .replace('{total}', String(lecture.totalPages))}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#0F172A] dark:bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* التبويب 2: صفحة المحتوى الدراسي (Study Content)            */}
        {/* حسب متطلب المستخدم: لا يوجد أي زر رفع ملف هنا على الإطلاق  */}
        {/* تُعرض الملفات المحملة بشكل طبيعي مع تصنيفاتها والبحث      */}
        {/* ═════════════════════════════════════════════════════════ */}
        {currentTab === 'content' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* ترويسة صفحة المحتوى وشريط البحث والتصنيف */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200/70 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5 transition-colors duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">
                    {t('nav.studyContent', 'المحتوى الدراسي')}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                    {isAr
                      ? 'استعرض جميع مذكراتك وشرائحك المحملة مع نسب الإنجاز والملاحظات'
                      : 'Browse all your uploaded lectures and slides with completion rates and notes'}
                  </p>
                </div>

                {/* حقل البحث داخل المحتوى الدراسي */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    id="content-search-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('home.searchPlaceholder', 'ابحث في المواد، المحاضرات والملاحظات...')}
                    className="w-full pl-4 pr-10 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-transparent dark:border-slate-700 focus:border-slate-300 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* شريط التصنيفات والمواد (بدون أي زر رفع ملف) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
                {FOLDER_ITEMS.map(folder => {
                  const active = selectedFolder === folder.id;
                  const label = t(folder.key, folder.defaultLabel);
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      id={`folder-btn-${folder.id}`}
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                        active
                          ? 'bg-[#0F172A] dark:bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── شبكة بطاقات الملفات داخل المحتوى الدراسي ─────── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-400 font-medium px-1">
                <span>
                  {t('home.availableFiles', 'الملفات المتاحة ({count})').replace('{count}', String(filteredLectures.length))}
                </span>
                {selectedFolder !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedFolder('all')}
                    className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {t('home.viewAllSubjects', 'عرض كل المواد')}
                  </button>
                )}
              </div>

              {filteredLectures.length === 0 ? (
                <div className="py-24 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col items-center justify-center text-center p-6 space-y-4 shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400">
                    <FileText className="w-7 h-7 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {t('home.noLecturesTitle', 'لا توجد محاضرات في هذا القسم')}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
                      {isAr
                        ? 'يمكنك إضافة محاضرات جديدة بالانتقال إلى الصفحة الرئيسية واستخدام خيار رفع ملف PDF.'
                        : 'You can add new lectures by navigating to the Home page and uploading a PDF.'}
                    </p>
                  </div>
                  {/* زر ينقل إلى الصفحة الرئيسية بدون زر رفع مباشر في صفحة المحتوى */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('home')}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] dark:hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    <HomeIcon className="w-4 h-4" />
                    <span>{isAr ? 'الذهاب إلى الصفحة الرئيسية' : 'Go to Home Page'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredLectures.map(lecture => {
                    const isActive = lecture.id === activeLectureId;
                    const badgeStyle = getSubjectStyle(lecture.subject);
                    const progress = lecture.totalPages > 0 ? (lecture.currentPage / lecture.totalPages) : 0;
                    const percent = Math.round(progress * 100);

                    return (
                      <div
                        key={lecture.id}
                        id={`file-card-${lecture.id}`}
                        onClick={() => onSelectLecture(lecture.id)}
                        className={`group relative flex flex-col justify-between p-6 min-h-[220px] rounded-3xl bg-white dark:bg-[#111827] border transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                          isActive
                            ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/20 dark:ring-blue-500/20 shadow-md'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <span className={`text-[11px] font-semibold px-3 py-1 rounded-lg border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} ${badgeStyle.darkBg} ${badgeStyle.darkText} ${badgeStyle.darkBorder}`}>
                              {lecture.subject || t('home.general', 'عام')}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {isActive && (
                                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-800">
                                  {t('home.current', 'الحالي')}
                                </span>
                              )}
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

                          <div className="space-y-1.5">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                              {lecture.title}
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-400 truncate">
                              {lecture.authorOrCourse || t('home.noDetailsDoc', 'مستند بدون تفاصيل إضافية')}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-400">
                            <span>
                              {t('home.pageOf', 'صفحة {current} من {total}')
                                .replace('{current}', String(lecture.currentPage))
                                .replace('{total}', String(lecture.totalPages))}
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{percent}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#0F172A] dark:bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* ─── الفوتر المنزّل بمسافة عميقة (لا يظهر إلا عند السكرول) ─── */}
      <footer className="mt-36 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0b0f19] transition-colors duration-200">
        <div className="w-full px-6 sm:px-8 xl:px-12 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-100 dark:border-slate-800/80">

            {/* نبذة وشعار آبل الرسمي */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
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
                  <div className="text-start flex flex-col">
                    <span className="text-[9px] text-slate-400 leading-none">{t('footer.availableOn', 'متاح على')}</span>
                    <span className="text-sm font-semibold tracking-tight leading-snug">App Store</span>
                  </div>
                </a>
              </div>
            </div>

            {/* المنصة */}
            <div className="space-y-3">
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
            <div className="space-y-3">
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
            <div className="space-y-3">
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

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
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

            <div className="space-y-1">
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
    </div>
  );
};