import type { Album, Artist, Playlist, SearchResults, Track } from '@melodix/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('melodix.token');
}

async function safe<T>(path: string, fallback: T): Promise<T> {
  try {
    const headers = new Headers({ Accept: 'application/json' });
    const t = token();
    if (t) headers.set('Authorization', `Bearer ${t}`);
    const res = await fetch(`${BASE_URL}${path}`, { headers, cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  trending: () => safe<Track[]>(`/api/tracks/trending?limit=20`, []),
  newReleases: () => safe<Track[]>(`/api/tracks/new-releases?limit=20`, []),
  byGenre: (genre: string) =>
    safe<Track[]>(`/api/tracks/genre/${encodeURIComponent(genre)}?limit=20`, []),
  search: (q: string) =>
    safe<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`, {
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
    }),
  featured: () => safe<Playlist[]>(`/api/playlists/featured`, []),
  playlist: (id: string) =>
    safe<{ playlist: Playlist; tracks: Track[] } | null>(
      `/api/playlists/${encodeURIComponent(id)}`,
      null,
    ),
  album: (id: string) =>
    safe<{ album: Album; tracks: Track[] } | null>(`/api/albums/${encodeURIComponent(id)}`, null),
  artist: (id: string) =>
    safe<{ artist: Artist; tracks: Track[] } | null>(
      `/api/artists/${encodeURIComponent(id)}`,
      null,
    ),
  telegramLogin: (initData: string) => post<{ token: string }>(`/api/auth/telegram`, { initData }),
};
