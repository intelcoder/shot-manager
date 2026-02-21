import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

function applyTheme(resolvedTheme: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
  }
}

// Load saved theme from localStorage
function loadSavedTheme(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  }
  return 'system';
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = loadSavedTheme();
  const initialResolved = resolveTheme(initialTheme);

  // Apply theme immediately on store creation
  applyTheme(initialResolved);

  // Listen for system theme changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      const state = get();
      if (state.theme === 'system') {
        const newResolved = getSystemTheme();
        applyTheme(newResolved);
        set({ resolvedTheme: newResolved });
      }
    });
  }

  return {
    theme: initialTheme,
    resolvedTheme: initialResolved,
    setTheme: (theme: Theme) => {
      const resolved = resolveTheme(theme);
      applyTheme(resolved);

      // Save to localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', theme);
      }

      set({ theme, resolvedTheme: resolved });
    },
  };
});
