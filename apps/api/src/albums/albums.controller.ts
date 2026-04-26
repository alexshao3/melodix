import { Controller, Get, Param, Query } from '@nestjs/common';
import { AlbumsService } from './albums.service';

@Controller('albums')
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get()
  list(@Query('limit') limit?: string) {
    return this.albums.list(limit ? parseInt(limit, 10) : 24);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.albums.byId(id);
  }
}
