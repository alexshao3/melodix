'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

export interface LyricsDrawerProps {
  artist: string;
  title: string;
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'found' | 'missing' | 'error';

/**
 * Right-side slide-over with lyrics for the current track. Fetches lazily
 * (only when opened or when artist/title changes while open) and trusts the
 * server to cache via Redis (24h hits, 1h misses) — see ADR-0017.
 */
export function LyricsDrawer({ artist, title, open, onClose }: LyricsDrawerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!artist || !title) {
      setStatus('missing');
      setText(null);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setText(null);
    api
      .lyrics(artist, title)
      .then((res) => {
        if (cancelled) return;
        if (res.lyrics) {
          setText(res.lyrics);
          setStatus('found');
        } else {
          setStatus('missing');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [open, artist, title]);

  // Render via a portal to `document.body` because the player bar is a
  // `motion.div` with a CSS transform — any `position: fixed` descendant
  // would otherwise be positioned relative to the player bar instead of
  // the viewport. SSR-safe via the `typeof window` guard.
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            role="dialog"
            aria-label="Lyrics"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-zinc-950/95 text-white shadow-2xl shadow-black/50 backdrop-blur"
          >
            <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex min-w-0 items-center gap-2">
                <Mic2 className="h-4 w-4 shrink-0 text-fuchsia-400" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{title}</div>
                  <div className="truncate text-xs text-zinc-400">{artist}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close lyrics"
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className={cn('flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed')}>
              {status === 'loading' && <LyricsSkeleton />}
              {status === 'found' && text && (
                <pre className="whitespace-pre-wrap break-words font-sans text-zinc-200">
                  {text}
                </pre>
              )}
              {status === 'missing' && (
                <p className="text-zinc-500">No lyrics available for this track yet.</p>
              )}
              {status === 'error' && (
                <p className="text-rose-400">
                  Couldn&apos;t load lyrics. Please try again in a moment.
                </p>
              )}
            </div>
            <footer className="border-t border-white/10 px-5 py-2 text-[11px] text-zinc-500">
              Lyrics provided by lyrics.ovh
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function LyricsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-white/10"
          style={{ width: `${50 + ((i * 13) % 45)}%` }}
        />
      ))}
    </div>
  );
}
