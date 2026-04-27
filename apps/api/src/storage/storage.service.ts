import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { StorageBackend, StorageBackendName, StorageFolder } from './backends/storage.backend';
import { S3StorageBackend } from './backends/s3.backend';
import { PostgresStorageBackend } from './backends/postgres.backend';

/**
 * Thin facade over the active storage backend. Picks the implementation
 * once at boot based on `STORAGE_BACKEND=s3|postgres` (default `s3`).
 *
 * - `s3`: S3-compatible object storage. Defaults tuned for Backblaze B2;
 *   works for any S3-compatible provider. See ADR-0025 and
 *   `S3StorageBackend` for the env var list.
 * - `postgres`: blobs stored as `bytea` in the existing Postgres database
 *   and served via `GET /api/storage/<key>` with HTTP Range support.
 *   See ADR-0026 and `PostgresStorageBackend`.
 *
 * The interface (`upload` / `delete`) is identical across backends so the
 * call sites in `AdminTracksService` don't care which one is active.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly backend: StorageBackend;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const requested = (this.config.get<string>('STORAGE_BACKEND', 's3') || 's3').toLowerCase();
    if (requested === 'postgres') {
      this.backend = new PostgresStorageBackend(this.prisma, this.config, this.logger);
    } else {
      this.backend = new S3StorageBackend(this.config, this.logger);
    }
    this.logger.log(`Storage backend: ${this.backend.name}`);
  }

  get backendName(): StorageBackendName {
    return this.backend.name;
  }

  upload(
    file: Buffer,
    originalName: string,
    contentType: string,
    folder: StorageFolder,
  ): Promise<string> {
    return this.backend.upload(file, originalName, contentType, folder);
  }

  delete(url: string): Promise<void> {
    return this.backend.delete(url);
  }
}
