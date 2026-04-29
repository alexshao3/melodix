'use client';

import Image from 'next/image';
import { m as motion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import type { Track } from '@melodix/shared';
import { formatDuration } from '@melodix/shared';
import { cn } from '@/lib/cn';
import { usePlayerControls, usePlayerState } from './PlayerProvider';

export function MiniTrackRow({
  track,
  index,
  queue,
}: {
  track: Track;
  index: number;
  queue: Track[];
}) {
  const { play } = usePlayerControls();
  const { currentTrack, isPlaying } = usePlayerState();
  const active = currentTrack?.id === track.id;
  return (
    <motion.button
      type="button"
      onClick={() => play(track, queue)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors',
        active ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10',
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        {track.cover ? (
          <Image src={track.cover} alt="" fill sizes="48px" className="object-cover" />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {active && isPlaying ? (
            <Pause className="h-4 w-4 text-white fill-current" />
          ) : (
            <Play className="h-4 w-4 text-white fill-current" />
          )}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn('truncate text-sm font-semibold', active ? 'text-accent' : 'text-white')}
        >
          {track.title}
        </div>
        <div className="truncate text-xs text-zinc-400">{track.artistName}</div>
      </div>
      <span className="text-[11px] tabular-nums text-zinc-500">
        {formatDuration(track.duration)}
      </span>
    </motion.button>
  );
}
