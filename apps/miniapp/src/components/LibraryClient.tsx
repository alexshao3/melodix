'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, History, ListMusic, Plus, User, UserPlus } from 'lucide-react';
import type { Artist, Playlist, Track } from '@melodix/shared';
import { api } from '@/lib/api';
import { getRecentlyPlayed } from '@/lib/recently-played';
import { MiniTrackRow } from './MiniTrackRow';
import { CreatePlaylistSheet } from './CreatePlaylistSheet';

export function LibraryClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likes, setLikes] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [follows, setFollows] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [pl, lk, hist, fl] = await Promise.all([
        api.myPlaylists(),
        api.likes(),
        api.history(30),
        api.follows(),
      ]);
      setPlaylists(pl);
      setLikes(lk);
      setFollows(fl);
      // Server history wins over localStorage when authed (ADR-0014). Empty
      // result keeps the localStorage view we already rendered.
      if (hist.length > 0) setRecent(hist);
    } catch {
      setPlaylists([]);
      setLikes([]);
      setFollows([]);
    }
  }, []);

  useEffect(() => {
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
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const ownPlaylists = playlists.filter((p) => p.ownerId !== 'system');

  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-2xl bg-white/[0.04] p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 fill-rose-400 text-rose-400" />
          <h1 className="font-display text-xl font-bold text-white">Your library</h1>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Likes, playlists, and what you played recently.
        </p>
        {authed && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            New playlist
          </button>
        )}
      </header>

      {authed === false && (
        <div className="rounded-2xl bg-white/[0.04] p-4 text-sm text-zinc-300">
          Open Melodix inside Telegram to sign in automatically.
        </div>
      )}

      {authed && (
        <>
          <Section title="Your playlists" icon={<ListMusic className="h-4 w-4" />}>
            {loading ? (
              <Empty>Loading…</Empty>
            ) : ownPlaylists.length === 0 ? (
              <Empty>
                No playlists yet. Tap{' '}
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="text-cyan-300 underline-offset-2 hover:underline"
                >
                  New playlist
                </button>
                .
              </Empty>
            ) : (
              <ul className="flex flex-col">
                {ownPlaylists.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/playlists/${p.id}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-white active:bg-white/10"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-fuchsia-600 to-cyan-500">
                        {p.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ListMusic className="h-4 w-4 text-white" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block text-xs text-zinc-400">
                          {p.trackCount} {p.trackCount === 1 ? 'track' : 'tracks'}
                          {p.isPublic ? '' : ' · private'}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Liked songs"
            icon={<Heart className="h-4 w-4 fill-rose-400 text-rose-400" />}
          >
            {loading ? (
              <Empty>Loading…</Empty>
            ) : likes.length === 0 ? (
              <Empty>Tap the heart on any track.</Empty>
            ) : (
              <div className="flex flex-col">
                {likes.map((t, i) => (
                  <MiniTrackRow key={t.id} track={t} index={i} queue={likes} />
                ))}
              </div>
            )}
          </Section>

          {follows.length > 0 && (
            <Section title="Following" icon={<UserPlus className="h-4 w-4" />}>
              <ul className="flex flex-col">
                {follows.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/artists/${a.id}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-white active:bg-white/10"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-cyan-500">
                        {a.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {recent.length > 0 && (
            <Section title="Recently played" icon={<History className="h-4 w-4" />}>
              <div className="flex flex-col">
                {recent.map((t, i) => (
                  <MiniTrackRow key={t.id} track={t} index={i} queue={recent} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      <CreatePlaylistSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void refresh()}
      />
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold text-white">
        <span className="text-zinc-300">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white/[0.03] p-3 text-xs text-zinc-400">{children}</div>;
}
