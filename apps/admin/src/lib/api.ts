import type { Track } from '@melodix/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'melodix.admin.token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  const hasFormBody = init?.body instanceof FormData;
  if (init?.body && !hasFormBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const t = getAdminToken();
  if (t) headers.set('Authorization', `Bearer ${t}`);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as { message?: string | string[] };
      if (typeof data.message === 'string') message = data.message;
      else if (Array.isArray(data.message)) message = data.message.join(', ');
    } catch {
      // body wasn't JSON; keep statusText
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface MusicSource {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
}

export interface AdminTracksList {
  items: Track[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AdminLoginResponse {
  token: string;
  admin: { id: string; username: string };
}

export interface StorageInfo {
  backend: 's3' | 'postgres';
  /** `null` for the S3 backend (provider console reports it). */
  objectCount: number | null;
  /** `null` for the S3 backend; total bytes stored in `storage_objects` for postgres. */
  totalBytes: number | null;
}

export const adminApi = {
  login: (username: string, password: string) =>
    request<AdminLoginResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  setup: (username: string, password: string) =>
    request<{ id: string; username: string }>('/api/admin/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  listTracks: (opts: { page?: number; limit?: number; search?: string; genre?: string } = {}) => {
    const params = new URLSearchParams();
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.search) params.set('search', opts.search);
    if (opts.genre) params.set('genre', opts.genre);
    const qs = params.toString();
    return request<AdminTracksList>(`/api/admin/tracks${qs ? `?${qs}` : ''}`);
  },
  createTrack: (form: FormData) =>
    request<Track>('/api/admin/tracks', { method: 'POST', body: form }),
  updateTrack: (id: string, form: FormData) =>
    request<Track>(`/api/admin/tracks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: form,
    }),
  deleteTrack: (id: string) =>
    request<void>(`/api/admin/tracks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  bulkDeleteTracks: (ids: string[]) =>
    request<{ deleted: string[]; notFound: string[] }>(`/api/admin/tracks/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  bulkSetTrackGenre: (ids: string[], genre: string | null) =>
    request<{ updated: string[]; notFound: string[] }>(`/api/admin/tracks/bulk-genre`, {
      method: 'PATCH',
      body: JSON.stringify({ ids, genre }),
    }),

  listSources: () => request<MusicSource[]>('/api/admin/sources'),
  toggleSource: (name: string, enabled: boolean) =>
    request<MusicSource>(`/api/admin/sources/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),

  storageInfo: () => request<StorageInfo>('/api/admin/storage/info'),
};
