'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { formatDuration } from '@melodix/shared';
import { usePlayer } from './PlayerProvider';

export function MiniPlayer() {
  const { currentTrack, isPlaying, position, duration, toggle, next, prev, seek } = usePlayer();
  const safeDuration = duration || currentTrack?.duration || 0;
  const pct = safeDuration ? Math.max(0, Math.min(100, (position / safeDuration) * 100)) : 0;

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          className="fixed inset-x-3 bottom-3 z-40 overflow-hidden rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-2xl"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-rose-400 origin-left" style={{ transform: `scaleX(${pct / 100})` }} />
          <div className="flex items-center gap-3 p-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
              {currentTrack.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentTrack.cover} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{currentTrack.title}</div>
              <div className="truncate text-xs text-zinc-400">{currentTrack.artistName}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300"
              >
                <SkipBack className="h-4 w-4 fill-current" />
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </button>
            </div>
          </div>
          <div className="px-3 pb-2">
            <input
              type="range"
              min={0}
              max={safeDuration || 1}
              step={0.1}
              value={position}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex items-center justify-between text-[10px] tabular-nums text-zinc-500">
              <span>{formatDuration(position)}</span>
              <span>{formatDuration(safeDuration)}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
