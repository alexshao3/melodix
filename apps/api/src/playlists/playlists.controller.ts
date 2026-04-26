import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { PlaylistsService } from './playlists.service';

interface AuthedRequest extends Request {
  user?: { id: string; username: string };
}

class CreatePlaylistDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class AddTrackDto {
  @IsString()
  trackId!: string;
}

@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Get('featured')
  featured() {
    return this.playlists.featured();
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.playlists.byId(id, req.user?.id);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@Req() req: AuthedRequest) {
    return this.playlists.list(req.user!.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req: AuthedRequest, @Body() dto: CreatePlaylistDto) {
    return this.playlists.create(req.user!.id, dto.name, dto.description);
  }

  @Post(':id/tracks')
  @UseGuards(AuthGuard('jwt'))
  addTrack(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: AddTrackDto) {
    return this.playlists.addTrack(req.user!.id, id, dto.trackId);
  }

  @Delete(':id/tracks/:trackId')
  @UseGuards(AuthGuard('jwt'))
  removeTrack(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ) {
    return this.playlists.removeTrack(req.user!.id, id, trackId);
  }
}
