import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Quỹ Từ Thiện Trái Tim Nhân Ái - Cập nhật',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Organization description (mission, vision, activities)',
    example:
      'Tổ chức từ thiện phi lợi nhuận với mục tiêu mang lại cuộc sống tốt đẹp hơn cho trẻ em nghèo',
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
    example: 'info@traitim-charity.org',
    required: false,
  })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '0287654321',
    required: false,
  })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({
    description: 'Physical address / headquarters location',
    example: '456 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
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
