'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic2, X } from 'lucide-react';
import { findActiveLine, parseLrc, type Track } from '@melodix/shared';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

export interface LyricsDrawerProps {
  /**
   * Currently playing track. We read `syncedLyrics` (LRC) and `lyrics`
   * (plain text) directly from it so upload-source tracks display their
   * own SUNO-AI / hand-written lyrics without round-tripping through the
   * lyrics.ovh proxy.
   */
  track: Track;
  /** Live audio position (seconds) — drives the active-line highlight. */
  position: number;
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'found' | 'missing' | 'error';

/**
 * Right-side slide-over with lyrics for the current track.
 *
 * Three render modes:
 * 1. Track has `syncedLyrics` (LRC) → karaoke-style synced view, the
 *    active line is highlighted and auto-scrolled into view.
 * 2. Track has plain `lyrics` (no alignment yet) → static `<pre>` view.
 * 3. Neither → fall back to the legacy lyrics.ovh fetch (Jamendo/demo
 *    tracks where we don't author the lyrics ourselves; ADR-0017).
 */
export function LyricsDrawer({ track, position, open, onClose }: LyricsDrawerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [text, setText] = useState<string | null>(null);

  const synced = useMemo(() => parseLrc(track.syncedLyrics ?? null), [track.syncedLyrics]);
  const hasSynced = synced.length > 0;
  const hasPlain = !!track.lyrics?.trim();

  useEffect(() => {
    if (!open) return;
    if (hasSynced || hasPlain) {
      // We already have lyrics on the Track row — don't burn a network
      // round-trip on the lyrics.ovh proxy.
      setStatus('found');
      return;
    }
    if (!track.artistName || !track.title) {
      setStatus('missing');
      setText(null);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setText(null);
    api
      .lyrics(track.artistName, track.title)
      .then((res) => {
        if (cancelled) return;
        if (res.lyrics) {
          setText(res.lyrics);
          setStatus('found');
        } else if (res.source === 'none') {
          // Provider miss vs. transient failure: the API tags real 404s
          // as `'lyrics.ovh'` and network/parse errors as `'none'`, so
          // surface a retry-able UI for the latter.
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
  }, [open, track.artistName, track.title, hasSynced, hasPlain]);

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
                  <div className="truncate text-sm font-semibold">{track.title}</div>
                  <div className="truncate text-xs text-zinc-400">{track.artistName}</div>
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
            <div className={cn('flex-1 overflow-y-auto px-5 py-6 text-sm leading-relaxed')}>
              {hasSynced ? (
                <SyncedView lines={synced} position={position} />
              ) : hasPlain ? (
                <pre className="whitespace-pre-wrap break-words font-sans text-zinc-200">
                  {track.lyrics}
                </pre>
              ) : (
                <>
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
                </>
              )}
            </div>
            <footer className="border-t border-white/10 px-5 py-2 text-[11px] text-zinc-500">
              {hasSynced
                ? 'Synced via Aeneas forced-aligner'
                : hasPlain
                  ? 'Lyrics provided by the artist'
                  : 'Lyrics provided by lyrics.ovh'}
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SyncedView({ lines, position }: { lines: ReturnType<typeof parseLrc>; position: number }) {
  const activeIdx = findActiveLine(lines, position);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  // Auto-scroll the active line to the centre of the container — but only
  // when it actually changes, otherwise every `timeupdate` (4× / sec)
  // would fight any user scroll.
  useEffect(() => {
    if (activeIdx < 0) return;
    const el = lineRefs.current[activeIdx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx]);

  return (
    <div ref={containerRef} className="space-y-4 text-base">
      {lines.map((line, i) => (
        <p
          key={`${line.startMs}-${i}`}
          ref={(el) => {
            lineRefs.current[i] = el;
          }}
          className={cn(
            'transition-all duration-300',
            i === activeIdx
              ? 'translate-x-1 text-lg font-semibold text-white drop-shadow-[0_0_12px_rgba(217,70,239,0.55)]'
              : i < activeIdx
                ? 'text-zinc-500'
                : 'text-zinc-400',
          )}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}

function LyricsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-3 animate-pulse rounded bg-white/5"
          style={{ width: `${60 + Math.random() * 35}%` }}
        />
      ))}
    </div>
  );
}
