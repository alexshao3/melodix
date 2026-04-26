import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import { HistoryService } from './history.service';

interface AuthedRequest extends Request {
  user: { id: string; username: string };
}

class RecordPlayDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  trackId!: string;
}

class ListHistoryDto {
  // Query params arrive as strings; the global ValidationPipe runs with
  // `transform: true` but without `enableImplicitConversion`, so we need
  // `@Type(() => Number)` to coerce `?limit=50` before `@IsInt` runs.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

@Controller('me/history')
@UseGuards(AuthGuard('jwt'))
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  list(@Req() req: AuthedRequest, @Query() query: ListHistoryDto) {
    const limit = query.limit ?? 50;
    return this.history.list(req.user.id, limit);
  }

  @Post()
  record(@Req() req: AuthedRequest, @Body() dto: RecordPlayDto) {
    return this.history.record(req.user.id, dto.trackId);
  }

  @Delete()
  clear(@Req() req: AuthedRequest) {
    return this.history.clear(req.user.id);
  }
}
