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

async function authed<T>(path: string, init?: RequestInit & { jsonBody?: unknown }): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  const t = token();
  if (t) headers.set('Authorization', `Bearer ${t}`);
  let body = init?.body;
  if (init?.jsonBody !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.jsonBody);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    body,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return (await res.json()) as T;
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

  myPlaylists: () => authed<Playlist[]>(`/api/playlists`),
  likes: () => authed<Track[]>(`/api/me/likes`),
  createPlaylist: (name: string, description?: string) =>
    authed<Playlist>(`/api/playlists`, {
      method: 'POST',
      jsonBody: { name, description },
    }),
  updatePlaylist: (
    id: string,
    patch: {
      name?: string;
      description?: string | null;
      cover?: string | null;
      isPublic?: boolean;
    },
  ) =>
    authed<Playlist>(`/api/playlists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      jsonBody: patch,
    }),
  deletePlaylist: (id: string) =>
    authed<{ ok: true }>(`/api/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  me: () => authed<{ id: string; username: string }>(`/api/me`),
  history: (limit = 30) => safe<Track[]>(`/api/me/history?limit=${limit}`, []),
  lyrics: (artist: string, title: string) =>
    safe<{ artist: string; title: string; lyrics: string | null; source: string }>(
      `/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`,
      { artist, title, lyrics: null, source: 'none' },
    ),

  follows: () => authed<Artist[]>(`/api/me/follows`),
  followIds: () => safe<string[]>(`/api/me/follows/ids`, []),
  follow: (artistId: string) =>
    authed<{ following: true }>(`/api/me/follows/${encodeURIComponent(artistId)}`, {
      method: 'POST',
    }),
  unfollow: (artistId: string) =>
    authed<{ following: false }>(`/api/me/follows/${encodeURIComponent(artistId)}`, {
      method: 'DELETE',
    }),

  recordPlay: async (trackId: string) => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    const t = token();
    if (!t) return;
    headers.set('Authorization', `Bearer ${t}`);
    try {
      await fetch(`${BASE_URL}/api/me/history`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ trackId }),
        cache: 'no-store',
      });
    } catch {
      // best-effort write; the localStorage fallback covers offline cases
    }
  },
};
