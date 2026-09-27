import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isAr: boolean;
  dir: 'rtl' | 'ltr';
  t: (key: string, defaultVal?: string) => string;
}

const STORAGE_KEY = 'attocus_language';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  ar: {
    // Brand & Navigation
    'app.title': 'ATTOCUS',
    'app.subtitle': 'المنصة الأكاديمية الذكية',
    'nav.home': 'الرئيسية',
    'nav.studyContent': 'المحتوى الدراسي',
    'nav.workspace': 'مساحة العمل',
    'nav.login': 'تسجيل الدخول',
    'nav.logout': 'تسجيل الخروج',
    'nav.darkMode': 'الوضع الليلي',
    'nav.lightMode': 'الوضع النهاري',
    'nav.language': 'اللغة',

    // Home Page
    'home.welcome': 'مرحباً بك، {name} 👋',
    'home.welcomeStudent': 'طالب متميز',
    'home.bannerDesc': 'استأنف جلساتك وحافظ على الستريك وتقدمك الأكاديمي.',
    'home.streak': 'الاستمرار اليومي',
    'home.streakDays': '{count} أيام',
    'home.streakActive': 'ستريك مشتعل 🔥',
    'home.avatarShop': 'متجر الشخصيات',
    'home.spendPoints': 'استبدال النقاط',
    'home.focusPoints': 'نقاط التركيز',
    'home.pointsHistory': 'سجل النقاط',
    'home.scheduledReviews': 'مراجعات مجدولة',
    'home.spacedRepetition': 'تكرار متباعد',
    'home.studyHours': 'ساعات المذاكرة',
    'home.todayAchievement': 'إنجاز اليوم',
    'home.coursesAndFolders': 'المقررات والمجلدات الدراسية',
    'home.addFolder': 'إضافة مجلد',
    'home.deleteFolder': 'حذف المجلد',
    'home.editFolder': 'تعديل المجلد',
    'home.addCourse': 'إضافة مادة',
    'home.uploadPdf': 'رفع ملف PDF جديد',
    'home.uploadNewDoc': 'رفع مستند جديد',
    'home.searchPlaceholder': 'ابحث في المواد، المحاضرات والملاحظات...',
    'home.searchInFolder': 'ابحث في ملفات ومفاهيم {folder}...',
    'home.availableFiles': 'الملفات المتاحة ({count})',
    'home.docsCount': 'المستندات والمحاضرات الدراسية ({count} مستند)',
    'home.viewAllSubjects': 'عرض كل المواد',
    'home.noLecturesTitle': 'لا توجد محاضرات في هذا القسم',
    'home.noLecturesDesc': 'ارفع ملف PDF الآن للبدء في القراءة والتلخيص التفاعلي وحل الاختبارات.',
    'home.noDocsInFolder': 'لا توجد مستندات في مادة "{folder}"',
    'home.noDocsInFolderDesc': 'يمكنك رفع ملف PDF أو مستند نصي جديد لإضافته فورياً لهذه المادة.',
    'home.uploadFirstDoc': 'رفع أول مستند في {folder}',
    'home.pageOf': 'صفحة {current} من {total}',
    'home.pagesCount': '{count} صفحة',
    'home.current': 'الحالي',
    'home.delete': 'حذف',
    'home.general': 'عام',
    'home.noDetailsDoc': 'مستند بدون تفاصيل إضافية',

    // Delete Modal
    'modal.deleteTitle': 'حذف المستند نهائياً؟',
    'modal.deleteDesc': 'هل أنت متأكد من حذف "{title}"؟ ستفقد الملاحظات وسجل التقدم المسجل لهذا المستند.',
    'modal.cancel': 'إلغاء',
    'modal.confirmDelete': 'تأكيد الحذف',
    'modal.deleteFolderTitle': 'حذف المجلد نهائياً؟',
    'modal.deleteFolderDesc': 'هل أنت متأكد من حذف المجلد "{title}"؟ لن يتم حذف المستندات، لكن سيتم إزالة المجلد من القائمة.',
    'modal.deleteFolderRestoreHint': 'يمكنك إضافة المجلد مرة أخرى من خلال زر "إضافة مجلد"',
    'modal.addFolderTitle': 'إضافة مجلد جديد',
    'modal.editFolderTitle': 'تعديل المجلد',
    'modal.addFolderPlaceholder': 'اسم المجلد',
    'modal.addFolderHint': 'إذا قمت بحذف مجلد افتراضي، يمكنك إعادته بإدخال اسمه هنا',
    'modal.createFolder': 'إنشاء المجلد',
    'modal.saveFolder': 'حفظ التغييرات',

    // Folders / Subjects
    'folder.all': 'جميع المواد',
    'folder.math': 'الرياضيات',
    'folder.physics': 'الفيزياء',
    'folder.cs': 'علوم الحاسب',
    'folder.bio': 'الأحياء',
    'folder.chem': 'الكيمياء',
    'folder.english': 'اللغة الإنجليزية',

    // Workspace & Header
    'workspace.backHome': 'العودة للرئيسية',
    'workspace.slide': 'شريحة {page}',
    'workspace.finishSession': 'إنهاء الجلسة',
    'workspace.zoomIn': 'تكبير',
    'workspace.zoomOut': 'تصغير',
    'workspace.undo': 'تراجع',
    'workspace.pen': 'قلم',
    'workspace.penDesc': 'قلم - كتابة وتدوين',
    'workspace.highlighter': 'تظليل',
    'workspace.eraser': 'ممحاة',
    'workspace.text': 'نص',
    'workspace.textBox': 'مربع نص',
    'workspace.colorsAndMeanings': 'توضيح الألوان والمحددات',
    'workspace.contentDensity': 'كثافة المحتوى',
    'workspace.citation': 'مرجع:',
    'workspace.analyticalModel': 'النموذج التحليلي:',
    'workspace.fullScreen': 'ملء الشاشة',
    'workspace.exitFullScreen': 'خروج من ملء الشاشة',
    'workspace.redo': 'إعادة',
    'workspace.clearAll': 'مسح الكل',
    'workspace.clearConfirm': 'هل أنت متأكد من مسح جميع رسومات هذه الشريحة؟',
    'workspace.strokeThickness': 'سُمك القلم',
    'workspace.thin': 'رقيق',
    'workspace.medium': 'متوسط',
    'workspace.thick': 'عريض',
    'workspace.previousSlide': 'الشريحة السابقة',
    'workspace.nextSlide': 'الشريحة التالية',

    // Interactive Text
    'text.placeholder': 'اكتب هنا...',
    'text.delete': 'حذف النص',
    'text.increase': 'تكبير الخط',
    'text.decrease': 'تصغير الخط',
    'text.dragTip': 'اسحب للتحريك · انقر للتعديل',
    'text.hint': 'Enter للحفظ · Esc للإلغاء',

    // Need Help & Assistant
    'help.needHelp': 'تحتاج مساعدة في هذه الشريحة؟',
    'help.assistant': 'المساعد الأكاديمي',
    'help.readyToExplain': 'جاهز لشرح النقاط الصعبة وحل التمارين',

    // Pomodoro Timer
    'timer.focusSession': 'جلسة تركيز',
    'timer.breakTime': 'وقت الاستراحة',
    'timer.pause': 'إيقاف مؤقت',
    'timer.start': 'بدء الجلسة',
    'timer.reset': 'إعادة',
    'timer.custom': 'مخصص',
    'timer.recorded': '{mins} دقيقة مسجلة',
    'timer.activeSession': 'جلسة نشطة (+5 نقاط)',
    'timer.breakNotice': 'استراحة وتجديد طاقة ☕',
    'timer.pointsForfeited': '⚠️ ألغيت نقاط الجلسة',

    // Time Formatting
    'time.minutes': '{m} دقيقة',
    'time.hoursMins': '{h} س {m} د',
    'time.hours': '{h} ساعة',

    // Footer
    'footer.aboutTitle': 'من نحن (About Us)',
    'footer.featuresTitle': 'المميزات والخصائص',
    'footer.pricingTitle': 'الباقات الأكاديمية',
    'footer.updatesTitle': 'تحديثات المنصة',
    'footer.developersTitle': 'المطورون',
    'footer.contactTitle': 'تواصل معنا والدعم الفني',
    'footer.privacyTitle': 'سياسة الخصوصية',
    'footer.termsTitle': 'شروط الاستخدام',
    'footer.securityTitle': 'أمان وحماية البيانات',
    'footer.cookiesTitle': 'إعدادات ملفات الارتباط',
    'footer.platform': 'المنصة',
    'footer.aboutAttocus': 'عن Attocus',
    'footer.legal': 'القانونية والسياسات',
    'footer.desc': 'منصة المذاكرة والتركيز الذكية المدعومة بالذكاء الاصطناعي، مصممة لمساعدتك على استيعاب المحاضرات، إدارة الوقت، ومتابعة إنجازك الأكاديمي بسلاسة.',
    'footer.availableOn': 'متاح على',
    'footer.rights': 'جميع الحقوق محفوظة. صُمم لدعم الطلاب والباحثين.',
    'footer.trademarks': 'جميع العلامات التجارية وحقوق النشر محفوظة لمنصة Attocus.'
  },
  en: {
    // Brand & Navigation
    'app.title': 'ATTOCUS',
    'app.subtitle': 'Smart Academic Platform',
    'nav.home': 'Home',
    'nav.studyContent': 'Study Content',
    'nav.workspace': 'Workspace',
    'nav.login': 'Sign In',
    'nav.logout': 'Sign Out',
    'nav.darkMode': 'Dark Mode',
    'nav.lightMode': 'Light Mode',
    'nav.language': 'Language',

    // Home Page
    'home.welcome': 'Welcome, {name} 👋',
    'home.welcomeStudent': 'Distinguished Student',
    'home.bannerDesc': 'Resume your study sessions and maintain your streak and academic progress.',
    'home.streak': 'Daily Streak',
    'home.streakDays': '{count} Days',
    'home.streakActive': 'Streak on fire 🔥',
    'home.avatarShop': 'Avatar Shop',
    'home.spendPoints': 'Spend Points',
    'home.focusPoints': 'Focus Points',
    'home.pointsHistory': 'Points History',
    'home.scheduledReviews': 'Scheduled Reviews',
    'home.spacedRepetition': 'Spaced Repetition',
    'home.studyHours': 'Study Hours',
    'home.todayAchievement': "Today's Achievement",
    'home.coursesAndFolders': 'Courses & Study Folders',
    'home.addFolder': 'Add Folder',
    'home.deleteFolder': 'Delete Folder',
    'home.editFolder': 'Edit Folder',
    'home.addCourse': 'Add Course',
    'home.uploadPdf': 'Upload New PDF File',
    'home.uploadNewDoc': 'Upload New Document',
    'home.searchPlaceholder': 'Search subjects, lectures, and notes...',
    'home.searchInFolder': 'Search files and concepts in {folder}...',
    'home.availableFiles': 'Available Files ({count})',
    'home.docsCount': 'Documents & lectures ({count})',
    'home.viewAllSubjects': 'View All Subjects',
    'home.noLecturesTitle': 'No lectures in this section',
    'home.noLecturesDesc': 'Upload a PDF now to begin reading, interactive summarizing, and quizzes.',
    'home.noDocsInFolder': 'No documents in "{folder}"',
    'home.noDocsInFolderDesc': 'Upload a PDF or text file to add it to this course.',
    'home.uploadFirstDoc': 'Upload first document in {folder}',
    'home.pageOf': 'Page {current} of {total}',
    'home.pagesCount': '{count} pages',
    'home.current': 'Current',
    'home.delete': 'Delete',
    'home.general': 'General',
    'home.noDetailsDoc': 'Document without extra details',

    // Delete Modal
    'modal.deleteTitle': 'Permanently delete document?',
    'modal.deleteDesc': 'Are you sure you want to delete "{title}"? All notes and progress will be permanently lost.',
    'modal.cancel': 'Cancel',
    'modal.confirmDelete': 'Confirm Delete',
    'modal.deleteFolderTitle': 'Permanently delete folder?',
    'modal.deleteFolderDesc': 'Are you sure you want to delete the folder "{title}"? Documents will not be deleted, but the folder will be removed from the list.',
    'modal.deleteFolderRestoreHint': 'You can add the folder again using the "Add Folder" button',
    'modal.addFolderTitle': 'Add New Folder',
    'modal.editFolderTitle': 'Edit Folder',
    'modal.addFolderPlaceholder': 'Folder name',
    'modal.addFolderHint': 'If you deleted a default folder, you can restore it by entering its name here',
    'modal.createFolder': 'Create Folder',
    'modal.saveFolder': 'Save Changes',

    // Folders / Subjects
    'folder.all': 'All Subjects',
    'folder.math': 'Mathematics',
    'folder.physics': 'Physics',
    'folder.cs': 'Computer Science',
    'folder.bio': 'Biology',
    'folder.chem': 'Chemistry',
    'folder.english': 'English',

    // Workspace & Header
    'workspace.backHome': 'Back to Home',
    'workspace.slide': 'Slide {page}',
    'workspace.finishSession': 'Finish Session',
    'workspace.zoomIn': 'Zoom In',
    'workspace.zoomOut': 'Zoom Out',
    'workspace.undo': 'Undo',
    'workspace.pen': 'Pen',
    'workspace.penDesc': 'Pen - notes & writing',
    'workspace.highlighter': 'Highlighter',
    'workspace.eraser': 'Eraser',
    'workspace.text': 'Text',
    'workspace.textBox': 'Text Box',
    'workspace.colorsAndMeanings': 'Color Definitions & Meanings',
    'workspace.contentDensity': 'Content Density',
    'workspace.citation': 'Ref:',
    'workspace.analyticalModel': 'Analytical Model:',
    'workspace.fullScreen': 'Full Screen',
    'workspace.exitFullScreen': 'Exit Full Screen',
    'workspace.redo': 'Redo',
    'workspace.clearAll': 'Clear All',
    'workspace.clearConfirm': 'Are you sure you want to clear all drawings on this slide?',
    'workspace.strokeThickness': 'Stroke Thickness',
    'workspace.thin': 'Thin',
    'workspace.medium': 'Medium',
    'workspace.thick': 'Thick',
    'workspace.previousSlide': 'Previous Slide',
    'workspace.nextSlide': 'Next Slide',

    // Interactive Text
    'text.placeholder': 'Type here...',
    'text.delete': 'Delete text',
    'text.increase': 'Increase size',
    'text.decrease': 'Decrease size',
    'text.dragTip': 'Drag to move · Click to edit',
    'text.hint': 'Enter to save · Esc to cancel',

    // Need Help & Assistant
    'help.needHelp': 'Need help with this slide?',
    'help.assistant': 'Academic Coach',
    'help.readyToExplain': 'Ready to clarify tough concepts and solve problems',

    // Pomodoro Timer
    'timer.focusSession': 'Focus Session',
    'timer.breakTime': 'Break Time',
    'timer.pause': 'Pause',
    'timer.start': 'Start',
    'timer.reset': 'Reset',
    'timer.custom': 'Custom',
    'timer.recorded': '{mins}m recorded',
    'timer.activeSession': 'Active session (+5 pts)',
    'timer.breakNotice': 'Take a break & recharge ☕',
    'timer.pointsForfeited': '⚠️ Session points forfeited',

    // Time Formatting
    'time.minutes': '{m} min',
    'time.hoursMins': '{h}h {m}m',
    'time.hours': '{h} hours',

    // Footer
    'footer.aboutTitle': 'About Us',
    'footer.featuresTitle': 'Features',
    'footer.pricingTitle': 'Academic Plans',
    'footer.updatesTitle': 'Platform Updates',
    'footer.developersTitle': 'Developers Portal',
    'footer.contactTitle': 'Contact & Support',
    'footer.privacyTitle': 'Privacy Policy',
    'footer.termsTitle': 'Terms of Use',
    'footer.securityTitle': 'Data Security & Safety',
    'footer.cookiesTitle': 'Cookie Settings',
    'footer.platform': 'Platform',
    'footer.aboutAttocus': 'About Attocus',
    'footer.legal': 'Legal & Policies',
    'footer.desc': 'AI-driven smart study and focus platform engineered to help you master lectures, manage time, and track academic achievement effortlessly.',
    'footer.availableOn': 'Available on',
    'footer.rights': 'All rights reserved. Designed for students and researchers.',
    'footer.trademarks': 'All trademarks and copyrights belong to Attocus platform.'
  }
};

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === 'ar' || saved === 'en')) {
        return saved;
      }
    } catch {}
    return 'ar'; // Default Arabic as requested
  });

  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', language);
    root.setAttribute('dir', dir);
  }, [language, dir]);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const t = (key: string, defaultVal?: string): string => {
    const dict = TRANSLATIONS[language];
    if (dict && dict[key]) {
      return dict[key];
    }
    const fallback = TRANSLATIONS['ar'];
    if (fallback && fallback[key]) {
      return fallback[key];
    }
    return defaultVal || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, isAr, dir, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
