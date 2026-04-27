/**
 * StorageBackend — abstraction over where uploaded audio + cover files live.
 *
 * Two implementations ship today:
 *   - `S3StorageBackend` (default): uploads to any S3-compatible provider
 *     (Backblaze B2, Cloudflare R2, Storj, MinIO, AWS S3…). See ADR-0025.
 *   - `PostgresStorageBackend`: stores blobs as `bytea` in the existing
 *     Postgres database. Useful for self-hosted deploys where the operator
 *     wants a single backend (DB dump = full state) and traffic is small.
 *     See ADR-0026.
 *
 * The active backend is chosen at boot via `STORAGE_BACKEND=s3|postgres`
 * (default `s3`).
 */

export type StorageFolder = 'tracks' | 'covers';

export type StorageBackendName = 's3' | 'postgres';

export interface StorageBackend {
  /** Identifier surfaced via the admin "Storage backend" stat card. */
  readonly name: StorageBackendName;

  /**
   * Persist `file` and return the public URL clients should use to fetch
   * it. The URL goes straight into `Track.audioUrl` / `Track.cover`, so it
   * must be a fully-qualified, browser-fetchable string for S3 backends
   * and an `${API_PUBLIC_URL}/api/storage/<key>` URL for Postgres.
   */
  upload(
    file: Buffer,
    originalName: string,
    contentType: string,
    folder: StorageFolder,
  ): Promise<string>;

  /**
   * Best-effort delete by URL — must mirror what `upload()` returned. The
   * caller swallows errors (deletion is idempotent against partial state).
   */
  delete(url: string): Promise<void>;
}
