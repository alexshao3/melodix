'use client';

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';

/**
 * Wraps the app in a framer-motion `MotionConfig` (so JS-driven motion
 * automatically respects `prefers-reduced-motion`) and a `LazyMotion`
 * provider with the `domAnimation` feature pack. Components import
 * `m as motion` from `framer-motion` instead of the eager `motion`
 * component, which keeps the initial bundle ~25 kB smaller — features
 * are loaded once via `LazyMotion` and reused across the tree.
 *
 * CSS-driven animations are tamed via the global `prefers-reduced-motion`
 * rule in `app/globals.css`.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
