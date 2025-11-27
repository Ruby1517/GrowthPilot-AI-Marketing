'use client';

import { useTheme } from '@/components/theme-provider';

export default function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();
  const targetTheme = isDark ? 'light' : 'dark';
  const nextLabel = `Switch to ${targetTheme} mode`;
  const nextIcon = targetTheme === 'dark' ? '🌙' : '☀️';

  function handleToggle() {
    // cycle: light <-> dark
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="p-2 rounded-xl border border-white/10 text-sm hover:border-white/20 flex items-center justify-center"
      title={nextLabel}
    >
      <span aria-hidden>{nextIcon}</span>
      <span className="sr-only">{nextLabel}</span>
    </button>
  );
}
