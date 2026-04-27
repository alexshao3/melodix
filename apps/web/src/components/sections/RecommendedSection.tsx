'use client';

import { useEffect, useState } from 'react';
import type { Track } from '@melodix/shared';
import { Section } from './Section';
import { TrackGrid } from './TrackGrid';
import { api } from '@/lib/api';

/**
 * "Recommended for you" / "Popular right now" — client-rendered because
 * it's auth-aware and the home page itself is statically rendered.
 *
 * - Authed users hit `GET /api/recommendations/me`, which fans out from
 *   their recent likes via item-item CF (cosine on co-likes) and falls
 *   back to popularity / trending when their like history is too thin.
 * - Guests hit `GET /api/recommendations/popular`, which orders by total
 *   like count and itself falls back to trending on a fresh database.
 *
 * In both cases an empty result hides the section entirely so the home
 * page never shows an empty placeholder. See ADR-0024 for the algorithm
 * choice and ROADMAP D17.
 */
export function RecommendedSection() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('melodix.token') : null;
    setAuthed(Boolean(token));

    let cancelled = false;
    const load = token ? api.recommendedForMe() : api.popularRecommendations();
    load.then((result) => {
      if (!cancelled) setTracks(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Initial render before the effect runs — tracks is `null`. Render
  // nothing rather than a flash-of-empty-state.
  if (tracks === null) return null;
  if (tracks.length === 0) return null;

  return (
    <Section
      title={authed ? 'Made for you' : 'Popular right now'}
      subtitle={
        authed
          ? 'Picked from tracks listeners with similar taste have on repeat.'
          : 'The most-loved tracks across Melodix today.'
      }
    >
      <TrackGrid tracks={tracks} />
    </Section>
  );
}
