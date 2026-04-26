'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { api } from '../lib/api';

export interface LyricsSheetProps {
  artist: string;
  title: string;
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'found' | 'missing' | 'error';

/**
 * Bottom-sheet lyrics view for the Mini App. Mirrors the web LyricsDrawer
 * shape but slides up from the bottom to play nicely with Telegram's WebView
 * gestures. Fetches lazily — see ADR-0017.
 */
export function LyricsSheet({ artist, title, open, onClose }: LyricsSheetProps) {
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
        } else if (res.source === 'none') {
          // The miniapp `safe()` wrapper swallows network errors and
          // returns `{ source: 'none' }`; the server also tags transient
          // upstream failures with `source: 'none'`. Either way it's a
          // retry-able state, distinct from a genuine provider miss
          // (`source: 'lyrics.ovh'` with `lyrics === null`).
          setStatus('error');
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

  // Render through a portal to `document.body` because `MiniPlayer` is a
  // `motion.div` with both `transform` and `overflow-hidden` — either
  // would clip / displace `position: fixed` descendants. SSR-safe via
  // the `typeof window` guard so the Mini App's WebView render is happy.
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
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 30 }}
            role="dialog"
            aria-label="Lyrics"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-zinc-950/95 text-white shadow-2xl backdrop-blur"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/30" />
            <header className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{title}</div>
                <div className="truncate text-xs text-zinc-400">{artist}</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close lyrics"
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="max-h-[65vh] overflow-y-auto px-5 pb-6 text-sm leading-relaxed">
              {status === 'loading' && (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-3 animate-pulse rounded bg-white/10"
                      style={{ width: `${50 + ((i * 13) % 45)}%` }}
                    />
                  ))}
                </div>
              )}
              {status === 'found' && text && (
                <pre className="whitespace-pre-wrap break-words font-sans text-zinc-200">
                  {text}
                </pre>
              )}
              {status === 'missing' && (
                <p className="text-zinc-500">No lyrics available for this track yet.</p>
              )}
              {status === 'error' && (
                <p className="text-rose-400">Couldn&apos;t load lyrics. Try again later.</p>
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
