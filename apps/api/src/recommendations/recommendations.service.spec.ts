import type { Track } from '@melodix/shared';
import type { PrismaService } from '../prisma/prisma.service';
import type { CacheService } from '../cache/cache.service';
import type { TracksService } from '../tracks/tracks.service';
import { RecommendationsService } from './recommendations.service';

type LikeRow = { userId: string; trackId: string; createdAt: Date };

function passthroughCache(): CacheService {
  // The recommendations service routes every public method through
  // `cache.wrap`. In tests we want the loader to always run so we can
  // assert on the underlying behaviour.
  return {
    wrap: <T>(_key: string, _ttl: number, loader: () => Promise<T>) => loader(),
  } as unknown as CacheService;
}

function buildPrismaStub(initial: LikeRow[] = []) {
  const rows: LikeRow[] = [...initial];

  const like = {
    findMany: jest.fn(
      async (args: {
        where: { userId: string };
        take?: number;
      }): Promise<{ trackId: string }[]> => {
        const filtered = rows
          .filter((r) => r.userId === args.where.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((r) => ({ trackId: r.trackId }));
        return args.take ? filtered.slice(0, args.take) : filtered;
      },
    ),
  };

  // Tagged-template `$queryRaw` stub. We pattern-match on the SQL text
  // so the test stays close to what the service actually emits, then
  // run the corresponding pure-JS aggregation against `rows`.
  const $queryRaw = jest.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = strings.join(' ').toLowerCase();

    // Big neighbour query — distinguished by the `WITH seed_users` CTE.
    // Must be checked BEFORE the bare seed-size query because both
    // contain `select count(*)`.
    if (sql.includes('with seed_users')) {
      const seedTrackId = values[0] as string;
      const limit = Number(values[values.length - 1]);
      const seedUsers = new Set(rows.filter((r) => r.trackId === seedTrackId).map((r) => r.userId));
      const counts = new Map<string, number>();
      for (const r of rows) {
        if (r.trackId === seedTrackId) continue;
        if (!seedUsers.has(r.userId)) continue;
        counts.set(r.trackId, (counts.get(r.trackId) ?? 0) + 1);
      }
      const totals = new Map<string, number>();
      for (const r of rows) totals.set(r.trackId, (totals.get(r.trackId) ?? 0) + 1);
      return Array.from(counts.entries())
        .map(([trackId, coLikes]) => ({
          track_id: trackId,
          co_likes: BigInt(coLikes),
          total: BigInt(totals.get(trackId) ?? 0),
        }))
        .sort((a, b) => Number(b.co_likes - a.co_likes) || Number(b.total - a.total))
        .slice(0, limit);
    }

    // Bare seed-size query — `SELECT COUNT(*)::bigint AS n FROM likes WHERE "trackId" = $1`.
    if (sql.includes('select count(*)') && sql.includes('from likes where "trackid"')) {
      const trackId = values[0] as string;
      const n = rows.filter((r) => r.trackId === trackId).length;
      return [{ n: BigInt(n) }];
    }

    if (sql.includes('group by "trackid"') && sql.includes('order by c desc')) {
      const limit = Number(values[0]);
      const counts = new Map<string, number>();
      for (const r of rows) counts.set(r.trackId, (counts.get(r.trackId) ?? 0) + 1);
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([trackId]) => ({ track_id: trackId }));
    }

    throw new Error(`Unrecognised SQL in test stub: ${sql}`);
  });

  return { like, $queryRaw, rows };
}

function fakeTrack(id: string): Track {
  return {
    id,
    title: id,
    duration: 200,
    audioUrl: `https://example.com/${id}`,
    streamUrl: null,
    cover: null,
    genre: null,
    releaseDate: null,
    source: 'jamendo',
    artistId: 'a',
    artistName: 'a',
    albumId: null,
    albumName: null,
  };
}

function buildTracksStub(missing: Set<string> = new Set()) {
  return {
    byId: jest.fn(async (id: string) => {
      if (missing.has(id)) throw new Error('not found');
      return fakeTrack(id);
    }),
    trending: jest.fn(async (limit: number) =>
      Array.from({ length: limit }, (_, i) => fakeTrack(`trend_${i}`)),
    ),
  } as unknown as TracksService;
}

function makeService(prisma: ReturnType<typeof buildPrismaStub>, tracks: TracksService) {
  return new RecommendationsService(prisma as unknown as PrismaService, tracks, passthroughCache());
}

describe('RecommendationsService', () => {
  describe('similar()', () => {
    it('returns co-liked tracks ranked by cosine similarity', async () => {
      const prisma = buildPrismaStub([
        { userId: 'u1', trackId: 'A', createdAt: new Date(1) },
        { userId: 'u1', trackId: 'B', createdAt: new Date(2) },
        { userId: 'u2', trackId: 'A', createdAt: new Date(3) },
        { userId: 'u2', trackId: 'B', createdAt: new Date(4) },
        { userId: 'u3', trackId: 'A', createdAt: new Date(5) },
        { userId: 'u3', trackId: 'C', createdAt: new Date(6) },
      ]);
      const tracks = buildTracksStub();
      const recs = makeService(prisma, tracks);

      const out = await recs.similar('A', 5);
      expect(out.map((t) => t.id)).toEqual(['B', 'C']);
    });

    it('returns empty when the seed track has no likes', async () => {
      const prisma = buildPrismaStub([]);
      const recs = makeService(prisma, buildTracksStub());
      expect(await recs.similar('Z', 5)).toEqual([]);
    });

    it('skips tracks that resolve to a 404', async () => {
      const prisma = buildPrismaStub([
        { userId: 'u1', trackId: 'A', createdAt: new Date(1) },
        { userId: 'u1', trackId: 'B', createdAt: new Date(2) },
        { userId: 'u2', trackId: 'A', createdAt: new Date(3) },
        { userId: 'u2', trackId: 'B', createdAt: new Date(4) },
      ]);
      const tracks = buildTracksStub(new Set(['B']));
      const recs = makeService(prisma, tracks);
      expect(await recs.similar('A', 5)).toEqual([]);
    });
  });

  describe('forUser()', () => {
    it("aggregates similarity across the user's recent likes and excludes them", async () => {
      const prisma = buildPrismaStub([
        // u1 (target) likes A and B.
        { userId: 'u1', trackId: 'A', createdAt: new Date(10) },
        { userId: 'u1', trackId: 'B', createdAt: new Date(11) },
        // u2 also likes A + B and additionally C — so C is the strongest neighbour.
        { userId: 'u2', trackId: 'A', createdAt: new Date(1) },
        { userId: 'u2', trackId: 'B', createdAt: new Date(2) },
        { userId: 'u2', trackId: 'C', createdAt: new Date(3) },
        // u3 likes A and D but not B — so D is a weaker neighbour than C.
        { userId: 'u3', trackId: 'A', createdAt: new Date(4) },
        { userId: 'u3', trackId: 'D', createdAt: new Date(5) },
      ]);
      const recs = makeService(prisma, buildTracksStub());

      const out = await recs.forUser('u1', 5);
      const ids = out.map((t) => t.id);
      expect(ids).not.toContain('A');
      expect(ids).not.toContain('B');
      expect(ids[0]).toBe('C');
      expect(ids).toContain('D');
    });

    it('falls back to popularity when the user has < 2 likes', async () => {
      const prisma = buildPrismaStub([
        { userId: 'u1', trackId: 'A', createdAt: new Date(1) },
        { userId: 'u2', trackId: 'P', createdAt: new Date(2) },
        { userId: 'u3', trackId: 'P', createdAt: new Date(3) },
        { userId: 'u4', trackId: 'Q', createdAt: new Date(4) },
      ]);
      const recs = makeService(prisma, buildTracksStub());
      const out = await recs.forUser('u1', 5);
      // P has 2 likes, Q has 1 — popularity order, with u1's own A excluded.
      expect(out.map((t) => t.id).slice(0, 2)).toEqual(['P', 'Q']);
      expect(out.map((t) => t.id)).not.toContain('A');
    });

    it('falls back to trending when popularity also exhausts', async () => {
      const prisma = buildPrismaStub([
        // The only like in the system belongs to the target user, so
        // popularity yields nothing after exclusion.
        { userId: 'u1', trackId: 'A', createdAt: new Date(1) },
      ]);
      const tracks = buildTracksStub();
      const recs = makeService(prisma, tracks);
      const out = await recs.forUser('u1', 3);
      expect(out.map((t) => t.id)).toEqual(['trend_0', 'trend_1', 'trend_2']);
      expect(tracks.trending).toHaveBeenCalled();
    });
  });

  describe('popular()', () => {
    it('orders by total like count', async () => {
      const prisma = buildPrismaStub([
        { userId: 'u1', trackId: 'A', createdAt: new Date(1) },
        { userId: 'u2', trackId: 'A', createdAt: new Date(2) },
        { userId: 'u3', trackId: 'A', createdAt: new Date(3) },
        { userId: 'u1', trackId: 'B', createdAt: new Date(4) },
        { userId: 'u2', trackId: 'B', createdAt: new Date(5) },
        { userId: 'u1', trackId: 'C', createdAt: new Date(6) },
      ]);
      const recs = makeService(prisma, buildTracksStub());
      const out = await recs.popular(3);
      expect(out.map((t) => t.id)).toEqual(['A', 'B', 'C']);
    });

    it('falls back to trending when no one has liked anything', async () => {
      const prisma = buildPrismaStub([]);
      const tracks = buildTracksStub();
      const recs = makeService(prisma, tracks);
      const out = await recs.popular(2);
      expect(out.map((t) => t.id)).toEqual(['trend_0', 'trend_1']);
      expect(tracks.trending).toHaveBeenCalledWith(2);
    });
  });
});
