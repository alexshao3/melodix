import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArtistsService } from './artists.service';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    return this.artists.list(limit ? parseInt(limit, 10) : 24);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.artists.byId(id);
  }
}
