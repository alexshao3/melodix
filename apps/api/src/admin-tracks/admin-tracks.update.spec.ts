import { AdminTracksService } from './admin-tracks.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { LyricsAlignerService } from './lyrics-aligner.service';

/**
 * Tests the lyrics-invalidation rules of `AdminTracksService.update`.
 *
 * The admin EditTrackDialog re-sends the existing lyrics on every save (so
 * "clear lyrics" can be expressed as an empty string). The service must
 * therefore distinguish "lyrics were re-sent unchanged" (preserve the LRC)
 * from "lyrics were edited" (wipe the LRC because the timestamps no
 * longer line up).
 */

interface Row {
  id: string;
  source: 'upload' | 'jamendo';
  artistId: string;
  artist: { id: string; name: string };
  title: string;
  genre: string | null;
  audioUrl: string;
  cover: string | null;
  duration: number;
  source_id: string | null;
  lyrics: string | null;
  syncedLyrics: string | null;
  lyricsAlignedAt: Date | null;
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 't1',
    source: 'upload',
    artistId: 'a1',
    artist: { id: 'a1', name: 'Artist' },
    title: 'Song',
    genre: null,
    audioUrl: '/api/storage/tracks/x.mp3',
    cover: null,
    duration: 100,
    source_id: null,
    lyrics: null,
    syncedLyrics: null,
    lyricsAlignedAt: null,
    ...overrides,
  };
}

function makePrisma(seed: Row): {
  prisma: PrismaService;
  updateSpy: jest.Mock;
  store: Row;
} {
  const store: Row = { ...seed };
  const updateSpy = jest.fn(async ({ data }: { data: Partial<Row> }) => {
    Object.assign(store, data);
    return { ...store };
  });
  const prisma = {
    track: {
      findUnique: jest.fn(async () => ({ ...store })),
      update: updateSpy,
    },
  } as unknown as PrismaService;
  return { prisma, updateSpy, store };
}

function makeService(seed: Row) {
  const { prisma, updateSpy, store } = makePrisma(seed);
  const storage = { delete: jest.fn(async () => undefined) } as unknown as StorageService;
  const aligner = { align: jest.fn() } as unknown as LyricsAlignerService;
  return {
    service: new AdminTracksService(prisma, storage, aligner),
    updateSpy,
    store,
  };
}

describe('AdminTracksService.update — lyrics invalidation', () => {
  test('re-sending unchanged lyrics does NOT wipe syncedLyrics', async () => {
    const seed = row({
      lyrics: 'verse one\nverse two',
      syncedLyrics: '[00:00.00]verse one\n[00:10.00]verse two\n',
      lyricsAlignedAt: new Date('2026-04-01T00:00:00Z'),
    });
    const { service, updateSpy } = makeService(seed);

    // Form submit with unrelated change (new title) — `lyrics` field is
    // present in FormData but identical to what's already persisted.
    await service.update('t1', { title: 'New Title', lyrics: 'verse one\nverse two' });

    const data = updateSpy.mock.calls[0]![0].data;
    expect(data.title).toBe('New Title');
    expect(data).not.toHaveProperty('syncedLyrics');
    expect(data).not.toHaveProperty('lyricsAlignedAt');
  });

  test('changing lyrics WIPES syncedLyrics + lyricsAlignedAt', async () => {
    const seed = row({
      lyrics: 'old',
      syncedLyrics: '[00:00.00]old\n',
      lyricsAlignedAt: new Date('2026-04-01T00:00:00Z'),
    });
    const { service, updateSpy } = makeService(seed);

    await service.update('t1', { lyrics: 'new lyrics' });

    const data = updateSpy.mock.calls[0]![0].data;
    expect(data.lyrics).toBe('new lyrics');
    expect(data.syncedLyrics).toBeNull();
    expect(data.lyricsAlignedAt).toBeNull();
  });

  test('clearing lyrics (empty string) WIPES syncedLyrics', async () => {
    const seed = row({
      lyrics: 'something',
      syncedLyrics: '[00:00.00]something\n',
      lyricsAlignedAt: new Date(),
    });
    const { service, updateSpy } = makeService(seed);

    await service.update('t1', { lyrics: '' });

    const data = updateSpy.mock.calls[0]![0].data;
    expect(data.lyrics).toBeNull();
    expect(data.syncedLyrics).toBeNull();
    expect(data.lyricsAlignedAt).toBeNull();
  });

  test('omitting `lyrics` from the patch leaves the row untouched', async () => {
    const seed = row({
      lyrics: 'kept',
      syncedLyrics: '[00:00.00]kept\n',
      lyricsAlignedAt: new Date('2026-04-01T00:00:00Z'),
    });
    const { service, updateSpy } = makeService(seed);

    await service.update('t1', { genre: 'pop' });

    const data = updateSpy.mock.calls[0]![0].data;
    expect(data.genre).toBe('pop');
    expect(data).not.toHaveProperty('lyrics');
    expect(data).not.toHaveProperty('syncedLyrics');
    expect(data).not.toHaveProperty('lyricsAlignedAt');
  });
});
