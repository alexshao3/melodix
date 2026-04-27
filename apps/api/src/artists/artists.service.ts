import { Injectable, NotFoundException } from '@nestjs/common';
import type { Album, Artist, Track } from '@melodix/shared';
import { JamendoService } from '../jamendo/jamendo.service';
import { DEMO_ARTISTS } from '../jamendo/demo-data';
import { PrismaService } from '../prisma/prisma.service';
import { MusicSourcesService } from '../music-sources/music-sources.service';
import { normalizePeaks } from '../tracks/peaks.util';

export interface ArtistDetail {
  artist: Artist;
  tracks: Track[];
  albums: Album[];
}

@Injectable()
export class ArtistsService {
  constructor(
    private readonly jamendo: JamendoService,
    private readonly prisma: PrismaService,
    private readonly musicSources: MusicSourcesService,
  ) {}

  async byId(id: string): Promise<ArtistDetail> {
    const [jamendoEnabled, uploadEnabled] = await Promise.all([
      this.musicSources.isEnabled('jamendo'),
      this.musicSources.isEnabled('upload'),
    ]);

    // Uploaded artists live in the local DB and never carry a `jm_` prefix.
    if (uploadEnabled && !id.startsWith('jm_')) {
      const detail = await this.findUploadedArtist(id);
      if (detail) return detail;
    }

    if (jamendoEnabled) {
      const externalId = id.startsWith('jm_') ? id.slice(3) : id;
      const artist = await this.jamendo.getArtistById(externalId);
      if (artist) {
        const [tracks, albums] = await Promise.all([
          this.jamendo.getArtistTracks(externalId),
          this.jamendo.getArtistAlbums(externalId),
        ]);
        return { artist, tracks, albums };
      }
    }

    const demo = DEMO_ARTISTS.find((a) => a.id === id);
    if (demo) {
      // Demo dataset has no album mapping by artist — surface tracks only.
      const tracks = await this.jamendo.getArtistTracks(id.startsWith('jm_') ? id.slice(3) : id);
      return { artist: demo, tracks, albums: [] };
    }

    throw new NotFoundException(`Artist ${id} not found`);
  }

  async list(limit = 24): Promise<Artist[]> {
    const [jamendoEnabled, uploadEnabled] = await Promise.all([
      this.musicSources.isEnabled('jamendo'),
      this.musicSources.isEnabled('upload'),
    ]);

    const results: Artist[] = [];

    if (uploadEnabled) {
      const uploaded = await this.prisma.artist.findMany({
        where: { source: 'upload' },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      results.push(
        ...uploaded.map<Artist>((a) => ({
          id: a.id,
          name: a.name,
          image: a.image,
          bio: a.bio,
          followers: a.followers,
        })),
      );
    }

    if (jamendoEnabled && results.length < limit) {
      results.push(...DEMO_ARTISTS.slice(0, limit - results.length));
    }

    return results.slice(0, limit);
  }

  /**
   * Look up an uploaded artist (and their tracks + albums) by primary key.
   * Returns `null` so the caller can fall through to other sources.
   */
  private async findUploadedArtist(id: string): Promise<ArtistDetail | null> {
    const row = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        albums: { orderBy: { createdAt: 'desc' } },
        tracks: {
          where: { source: 'upload' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!row) return null;

    const artist: Artist = {
      id: row.id,
      name: row.name,
      image: row.image,
      bio: row.bio,
      followers: row.followers,
    };

    const tracks: Track[] = row.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artistId: row.id,
      artistName: row.name,
      albumId: t.albumId,
      albumName: null,
      cover: t.cover,
      duration: t.duration,
      audioUrl: t.audioUrl,
      streamUrl: t.streamUrl,
      genre: t.genre,
      releaseDate: t.releaseDate,
      source: t.source as Track['source'],
      externalId: t.externalId,
      peaks: normalizePeaks(t.peaks),
    }));

    const albums: Album[] = row.albums.map((a) => ({
      id: a.id,
      name: a.name,
      artistId: row.id,
      artistName: row.name,
      cover: a.cover,
      releaseDate: a.releaseDate,
    }));

    return { artist, tracks, albums };
  }
}
