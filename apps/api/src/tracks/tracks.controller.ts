import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { TracksService, type TrackSourceFilter } from './tracks.service';

/**
 * Validate the `?source=` query param. Anything other than `jamendo`,
 * `upload`, or omitted is rejected so a typo doesn't silently degrade
 * to "all sources" — that would mask client bugs.
 */
function parseSource(raw?: string): TrackSourceFilter | undefined {
  if (raw === undefined || raw === '' || raw === 'all') return undefined;
  if (raw === 'jamendo' || raw === 'upload') return raw;
  throw new BadRequestException(
    `Invalid source filter '${raw}'. Expected 'jamendo', 'upload', or omitted.`,
  );
}

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracks: TracksService) {}

  @Get('trending')
  trending(@Query('limit') limit?: string, @Query('source') source?: string) {
    return this.tracks.trending(limit ? parseInt(limit, 10) : 24, parseSource(source));
  }

  @Get('new-releases')
  newReleases(@Query('limit') limit?: string, @Query('source') source?: string) {
    return this.tracks.newReleases(limit ? parseInt(limit, 10) : 24, parseSource(source));
  }

  @Get('genre/:genre')
  byGenre(
    @Param('genre') genre: string,
    @Query('limit') limit?: string,
    @Query('source') source?: string,
  ) {
    return this.tracks.byGenre(genre, limit ? parseInt(limit, 10) : 24, parseSource(source));
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.tracks.byId(id);
  }
}
