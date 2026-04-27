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

  /**
   * Optional plain-text lyrics for the track. When provided alongside the
   * audio, the admin can later trigger Aeneas auto-sync to derive an LRC.
   * SUNO AI exposes the source lyrics on every generation page, so the
   * upload form lets the operator paste them in directly.
   */
  @IsOptional()
  @IsString()
  lyrics?: string;
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

  /**
   * Plain-text lyrics. Pass an empty string to clear; omit to leave
   * unchanged. Updating this does NOT automatically re-run alignment;
   * the admin must explicitly POST /tracks/:id/auto-sync-lyrics to
   * regenerate `syncedLyrics`.
   */
  @IsOptional()
  @IsString()
  lyrics?: string;
}

export class AutoSyncLyricsDto {
  /**
   * ISO 639-3 language code passed to Aeneas's eSpeak voice. Defaults to
   * `eng` server-side; pass `vie` for Vietnamese, `cmn` for Mandarin, etc.
   */
  @IsOptional()
  @IsString()
  language?: string;

  /**
   * Optional override — if provided, replaces the track's stored lyrics
   * before alignment (so the admin can fix typos without a separate save).
   * Otherwise the existing `Track.lyrics` value is used.
   */
  @IsOptional()
  @IsString()
  lyrics?: string;
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
