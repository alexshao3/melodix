import { Controller, Get, Param, Query } from '@nestjs/common';
import { TracksService } from './tracks.service';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracks: TracksService) {}

  @Get('trending')
  trending(@Query('limit') limit?: string) {
    return this.tracks.trending(limit ? parseInt(limit, 10) : 24);
  }

  @Get('new-releases')
  newReleases(@Query('limit') limit?: string) {
    return this.tracks.newReleases(limit ? parseInt(limit, 10) : 24);
  }

  @Get('genre/:genre')
  byGenre(@Param('genre') genre: string, @Query('limit') limit?: string) {
    return this.tracks.byGenre(genre, limit ? parseInt(limit, 10) : 24);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.tracks.byId(id);
  }
}
