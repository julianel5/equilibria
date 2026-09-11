import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const THEME_STORAGE_KEY = 'math-platform-theme';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  dark: boolean;
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* almacenamiento no disponible */
  }
  return getSystemTheme();
}

function hasStoredPreference(): boolean {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [hasUserPreference, setHasUserPreference] = useState(hasStoredPreference);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);

  useEffect(() => {
    if (hasUserPreference) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setThemeState(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [hasUserPreference]);

  const toggle = () => {
    setHasUserPreference(true);
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (t: Theme) => {
    setHasUserPreference(true);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ dark: theme === 'dark', theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}