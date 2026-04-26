import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../admin-auth/admin.guard';
import { AdminTracksService } from './admin-tracks.service';
import { CreateTrackDto, UpdateTrackDto, ListTracksQueryDto } from './admin-tracks.dto';

@Controller('api/admin/tracks')
@UseGuards(AdminGuard)
export class AdminTracksController {
  constructor(private readonly adminTracks: AdminTracksService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'audio', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ]),
  )
  create(
    @Body() dto: CreateTrackDto,
    @UploadedFiles()
    files: { audio?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    const audioFile = files.audio?.[0];
    if (!audioFile) throw new Error('Audio file is required');
    return this.adminTracks.create(dto, audioFile, files.cover?.[0]);
  }

  @Get()
  list(@Query() query: ListTracksQueryDto) {
    return this.adminTracks.list(query);
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'cover', maxCount: 1 }]))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTrackDto,
    @UploadedFiles() files: { cover?: Express.Multer.File[] },
  ) {
    return this.adminTracks.update(id, dto, files?.cover?.[0]);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminTracks.remove(id);
  }
}
