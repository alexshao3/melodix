import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin-auth/admin.guard';
import { MusicSourcesService } from './music-sources.service';
import { ToggleSourceDto } from './music-sources.dto';

@Controller('admin/sources')
@UseGuards(AdminGuard)
export class MusicSourcesController {
  constructor(private readonly sources: MusicSourcesService) {}

  @Get()
  list() {
    return this.sources.list();
  }

  @Patch(':name')
  toggle(@Param('name') name: string, @Body() dto: ToggleSourceDto) {
    return this.sources.toggle(name, dto.enabled);
  }
}
