import { Injectable } from '@nestjs/common';
import type { Track } from '@melodix/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JamendoService } from '../jamendo/jamendo.service';

/**
 * Server-side "recently played" log. Read-side hydrates `Track` payloads from
 * Jamendo on demand (and skips silently if a track no longer resolves) — the
 * Library UI is otherwise fed a stale id with no metadata. Write-side caps at
 * `MAX_HISTORY` rows per user via a single trim query so the table doesn't
 * grow unbounded for power users. See ADR-0014.
 */
@Injectable()
export class HistoryService {
  /**
   * Hard cap on rows per user. Older rows are pruned the moment the user
   * crosses this threshold so the listing query stays cheap and the DB
   * footprint scales linearly with active users, not with playback minutes.
   */
  private static readonly MAX_HISTORY = 200;

  /**
   * Skip writes that arrive within this window of the user's most-recent
   * row for the *same* track. Prevents the player's seek-to-zero / replay
   * pattern from spamming a hundred entries when someone repeats a song.
   */
  private static readonly DEDUP_WINDOW_MS = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jamendo: JamendoService,
  ) {}

  async record(userId: string, trackId: string): Promise<{ ok: true }> {
    const last = await this.prisma.playHistory.findFirst({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      select: { trackId: true, playedAt: true },
    });
    const now = Date.now();
    if (
      last &&
      last.trackId === trackId &&
      now - last.playedAt.getTime() < HistoryService.DEDUP_WINDOW_MS
    ) {
      return { ok: true };
    }

    await this.prisma.playHistory.create({ data: { userId, trackId } });
    await this.trim(userId);
    return { ok: true };
  }

  async list(userId: string, limit = 50): Promise<Track[]> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const rows = await this.prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      take: safeLimit,
      select: { trackId: true, playedAt: true },
    });

    const seen = new Set<string>();
    const tracks: Track[] = [];
    for (const row of rows) {
      if (seen.has(row.trackId)) continue;
      seen.add(row.trackId);
      const track = await this.jamendo.getTrackById(row.trackId.replace(/^jm_/, ''));
      if (track) tracks.push(track);
    }
    return tracks;
  }

  async clear(userId: string): Promise<{ ok: true }> {
    await this.prisma.playHistory.deleteMany({ where: { userId } });
    return { ok: true };
  }

  /**
   * Keep at most `MAX_HISTORY` rows for the user — delete anything older. The
   * `findFirst` skip-by-N query gives us the cutoff timestamp without paging
   * through the entire history, so this stays O(1) on the cap (not on the
   * row count).
   */
  private async trim(userId: string): Promise<void> {
    // After the insert above, the user holds at most MAX_HISTORY+1 rows.
    // Skip past the rows we want to keep (newest first); the next row is the
    // boundary we delete from. `lte` covers both that row and any older
    // ties, which is intentional — we'd rather undershoot by one in the
    // (vanishingly rare) tie case than leave excess rows behind.
    const cutoff = await this.prisma.playHistory.findFirst({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      skip: HistoryService.MAX_HISTORY,
      select: { playedAt: true },
    });
    if (!cutoff) return;
    await this.prisma.playHistory.deleteMany({
      where: { userId, playedAt: { lte: cutoff.playedAt } },
    });
  }
}
