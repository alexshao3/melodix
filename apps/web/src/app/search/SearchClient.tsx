'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon } from 'lucide-react';
import { Section } from '@/components/sections/Section';
import { TrackList } from '@/components/sections/TrackList';
import { AlbumCard, ArtistCard, Spinner } from '@melodix/ui';
import { api } from '@/lib/api';
import type { SearchResults } from '@melodix/shared';

const EMPTY: SearchResults = { tracks: [], albums: [], artists: [], playlists: [] };

export function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [data, setData] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const debouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedQ = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    if (debouncedRef.current) clearTimeout(debouncedRef.current);
    if (!trimmedQ) {
      setData(EMPTY);
      return;
    }
    debouncedRef.current = setTimeout(() => {
      setLoading(true);
      api
        .search(trimmedQ)
        .then((r) => setData(r))
        .finally(() => setLoading(false));
    }, 280);
    return () => {
      if (debouncedRef.current) clearTimeout(debouncedRef.current);
    };
  }, [trimmedQ]);

  return (
    <div>
      <div className="relative mt-2 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.03] px-6 py-10 sm:px-10">
        <div aria-hidden className="aurora animate-gradient-pan absolute inset-0 -z-10 opacity-50" />
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Search</h1>
        <form
          className="relative mt-6 max-w-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmedQ) router.replace(`/search?q=${encodeURIComponent(trimmedQ)}`);
          }}
        >
          <SearchIcon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-14 py-4 text-base text-white placeholder:text-zinc-500 focus:border-cyan-400/40 focus:bg-black/50 focus:outline-none"
          />
          {loading && (
            <span className="absolute right-5 top-1/2 -translate-y-1/2">
              <Spinner size={18} />
            </span>
          )}
        </form>
      </div>

      {!trimmedQ ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center text-zinc-400">
          <div className="text-5xl">🔎</div>
          <div className="font-display text-xl text-white">Find your sound</div>
          <p className="max-w-md text-sm">
            Try searching for an artist like <em>Kohei</em>, an album like <em>Polaris</em>, or a vibe like
            <em> ambient</em>.
          </p>
        </div>
      ) : (
        <>
          {data.tracks.length > 0 && (
            <Section title="Songs">
              <TrackList tracks={data.tracks} />
            </Section>
          )}
          {data.albums.length > 0 && (
            <Section title="Albums">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {data.albums.map((a, i) => (
                  <AlbumCard key={a.id} album={a} index={i} onClick={(al) => router.push(`/albums/${al.id}`)} />
                ))}
              </div>
            </Section>
          )}
          {data.artists.length > 0 && (
            <Section title="Artists">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {data.artists.map((a, i) => (
                  <ArtistCard key={a.id} artist={a} index={i} onClick={(ar) => router.push(`/artists/${ar.id}`)} />
                ))}
              </div>
            </Section>
          )}
          {!loading && data.tracks.length === 0 && data.albums.length === 0 && data.artists.length === 0 && (
            <div className="mt-16 text-center text-zinc-400">
              No matches for <span className="text-white">{trimmedQ}</span>. Try another query.
            </div>
          )}
        </>
      )}
    </div>
  );
}
