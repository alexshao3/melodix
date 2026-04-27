import { NotFoundException } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { JamendoService } from '../jamendo/jamendo.service';
import type { MusicSourcesService } from '../music-sources/music-sources.service';
import { DEMO_ARTISTS } from '../jamendo/demo-data';

interface ArtistRow {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  followers: number;
  source: string;
  createdAt: Date;
  albums: Array<{
    id: string;
    name: string;
    cover: string | null;
    releaseDate: string | null;
    createdAt: Date;
  }>;
  tracks: Array<{
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
    externalId: string | null;
  }>;
}

function buildArtist(overrides: Partial<ArtistRow> = {}): ArtistRow {
  return {
    id: 'art_local_1',
    name: 'Local Artist',
    image: null,
    bio: 'Bio',
    followers: 0,
    source: 'upload',
    createdAt: new Date(),
    albums: [],
    tracks: [],
    ...overrides,
  };
}

function makeService({
  uploaded = [] as ArtistRow[],
  jamendo,
  enabled = { jamendo: true, upload: true },
}: {
  uploaded?: ArtistRow[];
  jamendo?: Partial<JamendoService>;
  enabled?: { jamendo: boolean; upload: boolean };
} = {}) {
  const prisma = {
    artist: {
      findUnique: jest.fn(async (args: { where: { id: string } }) => {
        return uploaded.find((a) => a.id === args.where.id) ?? null;
      }),
      findMany: jest.fn(
        async (args: {
          where: { source: string };
          orderBy?: { createdAt: 'asc' | 'desc' };
          take?: number;
        }) => {
          let filtered = uploaded.filter((a) => a.source === args.where.source);
          if (args.orderBy?.createdAt === 'desc') {
            filtered = [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          }
          return args.take ? filtered.slice(0, args.take) : filtered;
        },
      ),
    },
  } as unknown as PrismaService;

  const jamendoStub = {
    getArtistById: jest.fn(async () => null),
    getArtistTracks: jest.fn(async () => []),
    getArtistAlbums: jest.fn(async () => []),
    ...jamendo,
  } as unknown as JamendoService;

  const sources = {
    isEnabled: jest.fn(async (name: string) => {
      if (name === 'jamendo') return enabled.jamendo;
      if (name === 'upload') return enabled.upload;
      return false;
    }),
  } as unknown as MusicSourcesService;

  return new ArtistsService(jamendoStub, prisma, sources);
}

describe('ArtistsService', () => {
  describe('byId', () => {
    it('serves an uploaded artist with their tracks and albums when upload is enabled', async () => {
      const row = buildArtist({
        albums: [
          {
            id: 'alb_1',
            name: 'Debut',
            cover: null,
            releaseDate: '2025-01-01',
            createdAt: new Date(),
          },
        ],
        tracks: [
          {
            id: 'trk_1',
            title: 'First',
            duration: 180,
            audioUrl: 'https://r2.example/audio.mp3',
            streamUrl: null,
            cover: null,
            genre: 'Pop',
            releaseDate: '2025-01-01',
            source: 'upload',
            artistId: 'art_local_1',
            albumId: 'alb_1',
            externalId: null,
          },
        ],
      });
      const service = makeService({ uploaded: [row] });

      const detail = await service.byId('art_local_1');

      expect(detail.artist.name).toBe('Local Artist');
      expect(detail.tracks).toHaveLength(1);
      expect(detail.tracks[0].source).toBe('upload');
      expect(detail.albums).toHaveLength(1);
      expect(detail.albums[0].artistName).toBe('Local Artist');
    });

    it('skips the upload lookup when the id has the jm_ prefix', async () => {
      const service = makeService({
        jamendo: {
          getArtistById: jest.fn(async () => DEMO_ARTISTS[0]),
          getArtistTracks: jest.fn(async () => []),
          getArtistAlbums: jest.fn(async () => []),
        },
      });

      const detail = await service.byId('jm_42');

      expect(detail.artist.id).toBe(DEMO_ARTISTS[0].id);
    });

    it('throws NotFoundException when the id matches no source', async () => {
      const service = makeService({ enabled: { jamendo: false, upload: true } });
      await expect(service.byId('does-not-exist')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list', () => {
    it('merges uploaded artists in front of demo artists', async () => {
      const upload = buildArtist({ id: 'up_1', name: 'Uploaded' });
      const service = makeService({ uploaded: [upload] });

      const result = await service.list(5);

      expect(result[0].id).toBe('up_1');
      expect(result.length).toBe(5);
    });
  });
});
