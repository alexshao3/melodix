'use client';

import { m as motion } from 'framer-motion';
import { cn } from '../lib/cn';

export interface GenrePillProps {
  label: string;
  /**
   * Legacy mood-gradient class (e.g. `from-pink-500 to-rose-500`). Kept on
   * the API for back-compat with `GENRES.color`, but the Build re-skin no
   * longer renders these multi-stop gradients — chips are now type-led
   * with a single coral active state. The prop is ignored at runtime.
   */
  color?: string;
  active?: boolean;
  onClick?: () => void;
  index?: number;
}

export function GenrePill({ label, active = false, onClick, index }: GenrePillProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: (index ?? 0) * 0.02 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'relative rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-[color:var(--accent-line)] bg-accent-soft text-accent'
          : 'border-[color:var(--hairline)] bg-transparent text-zinc-300 hover:border-[color:var(--hairline-strong)] hover:text-white',
      )}
    >
      {label}
    </motion.button>
  );
}
