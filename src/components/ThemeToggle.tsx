import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ThemeToggleProps {
  className?: string;
  id?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  id = 'theme-toggle-btn'
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { isAr } = useLanguage();

  const titleText = isDark
    ? (isAr ? 'الوضع النهاري' : 'Switch to Light Mode')
    : (isAr ? 'الوضع الليلي' : 'Switch to Dark Mode');

  return (
    <button
      type="button"
      id={id}
      onClick={toggleTheme}
      title={titleText}
      aria-label={titleText}
      className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center
        bg-white border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-2xs
        dark:bg-slate-800 dark:border-slate-700/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700
        ${className}`}
    >
      <span className="sr-only">{titleText}</span>
      <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
        <Sun
          className={`w-4 h-4 text-amber-500 transition-all duration-300 transform absolute ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50 pointer-events-none'
          }`}
        />
        <Moon
          className={`w-4 h-4 text-indigo-500 dark:text-indigo-400 transition-all duration-300 transform absolute ${
            isDark ? 'opacity-0 rotate-90 scale-50 pointer-events-none' : 'opacity-100 rotate-0 scale-100'
          }`}
        />
      </div>
    </button>
  );
};
