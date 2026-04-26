'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

/**
 * Round icon button that flips between dark and light themes. Stays mounted
 * but renders an inert placeholder until `next-themes` has read the user's
 * stored preference, so we never paint the wrong icon during hydration.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const next = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
    >
      {!mounted ? (
        <span className="block h-4 w-4" aria-hidden />
      ) : isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
