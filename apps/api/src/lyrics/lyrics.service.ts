import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface LyricsResponse {
  artist: string;
  title: string;
  lyrics: string | null;
  source: 'lyrics.ovh' | 'cache' | 'none';
}

const PROVIDER_BASE = 'https://api.lyrics.ovh/v1';
const TTL_FOUND = 60 * 60 * 24; // 24h
const TTL_MISS = 60 * 60; // 1h — re-check periodically; cheap when nothing's there
const FETCH_TIMEOUT_MS = 4000;

/**
 * Lyrics resolver backed by the free, no-auth `lyrics.ovh` API. We cache both
 * found and not-found responses in Redis (shorter TTL for misses) so a hot
 * track doesn't spam the upstream and a missing track doesn't 404 every play.
 *
 * The whole module is graceful: if the provider is down or Redis is unset,
 * we still return `{ lyrics: null, source: 'none' }` and the player just
 * shows a "Lyrics not available" state. See ADR-0017.
 */
@Injectable()
export class LyricsService {
  private readonly logger = new Logger(LyricsService.name);

  constructor(private readonly cache: CacheService) {}

  async fetch(artistInput: string, titleInput: string): Promise<LyricsResponse> {
    const artist = normalize(artistInput);
    const title = normalize(titleInput);
    if (!artist || !title) {
      return { artist: artistInput, title: titleInput, lyrics: null, source: 'none' };
    }
    const key = cacheKey(artist, title);
    const cached = await this.cache.get<LyricsResponse>(key);
    if (cached !== null) {
      return { ...cached, source: 'cache' };
    }
    const fresh = await this.callProvider(artist, title);
    const ttl = fresh.lyrics ? TTL_FOUND : TTL_MISS;
    await this.cache.set(key, fresh, ttl);
    return fresh;
  }

  private async callProvider(artist: string, title: string): Promise<LyricsResponse> {
    const url = `${PROVIDER_BASE}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (res.status === 404) {
        return { artist, title, lyrics: null, source: 'lyrics.ovh' };
      }
      if (!res.ok) {
        this.logger.warn(`lyrics.ovh ${res.status} for ${artist} - ${title}`);
        return { artist, title, lyrics: null, source: 'none' };
      }
      const data = (await res.json()) as { lyrics?: string; error?: string };
      const text = typeof data.lyrics === 'string' ? data.lyrics.trim() : '';
      return {
        artist,
        title,
        lyrics: text.length > 0 ? text : null,
        source: 'lyrics.ovh',
      };
    } catch (err) {
      this.logger.warn(`lyrics fetch failed: ${(err as Error).message}`);
      return { artist, title, lyrics: null, source: 'none' };
    } finally {
      clearTimeout(timer);
    }
  }
}

function normalize(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function cacheKey(artist: string, title: string): string {
  return `lyrics:${artist.toLowerCase()}::${title.toLowerCase()}`;
}
