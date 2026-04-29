'use client';

import { Heart } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { cn } from '../lib/cn';

export interface LikeButtonProps {
  liked?: boolean;
  onToggle?: () => void;
  size?: number;
  className?: string;
}

export function LikeButton({ liked = false, onToggle, size = 20, className }: LikeButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.08 }}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        liked ? 'text-rose-500' : 'text-zinc-400 hover:text-white',
        className,
      )}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <Heart className={cn(liked && 'fill-current')} style={{ width: size, height: size }} />
    </motion.button>
  );
}
