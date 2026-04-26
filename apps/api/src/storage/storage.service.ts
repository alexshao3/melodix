import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID', '');
    this.bucket = this.config.get<string>('R2_BUCKET', 'melodix');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY', ''),
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
