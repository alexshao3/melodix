import { AdminTracksService } from './admin-tracks.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { LyricsAlignerService } from './lyrics-aligner.service';

/**
 * Unit-tests for the bulk-operation methods. The single-track
 * create/update/remove paths are covered indirectly by the existing
 * integration test surface (admin Playwright + manual flows). These
 * specs focus on the partition logic and on the "best-effort
 * object-storage delete" guarantee.
 */

interface Row {
  id: string;
  audioUrl: string;
  cover: string | null;
  source: 'upload' | 'jamendo';
  genre: string | null;
}

function makeService(seed: Row[]) {
  // Lightweight in-memory store just for the queries our service makes.
  const store = new Map(seed.map((r) => [r.id, { ...r }]));

  const prisma = {
    track: {
      findMany: jest.fn(
        async ({
          where,
          select: _select,
        }: {
          where: { id: { in: string[] }; source: string };
          select?: unknown;
        }) => {
          const ids = where.id.in as string[];
          const src = where.source as string;
          return Array.from(store.values()).filter((r) => ids.includes(r.id) && r.source === src);
        },
      ),
      deleteMany: jest.fn(
        async ({ where }: { where: { id: { in: string[] }; source: string } }) => {
          const ids = where.id.in as string[];
          let count = 0;
          for (const id of ids) {
            if (store.get(id)?.source === where.source) {
              store.delete(id);
              count++;
            }
          }
          return { count };
        },
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: { in: string[] }; source: string };
          data: { genre: string | null };
        }) => {
          const ids = where.id.in as string[];
          let count = 0;
          for (const id of ids) {
            const row = store.get(id);
            if (row && row.source === where.source) {
              row.genre = data.genre;
              count++;
            }
          }
          return { count };
        },
      ),
    },
  } as unknown as PrismaService;

  const storage = {
    delete: jest.fn(async (_url: string) => undefined),
  } as unknown as StorageService;

  const aligner = {
    align: jest.fn(async () => ({
      lrc: '[00:00.00]stub\n',
      lineCount: 1,
      durationS: 1,
    })),
  } as unknown as LyricsAlignerService;

  return {
    service: new AdminTracksService(prisma, storage, aligner),
    prisma,
    storage,
    aligner,
    store,
  };
}

describe('AdminTracksService.bulkRemove', () => {
  it('deletes matching upload tracks and returns the partition', async () => {
    const { service, store, storage } = makeService([
      { id: 'a', audioUrl: 'a-audio', cover: 'a-cover', source: 'upload', genre: null },
      { id: 'b', audioUrl: 'b-audio', cover: null, source: 'upload', genre: null },
      { id: 'c', audioUrl: 'c-audio', cover: null, source: 'jamendo', genre: null }, // not deletable
    ]);

    const result = await service.bulkRemove(['a', 'b', 'c', 'missing']);

    expect(result.deleted.sort()).toEqual(['a', 'b']);
    expect(result.notFound.sort()).toEqual(['c', 'missing']);
    expect(store.has('a')).toBe(false);
    expect(store.has('b')).toBe(false);
    expect(store.has('c')).toBe(true);
    // both audio + cover for `a`, only audio for `b`
    expect(storage.delete).toHaveBeenCalledTimes(3);
  });

  it('tolerates storage delete failures and still removes the DB rows', async () => {
    const { service, store, storage } = makeService([
      { id: 'a', audioUrl: 'a-audio', cover: 'a-cover', source: 'upload', genre: null },
    ]);
    (storage.delete as jest.Mock).mockRejectedValue(new Error('storage down'));

    const result = await service.bulkRemove(['a']);

    expect(result).toEqual({ deleted: ['a'], notFound: [] });
    expect(store.has('a')).toBe(false); // DB row gone even though storage errored
  });

  it('deduplicates input ids before counting notFound', async () => {
    const { service } = makeService([
      { id: 'a', audioUrl: 'a-audio', cover: null, source: 'upload', genre: null },
    ]);

    const result = await service.bulkRemove(['a', 'a', 'a']);

    expect(result.deleted).toEqual(['a']);
    expect(result.notFound).toEqual([]);
  });

  it('returns empty partitions for empty input', async () => {
    const { service, prisma } = makeService([]);
    const result = await service.bulkRemove([]);
    expect(result).toEqual({ deleted: [], notFound: [] });
    expect(prisma.track.findMany).not.toHaveBeenCalled();
  });
});

describe('AdminTracksService.bulkSetGenre', () => {
  it('updates matching upload tracks and skips others', async () => {
    const { service, store } = makeService([
      { id: 'a', audioUrl: 'x', cover: null, source: 'upload', genre: 'rock' },
      { id: 'b', audioUrl: 'x', cover: null, source: 'upload', genre: null },
      { id: 'c', audioUrl: 'x', cover: null, source: 'jamendo', genre: 'pop' },
    ]);

    const result = await service.bulkSetGenre(['a', 'b', 'c', 'missing'], 'jazz');

    expect(result.updated.sort()).toEqual(['a', 'b']);
    expect(result.notFound.sort()).toEqual(['c', 'missing']);
    expect(store.get('a')?.genre).toBe('jazz');
    expect(store.get('b')?.genre).toBe('jazz');
    expect(store.get('c')?.genre).toBe('pop'); // untouched
  });

  it('clears the genre when given null', async () => {
    const { service, store } = makeService([
      { id: 'a', audioUrl: 'x', cover: null, source: 'upload', genre: 'rock' },
    ]);

    await service.bulkSetGenre(['a'], null);

    expect(store.get('a')?.genre).toBeNull();
  });

  it('returns empty partitions for empty input', async () => {
    const { service, prisma } = makeService([]);
    const result = await service.bulkSetGenre([], 'jazz');
    expect(result).toEqual({ updated: [], notFound: [] });
    expect(prisma.track.findMany).not.toHaveBeenCalled();
  });
});
