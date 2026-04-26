import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTrackDto {
  @IsString()
  title!: string;

  @IsString()
  artistName!: string;

  @IsOptional()
  @IsString()
  albumName?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  duration?: number;
}

export class UpdateTrackDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artistName?: string;

  @IsOptional()
  @IsString()
  albumName?: string;

  @IsOptional()
  @IsString()
  genre?: string;
}

export class ListTracksQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
