'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Wraps the app in a framer-motion `MotionConfig` so that JS-driven motion
 * components automatically respect the user's `prefers-reduced-motion`
 * preference. CSS-driven animations are tamed via the global rule in
 * `app/globals.css`.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
