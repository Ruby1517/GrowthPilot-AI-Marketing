'use client';

import { useTheme } from '@/components/theme-provider';

export default function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();

  function nextTheme() {
    // cycle: light <-> dark
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      onClick={nextTheme}
      className="p-2 rounded-xl border border-white/10 text-sm hover:border-white/20 flex items-center justify-center"
      title={isDark ? 'Switch to light' : 'Switch to dark'}
    >
      <span aria-hidden>{isDark ? '🌙' : '☀️'}</span>
      <span className="sr-only">{isDark ? 'Dark mode' : 'Light mode'}</span>
    </button>
  );
}
