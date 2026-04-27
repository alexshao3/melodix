'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDuration } from '@melodix/shared';
import { Waveform } from '@melodix/ui';
import { cn } from '@/lib/cn';
import { LyricsDrawer } from './LyricsDrawer';
import { usePlayer } from './PlayerProvider';

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    shuffle,
    repeat,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();

  const [scrubValue, setScrubValue] = useState<number | null>(null);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const display = scrubValue ?? position;
  const safeDuration = duration || currentTrack?.duration || 0;
  const pct = safeDuration ? Math.min(100, Math.max(0, (display / safeDuration) * 100)) : 0;
  const volPct = Math.round(volume * 100);

  useEffect(() => {
    if (scrubValue !== null) return;
  }, [scrubValue]);

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          className="fixed bottom-3 left-3 right-3 z-40 lg:left-[calc(16rem+0.75rem)]"
        >
          <div className="glass relative flex items-center gap-4 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40">
            {/* Progress bar (top edge) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden rounded-t-2xl">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-rose-400 transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Track info */}
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:max-w-xs">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                {currentTrack.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/30 to-cyan-400/30 mix-blend-overlay"
                  animate={{ opacity: isPlaying ? [0.2, 0.6, 0.2] : 0.2 }}
                  transition={{ repeat: Infinity, duration: 2.4 }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {currentTrack.title}
                </div>
                <div className="truncate text-xs text-zinc-400">{currentTrack.artistName}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  aria-label="Shuffle"
                  className={cn(
                    'hidden h-9 w-9 items-center justify-center rounded-full transition-colors sm:flex',
                    shuffle ? 'text-emerald-400' : 'text-zinc-400 hover:text-white',
                  )}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:text-white"
                >
                  <SkipBack className="h-5 w-5 fill-current" />
                </button>
                <motion.button
                  type="button"
                  onClick={toggle}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.06 }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/40"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="h-5 w-5 fill-current" />
                  )}
                </motion.button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:text-white"
                >
                  <SkipForward className="h-5 w-5 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={cycleRepeat}
                  aria-label="Repeat"
                  className={cn(
                    'hidden h-9 w-9 items-center justify-center rounded-full transition-colors sm:flex',
                    repeat !== 'off' ? 'text-emerald-400' : 'text-zinc-400 hover:text-white',
                  )}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="h-4 w-4" />
                  ) : (
                    <Repeat className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Scrubber. When the track ships pre-computed waveform peaks
                  (uploaded tracks), render the Waveform scrubber. Otherwise
                  fall back to the plain range input — Jamendo / demo tracks
                  have no peaks today. */}
              <div className="hidden w-full items-center gap-3 px-2 sm:flex">
                <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-zinc-500">
                  {formatDuration(display)}
                </span>
                {currentTrack.peaks && currentTrack.peaks.length > 0 ? (
                  <Waveform
                    peaks={currentTrack.peaks}
                    position={display}
                    duration={safeDuration}
                    onScrub={(s) => setScrubValue(s)}
                    onSeek={(s) => {
                      seek(s);
                      setScrubValue(null);
                    }}
                    height={36}
                    className="text-fuchsia-400"
                  />
                ) : (
                  <input
                    type="range"
                    min={0}
                    max={safeDuration || 1}
                    step={0.1}
                    value={display}
                    onChange={(e) => setScrubValue(parseFloat(e.target.value))}
                    onMouseUp={() => {
                      if (scrubValue !== null) seek(scrubValue);
                      setScrubValue(null);
                    }}
                    onTouchEnd={() => {
                      if (scrubValue !== null) seek(scrubValue);
                      setScrubValue(null);
                    }}
                    style={{ ['--progress' as string]: `${pct}%` }}
                    className="player-range w-full"
                  />
                )}
                <span className="w-10 shrink-0 text-left text-[11px] tabular-nums text-zinc-500">
                  {formatDuration(safeDuration)}
                </span>
              </div>
            </div>

            {/* Right: lyrics + volume */}
            <div className="hidden items-center gap-2 lg:flex">
              <button
                type="button"
                onClick={() => setLyricsOpen(true)}
                aria-label="Show lyrics"
                title="Lyrics"
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:text-white',
                  lyricsOpen && 'text-fuchsia-400',
                )}
              >
                <Mic2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 0.85)}
                aria-label="Mute toggle"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:text-white"
              >
                {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={volPct}
                onChange={(e) => setVolume(parseInt(e.target.value, 10) / 100)}
                style={{ ['--progress' as string]: `${volPct}%` }}
                className="player-range w-24"
              />
            </div>
          </div>
          <LyricsDrawer
            open={lyricsOpen}
            onClose={() => setLyricsOpen(false)}
            artist={currentTrack.artistName}
            title={currentTrack.title}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
