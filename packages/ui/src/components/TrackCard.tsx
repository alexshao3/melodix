'use client';

import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import type { Track } from '@melodix/shared';
import { formatDuration } from '@melodix/shared';
import { cn } from '../lib/cn';

export interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  isActive?: boolean;
  onPlay?: (track: Track) => void;
  variant?: 'grid' | 'row';
  index?: number;
}

export function TrackCard({
  track,
  isPlaying = false,
  isActive = false,
  onPlay,
  variant = 'grid',
  index,
}: TrackCardProps) {
  if (variant === 'row') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: (index ?? 0) * 0.02 }}
        className={cn(
          'group flex items-center gap-4 rounded-xl px-3 py-2 transition-colors',
          'hover:bg-white/5',
          isActive && 'bg-white/5',
        )}
      >
        <div className="flex w-6 shrink-0 items-center justify-center text-xs text-zinc-500">
          {isPlaying ? (
            <span className="flex h-3 items-end gap-[2px]">
              <span className="h-1 w-[2px] animate-pulse bg-emerald-400" />
              <span className="h-3 w-[2px] animate-pulse bg-emerald-400 [animation-delay:0.15s]" />
              <span className="h-2 w-[2px] animate-pulse bg-emerald-400 [animation-delay:0.3s]" />
            </span>
          ) : (
            <>
              <span className="group-hover:hidden">{(index ?? 0) + 1}</span>
              <button
                type="button"
                onClick={() => onPlay?.(track)}
                className="hidden text-white group-hover:block"
                aria-label={`Play ${track.title}`}
              >
                <Play className="h-4 w-4 fill-current" />
              </button>
            </>
          )}
        </div>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
          {track.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.cover} alt={track.title} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-sm font-medium', isActive ? 'text-emerald-400' : 'text-white')}>
            {track.title}
          </div>
          <div className="truncate text-xs text-zinc-400">{track.artistName}</div>
        </div>
        <div className="hidden text-xs text-zinc-500 sm:block">{track.albumName}</div>
        <div className="text-xs tabular-nums text-zinc-500">{formatDuration(track.duration)}</div>
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => onPlay?.(track)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index ?? 0) * 0.03 }}
      whileHover={{ y: -4 }}
      className="group relative flex w-full flex-col gap-3 rounded-2xl bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800">
        {track.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.cover}
            alt={track.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <motion.span
          initial={false}
          animate={{
            opacity: isActive ? 1 : 0,
            scale: isActive ? 1 : 0.8,
          }}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
        </motion.span>
        <span className="absolute right-3 top-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-emerald-500 text-black opacity-0 shadow-lg shadow-emerald-500/30 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Play className="h-5 w-5 fill-current" />
        </span>
      </div>
      <div className="min-w-0 px-1">
        <div className="truncate text-sm font-semibold text-white">{track.title}</div>
        <div className="truncate text-xs text-zinc-400">{track.artistName}</div>
      </div>
    </motion.button>
  );
}
