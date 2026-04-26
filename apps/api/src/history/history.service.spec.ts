import { HistoryService } from './history.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { JamendoService } from '../jamendo/jamendo.service';
import type { Track } from '@melodix/shared';

type Row = { id: string; userId: string; trackId: string; playedAt: Date };

function buildPrismaStub() {
  const rows: Row[] = [];
  let pk = 0;

  const orderRows = (filtered: Row[]): Row[] =>
    [...filtered].sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());

  return {
    rows,
    playHistory: {
      create: jest.fn(async (args: { data: { userId: string; trackId: string } }) => {
        const row: Row = {
          id: `h_${++pk}`,
          userId: args.data.userId,
          trackId: args.data.trackId,
          playedAt: new Date(),
        };
        rows.push(row);
        return row;
      }),
      findFirst: jest.fn(
        async (args: {
          where: { userId: string };
          orderBy?: { playedAt: 'asc' | 'desc' };
          skip?: number;
          select?: Record<string, boolean>;
        }) => {
          const filtered = orderRows(rows.filter((r) => r.userId === args.where.userId));
          const target = filtered[args.skip ?? 0];
          return target ?? null;
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { userId: string };
          orderBy?: { playedAt: 'asc' | 'desc' };
          take?: number;
          select?: Record<string, boolean>;
        }) => {
          const filtered = orderRows(rows.filter((r) => r.userId === args.where.userId));
          return args.take ? filtered.slice(0, args.take) : filtered;
        },
      ),
      deleteMany: jest.fn(
        async (args: { where: { userId: string; playedAt?: { lt?: Date; lte?: Date } } }) => {
          const before = rows.length;
          for (let i = rows.length - 1; i >= 0; i--) {
            const r = rows[i]!;
            if (r.userId !== args.where.userId) continue;
            if (args.where.playedAt?.lt && r.playedAt >= args.where.playedAt.lt) continue;
            if (args.where.playedAt?.lte && r.playedAt > args.where.playedAt.lte) continue;
            rows.splice(i, 1);
          }
          return { count: before - rows.length };
        },
      ),
    },
  };
}

function fakeTrack(id: string): Track {
  return {
    id,
    title: id,
    artistId: 'a',
    artistName: 'A',
    duration: 60,
    audioUrl: `${id}.mp3`,
    cover: 'c.jpg',
    source: 'jamendo',
  };
}

function buildService() {
  const prisma = buildPrismaStub();
  const jamendo = {
    getTrackById: jest.fn(async (id: string) => fakeTrack(`jm_${id}`)),
  } as unknown as JamendoService;
  const service = new HistoryService(prisma as unknown as PrismaService, jamendo);
  return { service, prisma, jamendo };
}

describe('HistoryService.record', () => {
  it('writes a new row when there is no prior history', async () => {
    const { service, prisma } = buildService();
    await service.record('u1', 'jm_42');
    expect(prisma.rows).toHaveLength(1);
    expect(prisma.rows[0]).toMatchObject({ userId: 'u1', trackId: 'jm_42' });
  });

  it('dedupes back-to-back replays of the same track within the 30 s window', async () => {
    const { service, prisma } = buildService();
    await service.record('u1', 'jm_7');
    await service.record('u1', 'jm_7');
    await service.record('u1', 'jm_7');
    expect(prisma.rows).toHaveLength(1);
  });

  it('records a different track even if it follows immediately', async () => {
    const { service, prisma } = buildService();
    await service.record('u1', 'jm_7');
    await service.record('u1', 'jm_9');
    expect(prisma.rows).toHaveLength(2);
  });

  it('keeps history scoped per user', async () => {
    const { service, prisma } = buildService();
    await service.record('u1', 'jm_7');
    await service.record('u2', 'jm_7');
    expect(prisma.rows.filter((r) => r.userId === 'u1')).toHaveLength(1);
    expect(prisma.rows.filter((r) => r.userId === 'u2')).toHaveLength(1);
  });

  it('caps each user at MAX_HISTORY rows by trimming older entries on insert', async () => {
    const { service, prisma } = buildService();
    // Seed 200 rows manually with monotonically-increasing playedAt timestamps.
    const base = Date.now() - 200_000;
    for (let i = 0; i < 200; i++) {
      prisma.rows.push({
        id: `seed_${i}`,
        userId: 'u1',
        trackId: `jm_${i}`,
        playedAt: new Date(base + i * 1_000),
      });
    }
    // The 201st row should trim the oldest.
    await service.record('u1', 'jm_new');
    expect(prisma.rows.filter((r) => r.userId === 'u1')).toHaveLength(200);
    // The earliest seeded id (seed_0) should be the one that was pruned.
    expect(prisma.rows.find((r) => r.id === 'seed_0')).toBeUndefined();
  });
});

describe('HistoryService.list', () => {
  it('returns recent tracks newest-first, deduped per trackId', async () => {
    const { service, prisma } = buildService();
    const t0 = Date.now();
    prisma.rows.push(
      { id: 'r1', userId: 'u1', trackId: 'jm_7', playedAt: new Date(t0 - 3_000) },
      { id: 'r2', userId: 'u1', trackId: 'jm_9', playedAt: new Date(t0 - 2_000) },
      { id: 'r3', userId: 'u1', trackId: 'jm_7', playedAt: new Date(t0 - 1_000) },
    );

    const list = await service.list('u1', 50);

    // Newest jm_7 wins; jm_9 still appears once. The fakeTrack stub strips
    // the `jm_` prefix before re-prefixing, so resolved ids match the row.
    expect(list.map((t) => t.id)).toEqual(['jm_7', 'jm_9']);
  });

  it('clamps the limit between 1 and 100', async () => {
    const { service, prisma } = buildService();
    await service.list('u1', 9999);
    expect(prisma.playHistory.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    await service.list('u1', 0);
    expect(prisma.playHistory.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 1 }),
    );
  });

  it('skips trackIds that no longer resolve via Jamendo', async () => {
    const { service, prisma, jamendo } = buildService();
    (jamendo.getTrackById as jest.Mock).mockImplementation(async (id: string) =>
      id === 'gone' ? null : fakeTrack(`jm_${id}`),
    );
    prisma.rows.push(
      { id: 'r1', userId: 'u1', trackId: 'jm_alive', playedAt: new Date() },
      { id: 'r2', userId: 'u1', trackId: 'jm_gone', playedAt: new Date(Date.now() - 1_000) },
    );

    const list = await service.list('u1', 50);

    expect(list.map((t) => t.id)).toEqual(['jm_alive']);
  });
});

describe('HistoryService.clear', () => {
  it('removes only the calling user\u2019s history', async () => {
    const { service, prisma } = buildService();
    await service.record('u1', 'jm_1');
    await service.record('u2', 'jm_2');

    await service.clear('u1');

    expect(prisma.rows.find((r) => r.userId === 'u1')).toBeUndefined();
    expect(prisma.rows.filter((r) => r.userId === 'u2')).toHaveLength(1);
  });
});
