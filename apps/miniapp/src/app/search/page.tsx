'use client';

import { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import type { SearchResults } from '@melodix/shared';
import { api } from '@/lib/api';
import { MiniTrackRow } from '@/components/MiniTrackRow';

const EMPTY: SearchResults = { tracks: [], albums: [], artists: [], playlists: [] };

export default function MiniSearch() {
  const [q, setQ] = useState('');
  const [data, setData] = useState<SearchResults>(EMPTY);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) {
      setData(EMPTY);
      return;
    }
    debounce.current = setTimeout(() => api.search(q.trim()).then(setData), 280);
  }, [q]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold text-white">Search</h1>
      <label className="relative flex items-center">
        <SearchIcon className="absolute left-4 h-4 w-4 text-zinc-500" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Songs, artists, albums…"
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-11 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-[color:var(--accent-line)] focus:outline-none"
        />
      </label>
      {data.tracks.length > 0 && (
        <section>
          <div className="mb-1 px-1 font-display text-sm font-semibold text-white">Songs</div>
          <div className="flex flex-col">
            {data.tracks.map((t, i) => (
              <MiniTrackRow key={t.id} track={t} index={i} queue={data.tracks} />
            ))}
          </div>
        </section>
      )}
      {q.trim() && data.tracks.length === 0 && (
        <div className="mt-8 text-center text-sm text-zinc-400">
          No results yet — try another query.
        </div>
      )}
    </div>
  );
}
