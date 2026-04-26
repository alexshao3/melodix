'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/**
 * Wraps the app in `next-themes` configured for class-based theming.
 *
 * - `attribute="class"` flips between `<html class="dark">` and
 *   `<html class="light">`. Tailwind already has `darkMode: 'class'` so the
 *   `dark:` variant lights up automatically; the matching light styles live
 *   under `.light ...` selectors in `globals.css`.
 * - `defaultTheme="dark"` keeps the marketed dark experience as the default.
 * - `enableSystem` lets returning visitors fall back to OS preference if they
 *   never explicitly toggled.
 * - `disableTransitionOnChange` avoids a 1-frame colour flash while the
 *   browser swaps tokens.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
