import {
  Controller,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from '../admin-auth/admin.guard';
import { StorageService } from './storage.service';

/**
 * Serves blobs uploaded under the Postgres backend
 * (`STORAGE_BACKEND=postgres`). Supports HTTP Range requests so the
 * `<audio>` element can seek without re-streaming the whole file.
 *
 * For the S3 backend this controller short-circuits to 404 — uploads
 * live on the bucket directly and clients fetch them via `S3_PUBLIC_URL`,
 * not the API.
 *
 * Range implementation note: we fetch only the requested byte range from
 * Postgres via `substring(bytes from … for …)` rather than loading the
 * full blob into memory and slicing it in Node. With TOAST out-of-line
 * storage this means a typical 1 MB seek-jump in a 5 MB MP3 only
 * actually transfers ~1 MB from disk, not 5.
 */
@Controller()
@SkipThrottle()
export class StorageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Admin-guarded info endpoint surfaced as the "Storage backend" stat
   * card on the admin dashboard. Reports the active backend and, for
   * the Postgres backend, the total bytes + object count currently held
   * in the `storage_objects` table so the operator can monitor disk
   * usage without shelling into the DB. The S3 backend doesn't expose
   * usage stats here — checking actual bucket size would require an
   * extra round-trip per dashboard load and the provider's console
   * already shows it.
   */
  @Get('admin/storage/info')
  @UseGuards(AdminGuard)
  async info(): Promise<{
    backend: 's3' | 'postgres';
    objectCount: number | null;
    totalBytes: number | null;
  }> {
    if (this.storage.backendName !== 'postgres') {
      return { backend: this.storage.backendName, objectCount: null, totalBytes: null };
    }
    const [{ count, total } = { count: 0n, total: 0n }] = await this.prisma.$queryRaw<
      Array<{ count: bigint; total: bigint | null }>
    >`SELECT COUNT(*)::bigint AS count, COALESCE(SUM(size), 0)::bigint AS total FROM storage_objects`;
    return {
      backend: 'postgres',
      objectCount: Number(count ?? 0n),
      totalBytes: Number(total ?? 0n),
    };
  }

  @Get('storage/:folder/:filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('Accept-Ranges', 'bytes')
  async serve(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const backend = (this.config.get<string>('STORAGE_BACKEND', 's3') || 's3').toLowerCase();
    if (backend !== 'postgres') {
      throw new NotFoundException();
    }
    if (folder !== 'tracks' && folder !== 'covers') {
      throw new NotFoundException();
    }

    const key = `${folder}/${filename}`;
    const meta = await this.prisma.storageObject.findUnique({
      where: { key },
      select: { mimeType: true, size: true },
    });
    if (!meta) {
      throw new NotFoundException();
    }

    res.setHeader('Content-Type', meta.mimeType);

    const range = req.headers.range;
    const match = range ? /^bytes=(\d+)-(\d+)?$/.exec(range) : null;
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : meta.size - 1;
      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        start >= meta.size ||
        end >= meta.size ||
        start > end
      ) {
        res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        res.setHeader('Content-Range', `bytes */${meta.size}`);
        res.end();
        return;
      }
      const length = end - start + 1;
      // Postgres `substring` is 1-indexed.
      const rows = await this.prisma.$queryRaw<Array<{ slice: Buffer }>>`
        SELECT substring(bytes from ${start + 1} for ${length}) AS slice
        FROM storage_objects
        WHERE key = ${key}
      `;
      const slice = rows[0]?.slice;
      if (!slice) {
        throw new NotFoundException();
      }
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${meta.size}`);
      res.setHeader('Content-Length', String(length));
      res.end(slice);
      return;
    }

    // Full GET — load the whole blob. Acceptable for cover art (<1 MB)
    // and small audio files; for large MP3s the browser almost always
    // sends a Range header on first byte anyway.
    const obj = await this.prisma.storageObject.findUnique({
      where: { key },
      select: { bytes: true },
    });
    if (!obj) {
      throw new NotFoundException();
    }
    res.status(HttpStatus.OK);
    res.setHeader('Content-Length', String(meta.size));
    res.end(obj.bytes);
  }
}
