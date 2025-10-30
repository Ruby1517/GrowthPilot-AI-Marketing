'use client';

import { useTheme } from '@/components/theme-provider';

export default function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();

  function nextTheme() {
    // cycle: light <-> dark
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  const label = isDark ? '🌙 Dark' : '☀️ Light';

  return (
    <button
      type="button"
      onClick={nextTheme}
      className="px-3 py-1.5 rounded-xl border border-white/10 text-sm hover:border-white/20"
      title="Toggle theme"
    >
      Theme: {label}
    </button>
  );
}
