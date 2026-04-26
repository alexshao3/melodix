'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, History, ListMusic, Plus, Sparkles } from 'lucide-react';
import { Section } from '@/components/sections/Section';
import { TrackList } from '@/components/sections/TrackList';
import { GradientButton, PlaylistCard, Spinner } from '@melodix/ui';
import type { Playlist, Track } from '@melodix/shared';
import { api } from '@/lib/api';
import { CreatePlaylistDialog } from '@/components/library/CreatePlaylistDialog';
import { getRecentlyPlayed } from '@/lib/recently-played';

export default function LibraryPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [likes, setLikes] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const refreshPlaylists = useCallback(async () => {
    try {
      const list = await api.myPlaylists();
      setPlaylists(list);
    } catch {
      setPlaylists([]);
    }
  }, []);

  useEffect(() => {
    // Guests see localStorage only. Authed users get the server-side history
    // (cross-device) but localStorage still drives the optimistic update —
    // see ADR-0014 for the layering.
    setRecent(getRecentlyPlayed());
    const onChange = () => setRecent(getRecentlyPlayed());
    window.addEventListener('melodix:recently-played-changed', onChange);
    return () => window.removeEventListener('melodix:recently-played-changed', onChange);
  }, []);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('melodix.token') : null;
    if (!t) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);
    Promise.allSettled([
      api.likes().then((tracks) => setLikes(tracks)),
      api.history(50).then((tracks) => {
        if (tracks.length > 0) setRecent(tracks);
      }),
      refreshPlaylists(),
    ]).finally(() => setLoading(false));
  }, [refreshPlaylists]);

  const ownPlaylists = playlists.filter((p) => p.ownerId !== 'system');

  return (
    <div>
      <header className="relative mt-2 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-rose-500/20 via-fuchsia-500/15 to-cyan-500/20 px-6 py-10 sm:px-10">
        <div
          aria-hidden
          className="aurora animate-gradient-pan absolute inset-0 -z-10 opacity-50"
        />
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
        {authed && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              New playlist
            </button>
          </div>
        )}
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

      {authed && loading && (
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      )}

      {authed && !loading && (
        <>
          <Section
            title="Your playlists"
            subtitle={`${ownPlaylists.length} ${ownPlaylists.length === 1 ? 'playlist' : 'playlists'}`}
            icon={<ListMusic className="h-4 w-4" />}
          >
            {ownPlaylists.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-zinc-400">
                You don&apos;t have any playlists yet. Tap{' '}
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="font-medium text-cyan-300 underline-offset-4 hover:underline"
                >
                  New playlist
                </button>{' '}
                to start one.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {ownPlaylists.map((p) => (
                  <Link key={p.id} href={`/playlists/${p.id}`}>
                    <PlaylistCard playlist={p} />
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Liked songs"
            subtitle={`${likes.length} ${likes.length === 1 ? 'track' : 'tracks'}`}
            icon={<Heart className="h-4 w-4 fill-rose-400 text-rose-400" />}
          >
            {likes.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-zinc-400">
                No likes yet. Tap the heart on any track to start your collection.
              </div>
            ) : (
              <TrackList tracks={likes} />
            )}
          </Section>

          {recent.length > 0 && (
            <Section
              title="Recently played"
              subtitle={`${recent.length} ${recent.length === 1 ? 'track' : 'tracks'}`}
              icon={<History className="h-4 w-4" />}
            >
              <TrackList tracks={recent} />
            </Section>
          )}
        </>
      )}

      <CreatePlaylistDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refreshPlaylists}
      />
    </div>
  );
}
