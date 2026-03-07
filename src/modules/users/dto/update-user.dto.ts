import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BankInfoDto } from '../../../common/dto/bank-info.dto';

export class UpdateUserDto {
  @ApiProperty({ description: 'User full name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'New password', minLength: 6, required: false })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '0123456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'User address',
    example: 'Hà Nội',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Thông tin tài khoản ngân hàng để nhận donate qua QR VietQR (cho user tự tạo campaign)',
    required: false,
    type: () => BankInfoDto,
  })
  @ValidateNested()
  @Type(() => BankInfoDto)
  @IsOptional()
  bankInfo?: BankInfoDto;
}
