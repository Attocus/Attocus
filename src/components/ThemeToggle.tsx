import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  id?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  id = 'theme-toggle-btn'
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      id={id}
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Theme"
      className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center
        bg-white border-[#E2E4DE] text-[#52575C] hover:text-[#1E2124] hover:bg-[#F4F5F1] shadow-2xs
        dark:bg-[#1A1D22] dark:border-[#2E3339] dark:text-[#9AA0A6] dark:hover:text-[#F1F3F5] dark:hover:bg-[#252930]
        ${className}`}
    >
      <span className="sr-only">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
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
