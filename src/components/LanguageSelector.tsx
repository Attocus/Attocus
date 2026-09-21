import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage, isAr } = useLanguage();

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800/80 shadow-2xs transition-all ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        id="lang-selector-ar"
        onClick={() => setLanguage('ar')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
          isAr
            ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="العربية"
      >
        <span className="text-[11px] font-bold">عربي</span>
      </button>

      <button
        type="button"
        id="lang-selector-en"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
          !isAr
            ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="English"
      >
        <span className="text-[11px] font-bold">EN</span>
      </button>
    </div>
  );
};
