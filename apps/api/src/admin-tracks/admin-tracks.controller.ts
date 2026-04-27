import {
  BadRequestException,
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
import { normalizePeaks } from '../tracks/peaks.util';

@Controller('admin/tracks')
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
    if (!audioFile) throw new BadRequestException('Audio file is required');

    let peaks: number[] | undefined;
    if (dto.peaks) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(dto.peaks);
      } catch {
        throw new BadRequestException('peaks must be a JSON-encoded array of numbers');
      }
      const normalized = normalizePeaks(parsed);
      if (!normalized) {
        throw new BadRequestException(
          'peaks must be a non-empty array of finite numbers in [0, 1]',
        );
      }
      peaks = normalized;
    }

    return this.adminTracks.create(
      {
        title: dto.title,
        artistName: dto.artistName,
        albumName: dto.albumName,
        genre: dto.genre,
        duration: dto.duration,
        peaks,
      },
      audioFile,
      files.cover?.[0],
    );
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
