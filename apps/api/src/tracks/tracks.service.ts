import { Injectable, NotFoundException } from '@nestjs/common';
import type { Track } from '@melodix/shared';
import { JamendoService } from '../jamendo/jamendo.service';
import { PrismaService } from '../prisma/prisma.service';
import { MusicSourcesService } from '../music-sources/music-sources.service';
import { normalizePeaks } from './peaks.util';

/**
 * Optional filter controlled by the `?source=` query param on the public
 * track feeds. `undefined` keeps the original behaviour (merge every
 * enabled source). Other `Track['source']` values (`fma`, `demo`) are
 * deliberately not exposed on the public API today — `fma` isn't wired
 * up and `demo` is a fallback shape, not a user-facing source.
 */
export type TrackSourceFilter = 'jamendo' | 'upload';

@Injectable()
export class TracksService {
  constructor(
    private readonly jamendo: JamendoService,
    private readonly prisma: PrismaService,
    private readonly musicSources: MusicSourcesService,
  ) {}

  /**
   * Resolve which sources should run for a feed call.
   *
   * - `filter === undefined` → every globally-enabled source contributes
   *   (original behaviour).
   * - `filter === 'jamendo'` / `'upload'` → only that source contributes,
   *   and only if it's globally enabled. A request for a disabled source
   *   yields `{ jamendo: false, upload: false }` rather than 400/404,
   *   matching how the feeds already silently omit disabled sources.
   */
  private async resolveSources(filter?: TrackSourceFilter) {
    const [jamendoGloballyEnabled, uploadGloballyEnabled] = await Promise.all([
      this.musicSources.isEnabled('jamendo'),
      this.musicSources.isEnabled('upload'),
    ]);
    return {
      jamendo: jamendoGloballyEnabled && (filter === undefined || filter === 'jamendo'),
      upload: uploadGloballyEnabled && (filter === undefined || filter === 'upload'),
    };
  }

  async trending(limit = 24, source?: TrackSourceFilter): Promise<Track[]> {
    const { jamendo, upload } = await this.resolveSources(source);

    const results: Track[] = [];
    if (jamendo) results.push(...(await this.jamendo.getTrending(limit)));
    if (upload) results.push(...(await this.getUploadedTracks(limit)));
    return results.slice(0, limit);
  }

  async newReleases(limit = 24, source?: TrackSourceFilter): Promise<Track[]> {
    const { jamendo, upload } = await this.resolveSources(source);

    const results: Track[] = [];
    if (jamendo) results.push(...(await this.jamendo.getNewReleases(limit)));
    if (upload) results.push(...(await this.getUploadedTracks(limit, 'createdAt')));
    return results.slice(0, limit);
  }

  async byGenre(genre: string, limit = 24, source?: TrackSourceFilter): Promise<Track[]> {
    const { jamendo, upload } = await this.resolveSources(source);

    const results: Track[] = [];
    if (jamendo) results.push(...(await this.jamendo.getByGenre(genre, limit)));
    if (upload) results.push(...(await this.getUploadedTracks(limit, 'createdAt', genre)));
    return results.slice(0, limit);
  }

  async byId(id: string): Promise<Track> {
    // Check uploaded tracks first
    const dbTrack = await this.prisma.track.findUnique({
      where: { id },
      include: { artist: true },
    });
    if (dbTrack && dbTrack.source === 'upload') {
      return this.toTrack(dbTrack);
    }

    const externalId = id.startsWith('jm_')
      ? id.slice(3)
      : id.startsWith('demo_t_')
        ? id.slice(7)
        : id;
    const t = await this.jamendo.getTrackById(externalId);
    if (!t) throw new NotFoundException(`Track ${id} not found`);
    return t;
  }

  private async getUploadedTracks(
    limit: number,
    orderBy: 'createdAt' | 'title' = 'createdAt',
    genre?: string,
  ): Promise<Track[]> {
    const where: Record<string, unknown> = { source: 'upload' };
    if (genre) where.genre = genre;

    const tracks = await this.prisma.track.findMany({
      where,
      include: { artist: true },
      orderBy: { [orderBy]: 'desc' },
      take: limit,
    });

    return tracks.map((t) => this.toTrack(t));
  }

  private toTrack(t: {
    id: string;
    title: string;
    duration: number;
    audioUrl: string;
    streamUrl: string | null;
    cover: string | null;
    genre: string | null;
    releaseDate: string | null;
    source: string;
    artistId: string;
    albumId: string | null;
    peaks: unknown;
    artist: { name: string };
  }): Track {
    return {
      id: t.id,
      title: t.title,
      duration: t.duration,
      audioUrl: t.audioUrl,
      streamUrl: t.streamUrl,
      cover: t.cover,
      genre: t.genre,
      releaseDate: t.releaseDate,
      source: t.source as Track['source'],
      artistId: t.artistId,
      artistName: t.artist.name,
      albumId: t.albumId,
      albumName: null,
      peaks: normalizePeaks(t.peaks),
    };
  }
}
