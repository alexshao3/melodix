import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { LyricsService, type LyricsResponse } from './lyrics.service';

/**
 * `GET /api/lyrics?artist=…&title=…` — returns `{ artist, title, lyrics, source }`.
 * Public (no auth). Cached in Redis (24h on hit, 1h on miss) to keep the
 * upstream free `lyrics.ovh` provider happy. See ADR-0017.
 */
@Controller('lyrics')
export class LyricsController {
  constructor(private readonly lyrics: LyricsService) {}

  // The default throttler buckets are fine for this endpoint, but we want
  // to be explicit: lyrics is a read of a free upstream, no auth, low cost
  // when cached, so we keep the global limits and skip the stricter
  // `auth` bucket which only applies to /auth/* anyway.
  @SkipThrottle({ auth: true })
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  async get(
    @Query('artist') artist?: string,
    @Query('title') title?: string,
  ): Promise<LyricsResponse> {
    if (!artist || !title) {
      return {
        artist: artist ?? '',
        title: title ?? '',
        lyrics: null,
        source: 'none',
      };
    }
    return this.lyrics.fetch(artist, title);
  }
}
