import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BankInfoDto } from '../../../common/dto/bank-info.dto';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign title',
    example: 'Clean Water for Rural Communities',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description:
      'Campaign description (detailed information about the campaign)',
    example:
      'This campaign aims to provide clean water access to 100 rural families in mountainous areas through building water filtration systems.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Short summary of the campaign (1-2 sentences)',
    example: 'Help 100 families access clean water',
    required: false,
  })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({
    description: 'Cover image URL for the campaign',
    example: 'https://example.com/images/water-campaign.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({
    description: 'Target donation amount (goal)',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  goalAmount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    default: 'USD',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description:
      'Organization ID managing this campaign (optional - only for organization members)',
    example: '676a1b2c3d4e5f6a7b8c9d0e',
    required: false,
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({
    description: 'Campaign start date (ISO 8601 format)',
    example: '2025-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Campaign end date (ISO 8601 format)',
    example: '2025-12-31T23:59:59.999Z',
    type: String,
    format: 'date-time',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Campaign category/theme',
    example: 'Environment',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Campaign tags for categorization and search',
    example: ['water', 'rural', 'health', 'environment'],
    type: [String],
    required: false,
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description:
      'Tài khoản ngân hàng riêng của campaign để nhận donate qua QR VietQR. ' +
      'Nếu để trống, hệ thống tự động dùng TK của Tổ chức (nếu có) hoặc User tạo campaign.',
    required: false,
    type: () => BankInfoDto,
    example: {
      bankName: 'MB Bank',
      bankBin: '970422',
      accountNumber: '0123456789',
      accountName: 'NGUYEN VAN AN',
    },
  })
  @ValidateNested()
  @Type(() => BankInfoDto)
  @IsOptional()
  bankInfo?: BankInfoDto;

  @ApiProperty({
    description:
      'SePay API Key riêng của campaign (lấy từ https://sepay.vn → Dashboard → API Key). ' +
      'Ưu tiên cao nhất khi polling — dùng khi campaign có TK nhận tiền riêng biệt với Org/User.',
    required: false,
    example: 'DBVPAXKV3EUXCLQMBEWYJVAKSPUOCODSTC097AJYRC6VRE4N0Q1',
  })
  @IsString()
  @IsOptional()
  sepayApiKey?: string;
}
