import { Injectable } from '@nestjs/common';
import type { Track } from '@melodix/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TracksService } from '../tracks/tracks.service';
import { CacheService } from '../cache/cache.service';

/**
 * Item-item collaborative filtering over the `Like` table, plus
 * popularity-based cold-start fallbacks. See ADR-0024.
 *
 * The implementation is deliberately small and self-contained — no vector
 * store, no batch job. Likes are sparse enough today (~10⁰–10² per user)
 * that we can compute similarity on demand in a single SQL round trip and
 * cache the result for a few minutes. When the catalogue grows we can swap
 * the body of `similar()` for a precomputed `track_similarity` table
 * without touching the public surface.
 *
 * Track ids are heterogeneous strings — `jm_<jamendoId>` for Jamendo,
 * `demo_t_<id>` for the bundled demo tracks, plain cuids for uploads. We
 * resolve them through `TracksService.byId()` which already handles the
 * three sources, so a recommendation list can mix sources transparently.
 */
@Injectable()
export class RecommendationsService {
  /** TTL for cached recommendation rows (seconds). 5 min keeps us
   *  responsive while still absorbing the brunt of repeated home-page hits.
   *  `CacheService.wrap` takes seconds (matches the rest of the codebase). */
  private readonly CACHE_TTL_SEC = 5 * 60;
  /** How many of the user's most recent likes we fan out over. Older
   *  likes still influence the result (their tracks may surface as
   *  similar to a recent like) but we don't want a 5-year-old taste
   *  profile to drown out current preferences. */
  private readonly USER_FANOUT_LIMIT = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tracks: TracksService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Tracks similar to `trackId` based on user co-likes. Pure item-item CF
   * over the `Like` table — Jaccard-like scoring (number of users who
   * liked both / sqrt(|U_a| * |U_b|), i.e. cosine similarity of the
   * binary like vectors).
   */
  async similar(trackId: string, limit = 20): Promise<Track[]> {
    if (!trackId || limit <= 0) return [];

    const cacheKey = `recs:similar:${trackId}:${limit}`;
    return this.cache.wrap(cacheKey, this.CACHE_TTL_SEC, async () => {
      const scored = await this.similarTrackIds(trackId, limit);
      return this.resolveTracks(scored.map((s) => s.trackId));
    });
  }

  /**
   * Personal "Made for you" — fans out from the user's recent likes,
   * aggregates similarity scores, drops anything they've already liked,
   * and falls back to popularity when the user has too few likes for CF
   * to produce a useful signal.
   */
  async forUser(userId: string, limit = 20): Promise<Track[]> {
    if (!userId || limit <= 0) return [];

    const cacheKey = `recs:user:${userId}:${limit}`;
    return this.cache.wrap(cacheKey, this.CACHE_TTL_SEC, () => this.computeForUser(userId, limit));
  }

  /**
   * Public "popular" feed — sorted by total like count. Used as the
   * cold-start fallback for both `forUser` (when the user is new) and as
   * an anonymous endpoint for guests on the home page.
   */
  async popular(limit = 20): Promise<Track[]> {
    if (limit <= 0) return [];

    const cacheKey = `recs:popular:${limit}`;
    return this.cache.wrap(cacheKey, this.CACHE_TTL_SEC, async () => {
      const ids = await this.popularTrackIds(limit);
      const resolved = await this.resolveTracks(ids);
      // Final cold-start: if no one has liked anything yet (fresh
      // install / empty DB), fall back to the trending feed so the
      // surface is never empty. `TracksService.trending` itself falls
      // back to `DEMO_TRACKS` when Jamendo isn't configured, so this
      // path is safe in any deployment shape.
      if (resolved.length === 0) return this.tracks.trending(limit);
      return resolved;
    });
  }

  // ── Internal helpers ──────────────────────────────────────────────

  private async computeForUser(userId: string, limit: number): Promise<Track[]> {
    const recentLikes = await this.prisma.like.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: this.USER_FANOUT_LIMIT,
      select: { trackId: true },
    });
    const liked = new Set(recentLikes.map((l) => l.trackId));

    // Fewer than 2 likes ≈ no meaningful CF signal — fall back to
    // global popularity. We *still* exclude already-liked tracks below.
    if (liked.size < 2) {
      return this.popularExcluding(liked, limit);
    }

    // Aggregate similarity scores across the user's recent likes.
    const scores = new Map<string, number>();
    for (const seedId of liked) {
      const neighbours = await this.similarTrackIds(seedId, limit * 2);
      for (const { trackId, score } of neighbours) {
        if (liked.has(trackId)) continue;
        scores.set(trackId, (scores.get(trackId) ?? 0) + score);
      }
    }

    if (scores.size === 0) {
      // CF produced nothing (e.g. the user's likes are unique to them in
      // the dataset). Fall back to popularity, still excluding their
      // already-liked tracks.
      return this.popularExcluding(liked, limit);
    }

    const ranked = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([trackId]) => trackId);

    return this.resolveTracks(ranked);
  }

  /**
   * Co-like neighbours of `seedTrackId`. Cosine on the binary like
   * vectors:  similarity = |U_a ∩ U_b| / sqrt(|U_a| * |U_b|).
   * Returns the raw [trackId, score] pairs — callers either resolve them
   * to Tracks (`similar()`) or aggregate scores across multiple seeds
   * (`computeForUser()`).
   */
  private async similarTrackIds(
    seedTrackId: string,
    limit: number,
  ): Promise<Array<{ trackId: string; score: number }>> {
    type Row = { track_id: string; co_likes: bigint; total: bigint };
    const rows = await this.prisma.$queryRaw<Row[]>`
      WITH seed_users AS (
        SELECT "userId" FROM likes WHERE "trackId" = ${seedTrackId}
      ),
      seed_size AS (
        SELECT COUNT(*) AS n FROM seed_users
      )
      SELECT
        l."trackId" AS track_id,
        COUNT(*)::bigint AS co_likes,
        (SELECT COUNT(*)::bigint FROM likes l2 WHERE l2."trackId" = l."trackId") AS total
      FROM likes l
      JOIN seed_users s ON s."userId" = l."userId"
      WHERE l."trackId" <> ${seedTrackId}
      GROUP BY l."trackId"
      ORDER BY co_likes DESC, total DESC
      LIMIT ${limit};
    `;

    if (rows.length === 0) return [];

    // Pull seed_size in a second tiny query so the main query stays
    // pure-aggregate (Postgres can't otherwise expose the seed size to
    // every result row without a window function dance).
    const seedSizeRow = await this.prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM likes WHERE "trackId" = ${seedTrackId};
    `;
    const seedSize = Number(seedSizeRow[0]?.n ?? 0);
    if (seedSize === 0) return [];

    return rows.map((r) => ({
      trackId: r.track_id,
      score: Number(r.co_likes) / Math.sqrt(seedSize * Number(r.total)),
    }));
  }

  /**
   * Popularity feed, filtered against `excluded`. If popularity (i.e. the
   * `Like` table) is empty or fully exhausted by the exclusion set, fall
   * back to `TracksService.trending` so the surface is never empty for a
   * brand-new account.
   */
  private async popularExcluding(excluded: Set<string>, limit: number): Promise<Track[]> {
    const popular = await this.popularTrackIds(limit + excluded.size);
    const ids = popular.filter((id) => !excluded.has(id)).slice(0, limit);
    const resolved = await this.resolveTracks(ids);
    if (resolved.length >= limit) return resolved;

    // Top up from trending if popularity didn't fill the page. Resolve
    // trending in addition to (not instead of) `resolved` so the user's
    // earliest co-likes still surface above pure trending.
    const trending = await this.tracks.trending(limit + excluded.size + resolved.length);
    const seen = new Set([...excluded, ...resolved.map((t) => t.id)]);
    for (const t of trending) {
      if (resolved.length >= limit) break;
      if (seen.has(t.id)) continue;
      resolved.push(t);
      seen.add(t.id);
    }
    return resolved;
  }

  private async popularTrackIds(limit: number): Promise<string[]> {
    type Row = { track_id: string };
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT "trackId" AS track_id, COUNT(*) AS c
      FROM likes
      GROUP BY "trackId"
      ORDER BY c DESC
      LIMIT ${limit};
    `;
    return rows.map((r) => r.track_id);
  }

  /**
   * Resolve a list of opaque track ids (jm_/demo_t_/cuid) to full Track
   * objects via `TracksService.byId`. We ignore individual lookup
   * failures — a Jamendo id that 404s today shouldn't blank out the
   * whole recommendation list, and uploaded tracks may have been
   * deleted between the like and the recommendation request.
   */
  private async resolveTracks(ids: string[]): Promise<Track[]> {
    const out: Track[] = [];
    for (const id of ids) {
      try {
        const t = await this.tracks.byId(id);
        out.push(t);
      } catch {
        // Skip missing / deleted tracks.
      }
    }
    return out;
  }
}
