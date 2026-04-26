'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Wraps the Mini App in a framer-motion `MotionConfig` so JS-driven motion
 * components automatically honour `prefers-reduced-motion`.
 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
