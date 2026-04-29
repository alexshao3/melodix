'use client';

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';

/**
 * Wraps the Mini App in a framer-motion `MotionConfig` (so JS-driven
 * motion honours `prefers-reduced-motion`) and a `LazyMotion` provider
 * with the `domAnimation` feature pack. Components import `m as motion`
 * to ride the lazy feature loader instead of pulling the full motion
 * runtime into the initial bundle.
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
