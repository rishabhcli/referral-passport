import { useState, useEffect, useCallback } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem('app-theme') as ThemePreference | null;
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(getInitialPreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(
    () => preference === 'system' ? getSystemTheme() : preference
  );

  // Listen to OS changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') {
      setResolved(preference);
      return;
    }
    setResolved(getSystemTheme());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setResolved(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  // Apply class + persist
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    localStorage.setItem('app-theme', preference);
  }, [resolved, preference]);

  const cycleTheme = useCallback(() => {
    setPreference(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light');
  }, []);

  return { theme: resolved, preference, cycleTheme };
}
