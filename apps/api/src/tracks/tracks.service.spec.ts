import type { Track } from '@melodix/shared';
import { TracksService, type TrackSourceFilter } from './tracks.service';
import type { JamendoService } from '../jamendo/jamendo.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { MusicSourcesService } from '../music-sources/music-sources.service';

/**
 * Focused on the `?source=` filter behaviour added in PR-E. The pre-existing
 * "merge every enabled source" semantics are exercised implicitly by the
 * `source === undefined` cases.
 */

const jam = (id: string): Track => ({
  id: `jm_${id}`,
  title: id,
  artistId: 'a',
  artistName: 'A',
  albumId: null,
  albumName: null,
  genre: null,
  duration: 100,
  cover: null,
  audioUrl: 'https://x',
  source: 'jamendo',
});

const upl = (id: string): Track => ({
  id,
  title: id,
  artistId: 'b',
  artistName: 'B',
  albumId: null,
  albumName: null,
  genre: null,
  duration: 120,
  cover: null,
  audioUrl: 'https://y',
  source: 'upload',
});

function makeService(opts: {
  jamendoEnabled: boolean;
  uploadEnabled: boolean;
  jamendoTracks?: Track[];
  uploadedTracks?: Track[];
}) {
  const jamendoTracks = opts.jamendoTracks ?? [jam('1'), jam('2')];
  const uploadedRows =
    opts.uploadedTracks ??
    [upl('u1'), upl('u2')].map((t) => ({
      id: t.id,
      title: t.title,
      artistId: t.artistId,
      artist: { id: t.artistId, name: t.artistName, image: null, bio: null },
      albumId: null,
      album: null,
      genre: t.genre,
      duration: t.duration,
      cover: t.cover,
      audioUrl: t.audioUrl,
      source: 'upload',
      peaks: null,
      createdAt: new Date(),
    }));

  const jamendo = {
    getTrending: jest.fn(async (_l: number) => jamendoTracks),
    getNewReleases: jest.fn(async (_l: number) => jamendoTracks),
    getByGenre: jest.fn(async (_g: string, _l: number) => jamendoTracks),
  } as unknown as JamendoService;

  const prisma = {
    track: {
      findMany: jest.fn(async () => uploadedRows),
    },
  } as unknown as PrismaService;

  const musicSources = {
    isEnabled: jest.fn(async (s: 'jamendo' | 'upload') =>
      s === 'jamendo' ? opts.jamendoEnabled : opts.uploadEnabled,
    ),
  } as unknown as MusicSourcesService;

  return {
    service: new TracksService(jamendo, prisma, musicSources),
    jamendo,
    prisma,
  };
}

describe('TracksService — ?source= filter', () => {
  const cases: Array<{
    name: keyof TracksService;
    call: (s: TracksService, src?: TrackSourceFilter) => Promise<Track[]>;
  }> = [
    {
      name: 'trending',
      call: (s, src) => s.trending(24, src),
    },
    {
      name: 'newReleases',
      call: (s, src) => s.newReleases(24, src),
    },
    {
      name: 'byGenre',
      call: (s, src) => s.byGenre('pop', 24, src),
    },
  ];

  describe.each(cases)('$name', ({ call }) => {
    it('merges all enabled sources when source is undefined', async () => {
      const { service } = makeService({ jamendoEnabled: true, uploadEnabled: true });
      const out = await call(service);
      const sources = new Set(out.map((t) => t.source));
      expect(sources.has('jamendo')).toBe(true);
      expect(sources.has('upload')).toBe(true);
    });

    it('returns only Jamendo tracks when source=jamendo', async () => {
      const { service } = makeService({ jamendoEnabled: true, uploadEnabled: true });
      const out = await call(service, 'jamendo');
      expect(out.length).toBeGreaterThan(0);
      expect(out.every((t) => t.source === 'jamendo')).toBe(true);
    });

    it('returns only uploaded tracks when source=upload', async () => {
      const { service } = makeService({ jamendoEnabled: true, uploadEnabled: true });
      const out = await call(service, 'upload');
      expect(out.length).toBeGreaterThan(0);
      expect(out.every((t) => t.source === 'upload')).toBe(true);
    });

    it('returns [] when the requested source is globally disabled', async () => {
      const { service } = makeService({ jamendoEnabled: false, uploadEnabled: true });
      const out = await call(service, 'jamendo');
      expect(out).toEqual([]);
    });

    it('does not call the disabled source even when the filter targets it', async () => {
      // jamendo disabled globally; ?source=jamendo should not invoke the Jamendo client
      const { service, jamendo } = makeService({ jamendoEnabled: false, uploadEnabled: true });
      await call(service, 'jamendo');
      const calls =
        (jamendo.getTrending as jest.Mock).mock.calls.length +
        (jamendo.getNewReleases as jest.Mock).mock.calls.length +
        (jamendo.getByGenre as jest.Mock).mock.calls.length;
      expect(calls).toBe(0);
    });
  });
});
