export const APP_NAME = 'Melodix';
export const APP_TAGLINE = 'Where every beat finds you.';

export const GENRES = [
  { id: 'pop', label: 'Pop', color: 'from-pink-500 to-rose-500' },
  { id: 'rock', label: 'Rock', color: 'from-red-600 to-orange-500' },
  { id: 'electronic', label: 'Electronic', color: 'from-purple-500 to-indigo-600' },
  { id: 'hiphop', label: 'Hip-Hop', color: 'from-yellow-500 to-amber-600' },
  { id: 'jazz', label: 'Jazz', color: 'from-emerald-500 to-teal-600' },
  { id: 'classical', label: 'Classical', color: 'from-slate-500 to-slate-700' },
  { id: 'lounge', label: 'Lounge', color: 'from-fuchsia-500 to-pink-600' },
  { id: 'world', label: 'World', color: 'from-amber-500 to-orange-600' },
  { id: 'soundtrack', label: 'Soundtrack', color: 'from-cyan-500 to-blue-600' },
  { id: 'metal', label: 'Metal', color: 'from-zinc-700 to-zinc-900' },
  { id: 'folk', label: 'Folk', color: 'from-lime-500 to-green-600' },
  { id: 'ambient', label: 'Ambient', color: 'from-sky-400 to-indigo-500' },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_QUEUE_SIZE = 200;

export const API_ROUTES = {
  TRACKS: '/api/tracks',
  ALBUMS: '/api/albums',
  ARTISTS: '/api/artists',
  PLAYLISTS: '/api/playlists',
  SEARCH: '/api/search',
  ME: '/api/me',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_TELEGRAM: '/api/auth/telegram',
  LIKES: '/api/me/likes',
  TRENDING: '/api/tracks/trending',
  NEW_RELEASES: '/api/tracks/new-releases',
} as const;

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1_000_000_000).toFixed(1)}B`;
}
