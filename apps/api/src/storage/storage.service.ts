import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

/**
 * S3-compatible object storage. Defaults are tuned for Backblaze B2
 * (free tier: 10 GB, no card required) but the same settings work for any
 * S3-compatible provider (Backblaze B2, Cloudflare R2, Storj, MinIO, AWS S3…).
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
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT', '');
    const region = this.config.get<string>('S3_REGION', 'auto');
    const forcePathStyle =
      this.config.get<string>('S3_FORCE_PATH_STYLE', 'false').toLowerCase() === 'true';

    this.bucket = this.config.get<string>('S3_BUCKET', 'melodix');
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async upload(
    file: Buffer,
    originalName: string,
    contentType: string,
    folder: 'tracks' | 'covers',
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
    this.logger.log(`Uploaded ${key} (${file.length} bytes)`);
    return url;
  }

  async delete(url: string): Promise<void> {
    const key = this.publicUrl ? url.replace(`${this.publicUrl}/`, '') : url;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted ${key}`);
  }
}
