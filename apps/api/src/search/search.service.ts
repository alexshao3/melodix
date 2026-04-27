import { Injectable } from '@nestjs/common';
import type { SearchResults, Track } from '@melodix/shared';
import { JamendoService } from '../jamendo/jamendo.service';
import { PrismaService } from '../prisma/prisma.service';
import { MusicSourcesService } from '../music-sources/music-sources.service';
import { normalizePeaks } from '../tracks/peaks.util';

@Injectable()
export class SearchService {
  constructor(
    private readonly jamendo: JamendoService,
    private readonly prisma: PrismaService,
    private readonly musicSources: MusicSourcesService,
  ) {}

  async search(query: string): Promise<SearchResults> {
    const q = query.trim();
    if (!q) return { tracks: [], albums: [], artists: [], playlists: [] };

    const [jamendoEnabled, uploadEnabled] = await Promise.all([
      this.musicSources.isEnabled('jamendo'),
      this.musicSources.isEnabled('upload'),
    ]);

    const promises: Promise<unknown>[] = [];

    if (jamendoEnabled) {
      promises.push(
        this.jamendo.searchTracks(q, 24),
        this.jamendo.searchAlbums(q, 12),
        this.jamendo.searchArtists(q, 12),
      );
    } else {
      promises.push(Promise.resolve([]), Promise.resolve([]), Promise.resolve([]));
    }

    if (uploadEnabled) {
      promises.push(this.searchUploadedTracks(q, 24));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [tracks, albums, artists, uploadedTracks] = (await Promise.all(promises)) as [
      Track[],
      SearchResults['albums'],
      SearchResults['artists'],
      Track[],
    ];

    return {
      tracks: [...tracks, ...uploadedTracks],
      albums,
      artists,
      playlists: [],
    };
  }

  private async searchUploadedTracks(query: string, limit: number): Promise<Track[]> {
    const tracks = await this.prisma.track.findMany({
      where: {
        source: 'upload',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: { artist: true },
      take: limit,
    });

    return tracks.map((t) => ({
      id: t.id,
      title: t.title,
      duration: t.duration,
      audioUrl: t.audioUrl,
      streamUrl: t.streamUrl,
      cover: t.cover,
      genre: t.genre,
      releaseDate: t.releaseDate,
      source: 'upload' as const,
      artistId: t.artistId,
      artistName: t.artist.name,
      albumId: t.albumId,
      albumName: null,
      peaks: normalizePeaks(t.peaks),
      lyrics: t.lyrics,
      syncedLyrics: t.syncedLyrics,
    }));
  }
}
