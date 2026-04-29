'use client';

import { m as motion } from 'framer-motion';
import { cn } from '../lib/cn';

export interface GenrePillProps {
  label: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
  index?: number;
}

export function GenrePill({ label, color, active = false, onClick, index }: GenrePillProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: (index ?? 0) * 0.02 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'relative overflow-hidden rounded-full px-5 py-2 text-sm font-medium transition-all',
        'bg-gradient-to-r text-white shadow-lg',
        color,
        active ? 'ring-2 ring-white/60' : 'opacity-90 hover:opacity-100',
      )}
    >
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
