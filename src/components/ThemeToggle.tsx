'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark';

/** Dark/light toggle. Reads the class set by the pre-paint init script; persists the choice. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync from the pre-paint theme class */
    setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'text-muted hover:text-text hover:bg-white/5 grid size-9 place-items-center rounded-lg transition-colors',
        className,
      )}
    >
      {/* Render nothing theme-specific until mounted to avoid hydration mismatch. */}
      {mounted && (theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />)}
    </button>
  );
}
