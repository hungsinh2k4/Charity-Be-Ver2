import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsUrl,
  IsArray,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateOrganizationDto {
  @ApiProperty({
    description:
      'User ID who owns this organization (will be set from JWT token automatically)',
    example: '676a1b2c3d4e5f6a7b8c9d0e',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  userId: Types.ObjectId;

  @ApiProperty({
    description: 'Organization name',
    example: 'Quỹ Từ Thiện Trái Tim Nhân Ái',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Organization description (mission, vision, activities)',
    example:
      'Tổ chức từ thiện phi lợi nhuận hoạt động trong lĩnh vực giáo dục và y tế cho trẻ em nghèo vùng cao',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Organization website URL',
    example: 'https://traitim-charity.org',
    required: false,
  })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Contact email address',
    example: 'contact@traitim-charity.org',
    required: false,
  })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '0901234567',
    required: false,
  })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({
    description: 'Physical address / headquarters location',
    example: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description:
      'Legal documents URLs for verification (business license, registration certificate, etc.)',
    example: [
      'https://storage.example.com/docs/license.pdf',
      'https://storage.example.com/docs/certificate.jpg',
    ],
    required: false,
  })
  @IsArray()
  @IsOptional()
  legalDocuments?: string[];
}
