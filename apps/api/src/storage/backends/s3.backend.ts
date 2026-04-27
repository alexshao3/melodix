import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import type { StorageBackend, StorageFolder } from './storage.backend';

/**
 * S3-compatible object storage. Defaults are tuned for Backblaze B2
 * (free tier: 10 GB, no card required) but the same settings work for
 * any S3-compatible provider (Backblaze B2, Cloudflare R2, Storj,
 * MinIO, AWS S3…).
 *
 * Required env vars:
 *   S3_ENDPOINT             e.g. https://s3.us-west-004.backblazeb2.com
 *   S3_REGION               e.g. us-west-004 (use 'auto' for R2)
 *   S3_ACCESS_KEY_ID        provider key id
 *   S3_SECRET_ACCESS_KEY    provider secret
 *   S3_BUCKET               bucket name (default: melodix)
 *   S3_PUBLIC_URL           public base url for the bucket
 *                           e.g. https://f004.backblazeb2.com/file/<bucket>
 *
 * Optional:
 *   S3_FORCE_PATH_STYLE     'true' to force path-style URLs (rarely needed)
 */
export class S3StorageBackend implements StorageBackend {
  readonly name = 's3' as const;
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    config: ConfigService,
    private readonly logger: Logger,
  ) {
    const endpoint = config.get<string>('S3_ENDPOINT', '');
    const region = config.get<string>('S3_REGION', 'auto');
    const forcePathStyle =
      config.get<string>('S3_FORCE_PATH_STYLE', 'false').toLowerCase() === 'true';

    this.bucket = config.get<string>('S3_BUCKET', 'melodix');
    this.publicUrl = config.get<string>('S3_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async upload(
    file: Buffer,
    originalName: string,
    contentType: string,
    folder: StorageFolder,
  ): Promise<string> {
    const ext = path.extname(originalName) || (folder === 'tracks' ? '.mp3' : '.jpg');
    const key = `${folder}/${crypto.randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      }),
    );

    const url = this.publicUrl ? `${this.publicUrl}/${key}` : key;
    this.logger.log(`[s3] uploaded ${key} (${file.length} bytes)`);
    return url;
  }

  async delete(url: string): Promise<void> {
    const key = this.publicUrl ? url.replace(`${this.publicUrl}/`, '') : url;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`[s3] deleted ${key}`);
  }
}
