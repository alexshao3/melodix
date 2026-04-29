'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m as motion } from 'framer-motion';
import { X } from 'lucide-react';
import { findActiveLine, parseLrc, type Track } from '@melodix/shared';
import { api } from '../lib/api';

export interface LyricsSheetProps {
  /**
   * Currently playing track. We read `syncedLyrics` (LRC) and `lyrics`
   * (plain text) directly from the row so upload-source tracks display
   * their own lyrics without round-tripping through lyrics.ovh.
   */
  track: Track;
  /** Live audio position (seconds) — drives the active-line highlight. */
  position: number;
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'found' | 'missing' | 'error';

/**
 * Bottom-sheet lyrics view for the Mini App. Mirrors the web LyricsDrawer
 * shape — synced LRC takes priority over plain `lyrics`, both take
 * priority over the legacy lyrics.ovh fallback (ADR-0017).
 */
export function LyricsSheet({ track, position, open, onClose }: LyricsSheetProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [text, setText] = useState<string | null>(null);

  const synced = useMemo(() => parseLrc(track.syncedLyrics ?? null), [track.syncedLyrics]);
  const hasSynced = synced.length > 0;
  const hasPlain = !!track.lyrics?.trim();

  useEffect(() => {
    if (!open) return;
    if (hasSynced || hasPlain) {
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
                <div className="truncate text-sm font-semibold">{track.title}</div>
                <div className="truncate text-xs text-zinc-400">{track.artistName}</div>
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
              {hasSynced ? (
                <SyncedView lines={synced} position={position} />
              ) : hasPlain ? (
                <pre className="whitespace-pre-wrap break-words font-sans text-zinc-200">
                  {track.lyrics}
                </pre>
              ) : (
                <>
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
                    <p className="text-accent">Couldn&apos;t load lyrics. Try again later.</p>
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
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  useEffect(() => {
    if (activeIdx < 0) return;
    const el = lineRefs.current[activeIdx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx]);

  return (
    <div className="space-y-3 text-base">
      {lines.map((line, i) => (
        <p
          key={`${line.startMs}-${i}`}
          ref={(el) => {
            lineRefs.current[i] = el;
          }}
          className={`transition-all duration-300 ${
            i === activeIdx
              ? 'translate-x-1 text-base font-semibold text-white drop-shadow-[0_0_10px_rgba(217,70,239,0.55)]'
              : i < activeIdx
                ? 'text-zinc-500'
                : 'text-zinc-400'
          }`}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}
