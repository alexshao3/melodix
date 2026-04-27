import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { RecommendationsService } from './recommendations.service';

interface AuthedRequest extends Request {
  user: { id: string; username: string };
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

/**
 * Recommendation surface. Mounted under the global `/api` prefix
 * (configured in `main.ts`), so the public routes are:
 *   GET /api/recommendations/me           (authed)
 *   GET /api/recommendations/popular      (public)
 *   GET /api/recommendations/similar/:id  (public)
 */
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  /**
   * "Made for you" — requires a logged-in user. Returns 20 personalised
   * tracks by default, capped at 50.
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  forMe(@Req() req: AuthedRequest, @Query('limit') limit?: string) {
    return this.recs.forUser(req.user.id, parseLimit(limit));
  }

  /**
   * Public popularity feed — used as the home-page recommendation
   * section for guests. Same shape as `forMe` so the client can use one
   * card list either way.
   */
  @Get('popular')
  popular(@Query('limit') limit?: string) {
    return this.recs.popular(parseLimit(limit));
  }

  /**
   * "Listeners also liked" — given a track id (`jm_<jamendoId>` /
   * `demo_t_<id>` / cuid), return up to 20 co-liked tracks. Public; no
   * auth needed.
   */
  @Get('similar/:trackId')
  similar(@Param('trackId') trackId: string, @Query('limit') limit?: string) {
    return this.recs.similar(trackId, parseLimit(limit));
  }
}
