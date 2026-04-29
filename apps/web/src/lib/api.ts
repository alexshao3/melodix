import type { Album, Artist, Playlist, SearchResults, Track } from '@melodix/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('melodix.token');
}

/**
 * Cache strategy:
 *  - mutations and any authed read default to `cache: 'no-store'` so user-
 *    scoped data never bleeds into the static cache.
 *  - public anonymous reads opt into ISR by passing `next: { revalidate, tags }`.
 *    Server fetches dedupe across the request and persist to the data cache;
 *    revalidation is driven by `revalidateTag` in the relevant mutation paths.
 *  - explicit `init.cache` always wins.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const t = token();
  if (t) headers.set('Authorization', `Bearer ${t}`);

  const isMutation = !!init?.method && init.method.toUpperCase() !== 'GET';
  const cacheOverride: Pick<RequestInit, 'cache'> = {};
  if (init?.cache === undefined && (isMutation || t)) {
    cacheOverride.cache = 'no-store';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    ...cacheOverride,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} -> ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

async function safe<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (err) {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        `[melodix] API call failed for ${path}, returning fallback. ${(err as Error).message}`,
      );
    }
    return fallback;
  }
}

/**
 * Optional `?source=` filter for the public track feeds. `'all'` is the
 * default (server-side it's expressed as the param being omitted) so a
 * `null` / unset state never surprises a caller.
 */
export type SourceFilter = 'all' | 'jamendo' | 'upload';

function sourceQuery(source: SourceFilter): string {
  return source === 'all' ? '' : `&source=${source}`;
}

/**
 * 60-second ISR window for public catalogue feeds. Each call also tags the
 * response so a future mutation (e.g. an admin re-curating Featured) can
 * target it via `revalidateTag` without flushing the whole cache.
 */
const PUBLIC_FEED: RequestInit = { next: { revalidate: 60, tags: ['feed'] } };
const PUBLIC_ENTITY: RequestInit = { next: { revalidate: 60, tags: ['entity'] } };

export const api = {
  trending: (limit = 24, source: SourceFilter = 'all') =>
    safe<Track[]>(`/api/tracks/trending?limit=${limit}${sourceQuery(source)}`, [], PUBLIC_FEED),
  newReleases: (limit = 24, source: SourceFilter = 'all') =>
    safe<Track[]>(`/api/tracks/new-releases?limit=${limit}${sourceQuery(source)}`, [], PUBLIC_FEED),
  byGenre: (genre: string, limit = 24, source: SourceFilter = 'all') =>
    safe<Track[]>(
      `/api/tracks/genre/${encodeURIComponent(genre)}?limit=${limit}${sourceQuery(source)}`,
      [],
      PUBLIC_FEED,
    ),
  track: (id: string) => request<Track>(`/api/tracks/${encodeURIComponent(id)}`, PUBLIC_ENTITY),
  album: (id: string) =>
    request<{ album: Album; tracks: Track[] }>(
      `/api/albums/${encodeURIComponent(id)}`,
      PUBLIC_ENTITY,
    ),
  artist: (id: string) =>
    request<{ artist: Artist; tracks: Track[]; albums: Album[] }>(
      `/api/artists/${encodeURIComponent(id)}`,
      PUBLIC_ENTITY,
    ),
  search: (q: string) =>
    safe<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`, {
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
    }),
  featuredPlaylists: () => safe<Playlist[]>(`/api/playlists/featured`, [], PUBLIC_FEED),
  playlist: (id: string) =>
    request<{ playlist: Playlist; tracks: Track[] }>(
      `/api/playlists/${encodeURIComponent(id)}`,
      PUBLIC_ENTITY,
    ),
  myPlaylists: () => request<Playlist[]>(`/api/playlists`),
  createPlaylist: (name: string, description?: string) =>
    request<Playlist>(`/api/playlists`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
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
    request<Playlist>(`/api/playlists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  reorderPlaylist: (id: string, trackIds: string[]) =>
    request<{ ok: true }>(`/api/playlists/${encodeURIComponent(id)}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ trackIds }),
    }),
  deletePlaylist: (id: string) =>
    request<{ ok: true }>(`/api/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  removePlaylistTrack: (id: string, trackId: string) =>
    request<{ ok: true }>(
      `/api/playlists/${encodeURIComponent(id)}/tracks/${encodeURIComponent(trackId)}`,
      { method: 'DELETE' },
    ),

  me: () =>
    request<{ id: string; username: string; displayName?: string; avatar?: string }>(`/api/me`),
  likes: () => request<Track[]>(`/api/me/likes`),
  history: (limit = 50) => safe<Track[]>(`/api/me/history?limit=${limit}`, []),
  recordPlay: (trackId: string) =>
    safe<{ ok: true }>(
      `/api/me/history`,
      { ok: true },
      {
        method: 'POST',
        body: JSON.stringify({ trackId }),
      },
    ),
  clearHistory: () => request<{ ok: true }>(`/api/me/history`, { method: 'DELETE' }),

  lyrics: (artist: string, title: string) =>
    safe<{ artist: string; title: string; lyrics: string | null; source: string }>(
      `/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`,
      { artist, title, lyrics: null, source: 'none' },
    ),

  // Recommendations — `me` requires a logged-in user (uses the bearer
  // token attached by `request`); `popular` and `similar` are public.
  // All three return `Track[]` and degrade to `[]` on failure so the UI
  // can render the section unconditionally.
  recommendedForMe: (limit = 20) => safe<Track[]>(`/api/recommendations/me?limit=${limit}`, []),
  popularRecommendations: (limit = 20) =>
    safe<Track[]>(`/api/recommendations/popular?limit=${limit}`, []),
  similarTracks: (trackId: string, limit = 20) =>
    safe<Track[]>(`/api/recommendations/similar/${encodeURIComponent(trackId)}?limit=${limit}`, []),

  follows: () => safe<Artist[]>(`/api/me/follows`, []),
  followIds: () => safe<string[]>(`/api/me/follows/ids`, []),
  follow: (artistId: string) =>
    request<{ following: true }>(`/api/me/follows/${encodeURIComponent(artistId)}`, {
      method: 'POST',
    }),
  unfollow: (artistId: string) =>
    request<{ following: false }>(`/api/me/follows/${encodeURIComponent(artistId)}`, {
      method: 'DELETE',
    }),

  like: (trackId: string) =>
    request<{ liked: boolean }>(`/api/me/likes/${encodeURIComponent(trackId)}`, { method: 'POST' }),
  unlike: (trackId: string) =>
    request<{ liked: boolean }>(`/api/me/likes/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    }),

  login: (emailOrUsername: string, password: string) =>
    request<{ token: string; user: { id: string; username: string } }>(`/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password }),
    }),
  register: (email: string, username: string, password: string) =>
    request<{ token: string; user: { id: string; username: string } }>(`/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),
  telegramLogin: (initData: string) =>
    request<{ token: string; user: { id: string; username: string } }>(`/api/auth/telegram`, {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
};

export type API = typeof api;
