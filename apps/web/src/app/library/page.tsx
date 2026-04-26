'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Sparkles } from 'lucide-react';
import { Section } from '@/components/sections/Section';
import { TrackList } from '@/components/sections/TrackList';
import { GradientButton, Spinner } from '@melodix/ui';
import type { Track } from '@melodix/shared';
import { api } from '@/lib/api';

export default function LibraryPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [likes, setLikes] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('melodix.token') : null;
    if (!t) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);
    api
      .likes()
      .then((tracks) => setLikes(tracks))
      .catch(() => setLikes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <header className="relative mt-2 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/15 to-cyan-500/20 px-6 py-10 sm:px-10">
        <div aria-hidden className="aurora animate-gradient-pan absolute inset-0 -z-10 opacity-50" />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your library
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-zinc-200">
          Liked songs, custom playlists, and recently played — all in one place.
        </p>
      </header>

      {authed === false && (
        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            Sign in to save likes & playlists across devices.
          </div>
          <Link href="/login">
            <GradientButton size="md">Sign in</GradientButton>
          </Link>
        </div>
      )}

      {authed && (
        <Section title="Liked songs" subtitle={`${likes.length} ${likes.length === 1 ? 'track' : 'tracks'}`}>
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size={28} />
            </div>
          ) : likes.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-zinc-400">
              No likes yet. Tap the heart on any track to start your collection.
            </div>
          ) : (
            <TrackList tracks={likes} />
          )}
        </Section>
      )}
    </div>
  );
}
