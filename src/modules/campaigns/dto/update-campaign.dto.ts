import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BankInfoDto } from '../../../common/dto/bank-info.dto';

export class UpdateCampaignDto {
  @ApiProperty({ description: 'Campaign title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Campaign description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Short summary', required: false })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({ description: 'Cover image URL', required: false })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({ description: 'Target donation amount', required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  goalAmount?: number;

  @ApiProperty({ description: 'Campaign start date', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'Campaign end date', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Whether campaign is active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Campaign category', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Campaign tags',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description:
      'Cập nhật tài khoản ngân hàng riêng của campaign (VietQR). ' +
      'Gọi với giá trị null để xóa, bỏ trống để giữ nguyên.',
    required: false,
    type: () => BankInfoDto,
  })
  @ValidateNested()
  @Type(() => BankInfoDto)
  @IsOptional()
  bankInfo?: BankInfoDto;

  @ApiProperty({
    description:
      'SePay API Key riêng của campaign (lấy từ https://sepay.vn → Dashboard → API Key). ' +
      'Ưu tiên cao nhất khi polling — dùng khi campaign có TK nhận tiền riêng.',
    required: false,
    example: 'DBVPAXKV3EUXCLQMBEWYJVAKSPUOCODSTC097AJYRC6VRE4N0Q1',
  })
  @IsString()
  @IsOptional()
  sepayApiKey?: string;
}
