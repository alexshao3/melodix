'use client';

import { useEffect, useState } from 'react';
import type { Track } from '@melodix/shared';
import { api } from '@/lib/api';
import { MiniTrackRow } from './MiniTrackRow';

/**
 * Telegram-shaped twin of the web `RecommendedSection`. Same auth logic:
 * if a token is in localStorage, hit `/recommendations/me`; otherwise
 * hit `/recommendations/popular`. Hidden entirely when both produce an
 * empty list. See ADR-0024.
 */
export function MiniRecommendedSection() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('melodix.token') : null;
    setAuthed(Boolean(token));

    let cancelled = false;
    const load = token ? api.recommendedForMe(12) : api.popularRecommendations(12);
    load.then((result) => {
      if (!cancelled) setTracks(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (tracks === null || tracks.length === 0) return null;

  return (
    <section>
      <div className="mb-2 font-display text-base font-semibold text-white">
        {authed ? 'Made for you' : 'Popular right now'}
      </div>
      <div className="flex flex-col">
        {tracks.map((t, i) => (
          <MiniTrackRow key={t.id} track={t} index={i} queue={tracks} />
        ))}
      </div>
    </section>
  );
}
