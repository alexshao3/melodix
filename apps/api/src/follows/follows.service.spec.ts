import { FollowsService } from './follows.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { JamendoService } from '../jamendo/jamendo.service';
import type { Artist } from '@melodix/shared';
import { DEMO_ARTISTS } from '../jamendo/demo-data';

type Row = { userId: string; artistId: string; createdAt: Date };

function buildPrismaStub() {
  const rows: Row[] = [];

  const matches = (row: Row, where: { userId?: string; artistId?: string }) => {
    if (where.userId !== undefined && row.userId !== where.userId) return false;
    if (where.artistId !== undefined && row.artistId !== where.artistId) return false;
    return true;
  };

  return {
    rows,
    follow: {
      findUnique: jest.fn(
        async (args: { where: { userId_artistId: { userId: string; artistId: string } } }) => {
          const { userId, artistId } = args.where.userId_artistId;
          return rows.find((r) => r.userId === userId && r.artistId === artistId) ?? null;
        },
      ),
      findMany: jest.fn(
        async (args: {
          where: { userId: string };
          orderBy?: { createdAt: 'asc' | 'desc' };
          select?: Record<string, boolean>;
        }) => {
          const filtered = rows.filter((r) => r.userId === args.where.userId);
          if (args.orderBy?.createdAt === 'desc') {
            return [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          }
          return filtered;
        },
      ),
      upsert: jest.fn(
        async (args: {
          where: { userId_artistId: { userId: string; artistId: string } };
          create: { userId: string; artistId: string };
        }) => {
          const { userId, artistId } = args.where.userId_artistId;
          const existing = rows.find((r) => r.userId === userId && r.artistId === artistId);
          if (existing) return existing;
          const row: Row = { userId, artistId, createdAt: new Date() };
          rows.push(row);
          return row;
        },
      ),
      deleteMany: jest.fn(async (args: { where: { userId: string; artistId: string } }) => {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (matches(rows[i]!, args.where)) rows.splice(i, 1);
        }
        return { count: before - rows.length };
      }),
    },
  };
}

function fakeArtist(id: string): Artist {
  return { id, name: id, image: null, bio: null, followers: 0 };
}

function buildService() {
  const prisma = buildPrismaStub();
  const jamendo = {
    getArtistById: jest.fn(async (id: string) => fakeArtist(`jm_${id}`)),
  } as unknown as JamendoService;
  const service = new FollowsService(prisma as unknown as PrismaService, jamendo);
  return { service, prisma, jamendo };
}

describe('FollowsService.follow', () => {
  it('creates a row when the artist is not already followed', async () => {
    const { service, prisma } = buildService();
    await service.follow('u1', 'jm_a');
    expect(prisma.rows).toHaveLength(1);
    expect(prisma.rows[0]).toMatchObject({ userId: 'u1', artistId: 'jm_a' });
  });

  it('is idempotent — following the same artist twice keeps a single row', async () => {
    const { service, prisma } = buildService();
    await service.follow('u1', 'jm_a');
    await service.follow('u1', 'jm_a');
    await service.follow('u1', 'jm_a');
    expect(prisma.rows).toHaveLength(1);
  });

  it('keeps follows scoped per user', async () => {
    const { service, prisma } = buildService();
    await service.follow('u1', 'jm_a');
    await service.follow('u2', 'jm_a');
    expect(prisma.rows).toHaveLength(2);
    expect(prisma.rows.filter((r) => r.userId === 'u1')).toHaveLength(1);
    expect(prisma.rows.filter((r) => r.userId === 'u2')).toHaveLength(1);
  });
});

describe('FollowsService.unfollow', () => {
  it('removes only the requested follow row', async () => {
    const { service, prisma } = buildService();
    await service.follow('u1', 'jm_a');
    await service.follow('u1', 'jm_b');
    await service.unfollow('u1', 'jm_a');
    expect(prisma.rows).toHaveLength(1);
    expect(prisma.rows[0]).toMatchObject({ userId: 'u1', artistId: 'jm_b' });
  });

  it('is a no-op when the row does not exist', async () => {
    const { service, prisma } = buildService();
    const out = await service.unfollow('u1', 'jm_ghost');
    expect(out).toEqual({ following: false });
    expect(prisma.rows).toHaveLength(0);
  });

  it("does not touch another user's follow on the same artist", async () => {
    const { service, prisma } = buildService();
    await service.follow('u1', 'jm_a');
    await service.follow('u2', 'jm_a');
    await service.unfollow('u1', 'jm_a');
    expect(prisma.rows).toHaveLength(1);
    expect(prisma.rows[0]).toMatchObject({ userId: 'u2', artistId: 'jm_a' });
  });
});

describe('FollowsService.list / .ids / .isFollowing', () => {
  it('list() hydrates Jamendo artists newest-first', async () => {
    const { service } = buildService();
    await service.follow('u1', 'jm_a');
    await new Promise((r) => setTimeout(r, 2)); // ensure ordering by createdAt
    await service.follow('u1', 'jm_b');
    const out = await service.list('u1');
    expect(out.map((a) => a.id)).toEqual(['jm_b', 'jm_a']);
  });

  it('list() skips artists that no longer resolve', async () => {
    const prisma = buildPrismaStub();
    const jamendo = {
      getArtistById: jest.fn(async (id: string) => (id === 'lost' ? null : fakeArtist(`jm_${id}`))),
    } as unknown as JamendoService;
    const service = new FollowsService(prisma as unknown as PrismaService, jamendo);
    await service.follow('u1', 'jm_lost');
    await service.follow('u1', 'jm_keep');
    const out = await service.list('u1');
    expect(out.map((a) => a.id)).toEqual(['jm_keep']);
  });

  it('ids() returns the raw artistId list for "is following?" checks', async () => {
    const { service } = buildService();
    await service.follow('u1', 'jm_a');
    await service.follow('u1', 'jm_b');
    const ids = await service.ids('u1');
    expect(new Set(ids)).toEqual(new Set(['jm_a', 'jm_b']));
  });

  it('list() falls back to DEMO_ARTISTS in demo mode (no JAMENDO_CLIENT_ID)', async () => {
    const prisma = buildPrismaStub();
    const jamendo = {
      // Demo mode: getArtistById returns null for everything.
      getArtistById: jest.fn(async () => null),
    } as unknown as JamendoService;
    const service = new FollowsService(prisma as unknown as PrismaService, jamendo);
    const demoArtist = DEMO_ARTISTS[0]!;
    await service.follow('u1', demoArtist.id);
    const out = await service.list('u1');
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe(demoArtist.id);
  });

  it('isFollowing() reflects current state and is per-user', async () => {
    const { service } = buildService();
    await service.follow('u1', 'jm_a');
    expect(await service.isFollowing('u1', 'jm_a')).toBe(true);
    expect(await service.isFollowing('u1', 'jm_b')).toBe(false);
    expect(await service.isFollowing('u2', 'jm_a')).toBe(false);
  });
});
