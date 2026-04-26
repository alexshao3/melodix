import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Track, Album, Artist } from '@melodix/shared';
import { CacheService } from '../cache/cache.service';
import { DEMO_TRACKS } from './demo-data';

const CACHE_TTL = 600; // 10 minutes — Jamendo catalog is largely static within this window
const CACHE_PREFIX = 'jamendo';

interface JamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  album_id: string;
  album_name: string;
  album_image: string;
  image: string;
  audio: string;
  audiodownload: string;
  releasedate: string;
  musicinfo?: { tags?: { genres?: string[] } };
}

interface JamendoAlbum {
  id: string;
  name: string;
  releasedate: string;
  artist_id: string;
  artist_name: string;
  image: string;
}

interface JamendoArtist {
  id: string;
  name: string;
  image?: string;
  joindate?: string;
  shorturl?: string;
}

interface JamendoResponse<T> {
  headers: { status: string; results_count: number };
  results: T[];
}

@Injectable()
export class JamendoService {
  private readonly logger = new Logger(JamendoService.name);
  private readonly baseUrl = 'https://api.jamendo.com/v3.0';
  private readonly clientId: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.clientId = this.config.get<string>('JAMENDO_CLIENT_ID');
    if (!this.clientId) {
      this.logger.warn(
        'JAMENDO_CLIENT_ID not set; falling back to bundled demo tracks. ' +
          'Register a free client at https://devportal.jamendo.com to enable the live catalog.',
      );
    }
  }

  isLive(): boolean {
    return Boolean(this.clientId);
  }

  private async fetch<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
    if (!this.clientId) return [];
    const qs = new URLSearchParams({
      client_id: this.clientId,
      format: 'json',
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });
    const url = `${this.baseUrl}${path}?${qs.toString()}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`Jamendo ${path} returned ${res.status}`);
        return [];
      }
      const data = (await res.json()) as JamendoResponse<T>;
      return data.results ?? [];
    } catch (err) {
      this.logger.warn(`Jamendo ${path} failed: ${(err as Error).message}`);
      return [];
    }
  }

  async getTrending(limit = 24): Promise<Track[]> {
    if (!this.isLive()) return DEMO_TRACKS.slice(0, limit);
    return this.cache.wrap(`${CACHE_PREFIX}:trending:${limit}`, CACHE_TTL, async () => {
      const results = await this.fetch<JamendoTrack>('/tracks', {
        limit,
        order: 'popularity_total',
        include: 'musicinfo',
        audioformat: 'mp32',
      });
      return results.length ? results.map((t) => this.mapTrack(t)) : DEMO_TRACKS.slice(0, limit);
    });
  }

  async getNewReleases(limit = 24): Promise<Track[]> {
    if (!this.isLive()) return DEMO_TRACKS.slice(0, limit);
    return this.cache.wrap(`${CACHE_PREFIX}:new-releases:${limit}`, CACHE_TTL, async () => {
      const results = await this.fetch<JamendoTrack>('/tracks', {
        limit,
        order: 'releasedate_desc',
        include: 'musicinfo',
        audioformat: 'mp32',
      });
      return results.length ? results.map((t) => this.mapTrack(t)) : DEMO_TRACKS.slice(0, limit);
    });
  }

  async getByGenre(genre: string, limit = 24): Promise<Track[]> {
    if (!this.isLive()) return DEMO_TRACKS.filter((t) => t.genre === genre).slice(0, limit);
    return this.cache.wrap(
      `${CACHE_PREFIX}:genre:${genre.toLowerCase()}:${limit}`,
      CACHE_TTL,
      async () => {
        const results = await this.fetch<JamendoTrack>('/tracks', {
          limit,
          tags: genre,
          order: 'popularity_total',
          include: 'musicinfo',
          audioformat: 'mp32',
        });
        return results.map((t) => this.mapTrack(t));
      },
    );
  }

  async searchTracks(query: string, limit = 24): Promise<Track[]> {
    if (!this.isLive()) {
      const q = query.toLowerCase();
      return DEMO_TRACKS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artistName.toLowerCase().includes(q) ||
          (t.albumName?.toLowerCase().includes(q) ?? false),
      ).slice(0, limit);
    }
    return this.cache.wrap(
      `${CACHE_PREFIX}:search-tracks:${query.toLowerCase()}:${limit}`,
      CACHE_TTL,
      async () => {
        const results = await this.fetch<JamendoTrack>('/tracks', {
          limit,
          search: query,
          include: 'musicinfo',
          audioformat: 'mp32',
        });
        return results.map((t) => this.mapTrack(t));
      },
    );
  }

  async searchAlbums(query: string, limit = 12): Promise<Album[]> {
    if (!this.isLive()) {
      return [];
    }
    return this.cache.wrap(
      `${CACHE_PREFIX}:search-albums:${query.toLowerCase()}:${limit}`,
      CACHE_TTL,
      async () => {
        const results = await this.fetch<JamendoAlbum>('/albums', {
          limit,
          namesearch: query,
        });
        return results.map((a) => this.mapAlbum(a));
      },
    );
  }

  async searchArtists(query: string, limit = 12): Promise<Artist[]> {
    if (!this.isLive()) {
      return [];
    }
    return this.cache.wrap(
      `${CACHE_PREFIX}:search-artists:${query.toLowerCase()}:${limit}`,
      CACHE_TTL,
      async () => {
        const results = await this.fetch<JamendoArtist>('/artists', {
          limit,
          namesearch: query,
        });
        return results.map((a) => this.mapArtist(a));
      },
    );
  }

  async getTrackById(id: string): Promise<Track | null> {
    if (!this.isLive()) return DEMO_TRACKS.find((t) => t.id === id) ?? null;
    return this.cache.wrap(`${CACHE_PREFIX}:track:${id}`, CACHE_TTL, async () => {
      const results = await this.fetch<JamendoTrack>('/tracks', {
        id,
        include: 'musicinfo',
        audioformat: 'mp32',
      });
      const first = results[0];
      return first ? this.mapTrack(first) : null;
    });
  }

  async getAlbumTracks(albumId: string, limit = 50): Promise<Track[]> {
    if (!this.isLive()) return DEMO_TRACKS.filter((t) => t.albumId === albumId).slice(0, limit);
    return this.cache.wrap(
      `${CACHE_PREFIX}:album-tracks:${albumId}:${limit}`,
      CACHE_TTL,
      async () => {
        const results = await this.fetch<JamendoTrack>('/tracks', {
          album_id: albumId,
          limit,
          include: 'musicinfo',
          audioformat: 'mp32',
        });
        return results.map((t) => this.mapTrack(t));
      },
    );
  }

  async getArtistTracks(artistId: string, limit = 50): Promise<Track[]> {
    if (!this.isLive()) return DEMO_TRACKS.filter((t) => t.artistId === artistId).slice(0, limit);
    return this.cache.wrap(
      `${CACHE_PREFIX}:artist-tracks:${artistId}:${limit}`,
      CACHE_TTL,
      async () => {
        const results = await this.fetch<JamendoTrack>('/tracks', {
          artist_id: artistId,
          limit,
          order: 'popularity_total',
          include: 'musicinfo',
          audioformat: 'mp32',
        });
        return results.map((t) => this.mapTrack(t));
      },
    );
  }

  async getAlbumById(id: string): Promise<Album | null> {
    if (!this.isLive()) return null;
    return this.cache.wrap(`${CACHE_PREFIX}:album:${id}`, CACHE_TTL, async () => {
      const results = await this.fetch<JamendoAlbum>('/albums', { id });
      const first = results[0];
      return first ? this.mapAlbum(first) : null;
    });
  }

  async getArtistById(id: string): Promise<Artist | null> {
    if (!this.isLive()) return null;
    return this.cache.wrap(`${CACHE_PREFIX}:artist:${id}`, CACHE_TTL, async () => {
      const results = await this.fetch<JamendoArtist>('/artists', { id });
      const first = results[0];
      return first ? this.mapArtist(first) : null;
    });
  }

  private mapTrack(t: JamendoTrack): Track {
    const genres = t.musicinfo?.tags?.genres;
    return {
      id: `jm_${t.id}`,
      title: t.name,
      artistId: `jm_${t.artist_id}`,
      artistName: t.artist_name,
      albumId: t.album_id ? `jm_${t.album_id}` : null,
      albumName: t.album_name ?? null,
      cover: t.image ?? t.album_image ?? null,
      duration: t.duration,
      audioUrl: t.audio,
      streamUrl: t.audio,
      genre: genres && genres.length > 0 ? (genres[0] ?? null) : null,
      releaseDate: t.releasedate ?? null,
      source: 'jamendo',
      externalId: t.id,
    };
  }

  private mapAlbum(a: JamendoAlbum): Album {
    return {
      id: `jm_${a.id}`,
      name: a.name,
      artistId: `jm_${a.artist_id}`,
      artistName: a.artist_name,
      cover: a.image,
      releaseDate: a.releasedate ?? null,
    };
  }

  private mapArtist(a: JamendoArtist): Artist {
    return {
      id: `jm_${a.id}`,
      name: a.name,
      image: a.image ?? null,
      bio: null,
      followers: 0,
    };
  }
}
