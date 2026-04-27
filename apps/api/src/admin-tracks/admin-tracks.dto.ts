import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
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

  /**
   * JSON-serialized array of normalized [0, 1] amplitudes (~200 samples)
   * computed client-side at upload via `OfflineAudioContext`. Sent as a
   * string field in the multipart form because `class-validator` can't
   * deserialize JSON out of `multer` text fields directly. The controller
   * parses + validates the shape before passing it to the service.
   */
  @IsOptional()
  @IsString()
  peaks?: string;
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

/**
 * Bulk operations cap at 200 ids per request — picked to comfortably
 * cover a "select-all on page 20-rows" flow with headroom, while keeping
 * a single batch under Postgres / object-storage round-trip latency budgets.
 */
const BULK_MAX = 200;

export class BulkDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(BULK_MAX)
  @IsString({ each: true })
  ids!: string[];
}

export class BulkGenreDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(BULK_MAX)
  @IsString({ each: true })
  ids!: string[];

  /**
   * `null` clears the genre. Passed as a regular field (not undefined) so
   * the action is intentional.
   */
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  genre!: string | null;
}
