import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket =
      this.configService.get<string>('STORAGE_BUCKET') ||
      this.configService.get<string>('MINIO_BUCKET') ||
      'rent-finder';

    const storageEndpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    const endpoint = storageEndpoint
      ? storageEndpoint
      : `http://${this.configService.get('MINIO_ENDPOINT')}:${this.configService.get('MINIO_PORT')}`;

    const region =
      this.configService.get<string>('STORAGE_REGION') || 'us-east-1';

    const accessKeyId =
      this.configService.get<string>('STORAGE_ACCESS_KEY') ||
      this.configService.get<string>('MINIO_ACCESS_KEY') ||
      '';

    const secretAccessKey =
      this.configService.get<string>('STORAGE_SECRET_KEY') ||
      this.configService.get<string>('MINIO_SECRET_KEY') ||
      '';

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async optimizeImage(
    buffer: Buffer,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 80,
  ): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
    try {
      const optimizedBuffer = await sharp(buffer)
        .rotate()
        .resize({
          width: maxWidth,
          height: maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      return {
        buffer: optimizedBuffer,
        contentType: 'image/webp',
        extension: 'webp',
      };
    } catch {
      return {
        buffer,
        contentType: 'application/octet-stream',
        extension: 'bin',
      };
    }
  }

  async uploadFile(
    fileName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    return this.getPublicUrl(fileName);
  }

  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    const { buffer, contentType, extension } = await this.optimizeImage(
      file.buffer,
      300,
      300,
      80,
    );
    const fileName = `users/${randomUUID()}.${extension}`;

    return this.uploadFile(fileName, buffer, contentType);
  }

  async uploadListingImage(file: Express.Multer.File): Promise<string> {
    const { buffer, contentType, extension } = await this.optimizeImage(
      file.buffer,
      1200,
      1200,
      80,
    );
    const baseName =
      file.originalname.substring(0, file.originalname.lastIndexOf('.')) ||
      file.originalname;
    const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `listings/${randomUUID()}-${cleanName}.${extension}`;

    return this.uploadFile(fileName, buffer, contentType);
  }

  async uploadMessageAttachment(file: Express.Multer.File): Promise<string> {
    const isImage =
      file.mimetype?.startsWith('image/') &&
      !file.mimetype.includes('svg+xml') &&
      !file.mimetype.includes('gif');

    if (isImage) {
      const { buffer, contentType, extension } = await this.optimizeImage(
        file.buffer,
        1200,
        1200,
        80,
      );

      if (extension === 'webp') {
        const baseName =
          file.originalname.substring(0, file.originalname.lastIndexOf('.')) ||
          file.originalname;
        const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `messages/${randomUUID()}-${cleanName}.${extension}`;

        return this.uploadFile(fileName, buffer, contentType);
      }
    }

    const fileName = `messages/${randomUUID()}-${file.originalname}`;
    return this.uploadFile(fileName, file.buffer, file.mimetype);
  }

  getPublicUrl(fileName: string): string {
    const publicBaseUrl = this.configService.get<string>('STORAGE_PUBLIC_URL');
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/+$/, '')}/${fileName}`;
    }

    return `http://${this.configService.get(
      'MINIO_ENDPOINT',
    )}:${this.configService.get('MINIO_PORT')}/${this.bucket}/${fileName}`;
  }
}
