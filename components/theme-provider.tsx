'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void; isDark: boolean };

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // initial: localStorage -> default 'dark'
    const saved = (localStorage.getItem('theme') as Theme) || 'dark';
    setTheme(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  // compute isDark for UI
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {/* Avoid flash of wrong theme */}
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
