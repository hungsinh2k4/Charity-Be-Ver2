import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../auth/interfaces';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || '';
    const projectId = this.configService.get<string>('GCS_PROJECT_ID');

    this.storage = new Storage(projectId ? { projectId } : undefined);
  }

  async uploadVerificationDocument(
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
  ) {
    if (!this.bucketName) {
      throw new InternalServerErrorException('GCS_BUCKET_NAME is not configured');
    }

    this.validateFile(file);

    const fileKey = this.buildVerificationFileKey(file!, user.userId);
    const bucketFile = this.storage.bucket(this.bucketName).file(fileKey);

    await bucketFile.save(file!.buffer, {
      resumable: false,
      contentType: file!.mimetype,
      metadata: {
        contentType: file!.mimetype,
        metadata: {
          originalName: file!.originalname,
          uploadedBy: user.userId,
        },
      },
    });

    const signedUrl = await this.createReadSignedUrl(fileKey);

    return {
      fileKey,
      signedUrl: signedUrl.url,
      signedUrlExpiresAt: signedUrl.expiresAt,
      contentType: file!.mimetype,
      size: file!.size,
    };
  }

  async createReadSignedUrl(fileKey: string) {
    if (!this.bucketName) {
      throw new InternalServerErrorException('GCS_BUCKET_NAME is not configured');
    }

    if (!fileKey || fileKey.includes('..') || fileKey.startsWith('/')) {
      throw new BadRequestException('Invalid fileKey');
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(fileKey)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt,
      });

    return {
      url,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private validateFile(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPG, PNG, WebP, and PDF files are allowed',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size must be 10MB or smaller');
    }
  }

  private buildVerificationFileKey(file: Express.Multer.File, userId: string) {
    const extension = this.getExtension(file);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `verification/${userId}/${timestamp}-${randomUUID()}${extension}`;
  }

  private getExtension(file: Express.Multer.File) {
    const originalExtension = file.originalname.match(/\.[a-zA-Z0-9]+$/)?.[0];
    if (originalExtension) {
      return originalExtension.toLowerCase();
    }

    switch (file.mimetype) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'application/pdf':
        return '.pdf';
      default:
        return '';
    }
  }
}
