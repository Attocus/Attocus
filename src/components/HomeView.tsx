import React, { useState } from 'react';
import { Lecture } from '../types';
import {
  Plus, Trash2, LogIn, LogOut, Search,
  FileText, Clock, Sparkles, Flame, GraduationCap
} from 'lucide-react';
import { UploadModal } from './UploadModal';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { StreakModal } from './StreakModal';
import { ShopModal } from './ShopModal';

interface HomeViewProps {
  lectures: Lecture[];
  activeLectureId: string;
  onSelectLecture: (lectureId: string) => void;
  onUploadLecture: (lecture: Lecture) => void;
  onDeleteLecture: (lectureId: string) => void;
  totalFocusPoints: number;
  todayMinutesStudied: number;
}

const DEFAULT_FOLDERS = [
  { id: 'all', label: 'جميع المواد' },
  { id: 'math', label: 'الرياضيات' },
  { id: 'physics', label: 'الفيزياء' },
  { id: 'cs', label: 'علوم الحاسب' },
  { id: 'bio', label: 'الأحياء' },
  { id: 'chem', label: 'الكيمياء' },
];

const SUBJECT_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  'Mathematics': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/60' },
  'Physics': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/60' },
  'Computer Science': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' },
  'Biology': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/60' },
  'Chemistry': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/60' },
  'English': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/60' },
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
    if (totalMins < 60) return `${totalMins} دقيقة`;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs} س ${mins} د` : `${hrs} ساعة`;
  };

  const filteredLectures = lectures.filter(l => {
    const matchesFolder = selectedFolder === 'all' || (l.subject?.toLowerCase().includes(selectedFolder));
    const matchesSearch = !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const getSubjectStyle = (subject?: string) => {
    if (!subject) return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200/60' };
    return SUBJECT_THEMES[subject] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200/60' };
  };

  const displayName = currentUser?.displayName || userProfile?.displayName || 'طالب متميز';

  return (
    <div dir="rtl" className="min-h-screen bg-[#FBFBFC] text-slate-900 flex flex-col font-sans antialiased selection:bg-[#0F172A] selection:text-white">

      {/* ─── الهيدر الممتد ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="w-full px-8 xl:px-12 h-16 flex items-center justify-between gap-6">

          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] flex items-center justify-center text-white shadow-sm ring-1 ring-black/5">
              <GraduationCap className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-wider text-[#0F172A] font-serif uppercase">
                ATTOCUS
              </span>
              <span className="text-[11px] text-slate-400 font-medium">المنصة الأكاديمية الذكية</span>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث في المواد، المحاضرات والملاحظات..."
                className="w-full pl-4 pr-10 py-2 rounded-xl bg-slate-100/70 border border-transparent focus:border-slate-300 focus:bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/60 transition-colors border border-slate-200/50"
                >
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-[11px] font-semibold flex items-center justify-center">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">
                    {displayName.split(' ')[0]}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  title="تسجيل الخروج"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
              >
                <LogIn className="w-4 h-4 text-blue-300" />
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── الحاوية الرئيسية (مع min-h لمنع الفوتر من الالتصاق) ───── */}
      <main className="flex-1 min-h-[78vh] w-full px-8 xl:px-12 py-8 space-y-8">

        {/* البانر العلوي */}
        <section className="bg-white border border-slate-200/70 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">
              مرحباً بك، {displayName.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 font-normal">
              استأنف جلساتك واستمر في مراكمة ساعات التركيز والتقدم الأكاديمي.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3.5">
            <button
              type="button"
              onClick={() => setStreakModalOpen(true)}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100/70 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div className="text-right">
                <span className="block text-sm font-bold text-slate-900 leading-none">{currentStreak} أيام</span>
                <span className="text-[11px] text-slate-400 font-medium">الاستمرار اليومي</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShopModalOpen(true)}
              className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100/70 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="block text-sm font-bold text-slate-900 leading-none">{totalFocusPoints}</span>
                <span className="text-[11px] text-slate-400 font-medium">نقاط التركيز</span>
              </div>
            </button>

            <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/60">
              <div className="w-9 h-9 rounded-xl bg-slate-200/60 text-slate-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="block text-sm font-bold text-slate-900 leading-none">{formatTime(todayMinutesStudied)}</span>
                <span className="text-[11px] text-slate-400 font-medium">إنجاز اليوم</span>
              </div>
            </div>
          </div>
        </section>

        {/* شريط التصنيفات وزر الرفع */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {DEFAULT_FOLDERS.map(folder => {
              const active = selectedFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${active
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100/70 hover:text-slate-900'
                    }`}
                >
                  {folder.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            رفع ملف PDF جديد
          </button>
        </section>

        {/* ─── شبكة البطاقات ────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
            <span>الملفات المتاحة ({filteredLectures.length})</span>
            {selectedFolder !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedFolder('all')}
                className="hover:text-blue-600 transition-colors"
              >
                عرض كل المواد
              </button>
            )}
          </div>

          {filteredLectures.length === 0 ? (
            <div className="py-24 rounded-3xl border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center p-6 space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <FileText className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">لا توجد محاضرات في هذا القسم</h3>
                <p className="text-xs text-slate-400 max-w-sm">ارفع ملف PDF الآن للبدء في القراءة والتلخيص التفاعلي وحل الاختبارات.</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                رفع مستند جديد
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
                    onClick={() => onSelectLecture(lecture.id)}
                    className={`group relative flex flex-col justify-between p-6 min-h-[220px] rounded-3xl bg-white border transition-all duration-200 cursor-pointer hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 ${isActive
                        ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-md'
                        : 'border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)]'
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className={`text-[11px] font-semibold px-3 py-1 rounded-lg border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                          {lecture.subject || 'عام'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                              الحالي
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={e => handleDeleteClick(e, lecture.id, lecture.title)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                          {lecture.title}
                        </h4>
                        <p className="text-xs text-slate-400 truncate">
                          {lecture.authorOrCourse || 'مستند بدون تفاصيل إضافية'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>صفحة {lecture.currentPage} من {lecture.totalPages}</span>
                        <span className="font-semibold text-slate-700">{percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0F172A] rounded-full transition-all duration-300"
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
      </main>

      {/* ─── الفوتر المنزّل بمسافة عميقة (لا يظهر إلا عند السكرول) ─── */}
      <footer className="mt-36 border-t border-slate-200/80 bg-white">
        <div className="w-full px-8 xl:px-12 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-100">

            {/* نبذة وشعار آبل الرسمي */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center text-white shadow-sm">
                  <GraduationCap className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-base font-bold tracking-wider text-[#0F172A] font-serif uppercase">
                  ATTOCUS
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                منصة المذاكرة والتركيز الذكية المدعومة بالذكاء الاصطناعي، مصممة لمساعدتك على استيعاب المحاضرات، إدارة الوقت، ومتابعة إنجازك الأكاديمي بسلاسة.
              </p>

              {/* زر App Store النظيف بتصميم آبل المعتمد */}
              <div className="pt-2">
                <a
                  href="#download-ios"
                  className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-black hover:bg-slate-900 text-white transition-all shadow-sm active:scale-95 group border border-slate-800"
                >
                  <svg className="w-6 h-6 fill-white shrink-0" viewBox="0 0 384 512">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                  </svg>
                  <div className="text-right flex flex-col">
                    <span className="text-[9px] text-slate-400 leading-none">متاح على</span>
                    <span className="text-sm font-semibold tracking-tight leading-snug">App Store</span>
                  </div>
                </a>
              </div>
            </div>

            {/* المنصة */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">المنصة</h4>
              <ul className="space-y-2.5 text-xs text-slate-500 font-medium">
                <li><a href="#features" className="hover:text-blue-600 transition-colors">المميزات والخصائص</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 transition-colors">الباقات الأكاديمية</a></li>
                <li><a href="#updates" className="hover:text-blue-600 transition-colors">تحديثات المنصة</a></li>
              </ul>
            </div>

            {/* عن Attocus */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">عن Attocus</h4>
              <ul className="space-y-2.5 text-xs text-slate-500 font-medium">
                <li><a href="#about" className="hover:text-blue-600 transition-colors">من نحن (About Us)</a></li>
                <li><a href="#developers" className="hover:text-blue-600 transition-colors">المطورون (Developers Portal)</a></li>
                <li><a href="#contact" className="hover:text-blue-600 transition-colors">تواصل معنا والدعم الفني</a></li>
              </ul>
            </div>

            {/* القانونية والسياسات */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase">القانونية والسياسات</h4>
              <ul className="space-y-2.5 text-xs text-slate-500 font-medium">
                <li><a href="#privacy" className="hover:text-blue-600 transition-colors">سياسة الخصوصية</a></li>
                <li><a href="#terms" className="hover:text-blue-600 transition-colors">شروط الاستخدام</a></li>
                <li><a href="#security" className="hover:text-blue-600 transition-colors">أمان وحماية البيانات</a></li>
                <li><a href="#cookies" className="hover:text-blue-600 transition-colors">إعدادات ملفات الارتباط</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0F172A] tracking-wider font-serif">ATTOCUS</span>
              <span>&copy; {new Date().getFullYear()} جميع الحقوق محفوظة. صُمم لدعم الطلاب والباحثين.</span>
            </div>
            <div className="text-[11px] text-slate-400">
              جميع العلامات التجارية وحقوق النشر محفوظة لمنصة Attocus.
            </div>
          </div>
        </div>
      </footer>

      {/* ─── مودال تأكيد الحذف ─────────────────────────────────── */}
      {pendingDeleteLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">حذف المستند نهائياً؟</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف <strong>"{pendingDeleteLecture.title}"</strong>؟ ستفقد الملاحظات وسجل التقدم المسجل لهذا المستند.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingDeleteLecture(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm"
              >
                تأكيد الحذف
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