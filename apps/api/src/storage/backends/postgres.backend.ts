import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StorageBackend, StorageFolder } from './storage.backend';

/**
 * Postgres database-blob storage. Uploads are written into the
 * `storage_objects` table as `bytea` (TOAST-stored automatically for
 * values > ~2 KB), and served via `GET /api/storage/<folder>/<filename>`
 * with HTTP Range support — see `StorageController`.
 *
 * Required env vars (only when `STORAGE_BACKEND=postgres`):
 *   API_PUBLIC_URL    base URL where this API is reachable from clients,
 *                     e.g. http://localhost:4000 (dev) or
 *                     https://api.melodix.example.com (prod). The
 *                     uploaded URLs become `${API_PUBLIC_URL}/api/storage/<key>`,
 *                     so they must be fetchable from the user's browser
 *                     (web + miniapp).
 *
 * Use this backend when you'd rather have a single self-hosted Postgres
 * deal with both data and binary blobs (e.g. behind Cloudflare Tunnel,
 * with `pg_dump` capturing full app state). For larger catalogues or
 * heavier traffic, prefer the S3 backend behind a Cloudflare CDN.
 */
export class PostgresStorageBackend implements StorageBackend {
  readonly name = 'postgres' as const;
  private readonly publicUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
    private readonly logger: Logger,
  ) {
    // Trim trailing slashes so we can safely append `/api/storage/<key>`.
    this.publicUrl = (config.get<string>('API_PUBLIC_URL', '') || '').replace(/\/+$/, '');
    if (!this.publicUrl) {
      this.logger.warn(
        '[postgres] API_PUBLIC_URL is not set; uploaded URLs will be relative ' +
          '(/api/storage/<key>) and may not resolve from the web/miniapp origins. ' +
          'Set API_PUBLIC_URL to the public base URL of the API (e.g. https://api.melodix.example.com).',
      );
    }
  }

  async upload(
    file: Buffer,
    originalName: string,
    contentType: string,
    folder: StorageFolder,
  ): Promise<string> {
    const ext = path.extname(originalName) || (folder === 'tracks' ? '.mp3' : '.jpg');
    const filename = `${crypto.randomUUID()}${ext}`;
    const key = `${folder}/${filename}`;

    // Prisma's `Bytes` field is typed `Uint8Array<ArrayBuffer>` (i.e.
    // not `SharedArrayBuffer`-backed). Node's Buffer is technically
    // `Uint8Array<ArrayBufferLike>`, so we copy into a fresh
    // ArrayBuffer-backed view to satisfy the stricter signature.
    const bytes = new Uint8Array(new ArrayBuffer(file.byteLength));
    bytes.set(file);

    await this.prisma.storageObject.create({
      data: {
        key,
        folder,
        filename,
        mimeType: contentType,
        size: file.length,
        bytes,
      },
    });

    const url = `${this.publicUrl}/api/storage/${key}`;
    this.logger.log(`[postgres] uploaded ${key} (${file.length} bytes)`);
    return url;
  }

  async delete(url: string): Promise<void> {
    // URL shape: `${publicUrl}/api/storage/<folder>/<filename>` — extract
    // the trailing `<folder>/<filename>` regardless of whether the URL is
    // absolute or relative.
    const marker = '/api/storage/';
    const idx = url.indexOf(marker);
    const key = idx >= 0 ? url.slice(idx + marker.length) : url;

    await this.prisma.storageObject.deleteMany({ where: { key } });
    this.logger.log(`[postgres] deleted ${key}`);
  }
}
