import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BankInfoDto } from '../../../common/dto/bank-info.dto';

export class RegisterDto {
  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'User phone number', example: '0123456789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'User address', example: 'Hà Nội' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description:
      'Thông tin tài khoản ngân hàng để nhận donate qua QR VietQR ' +
      '(có thể bỏ qua và cập nhật sau trong phần hồ sơ)',
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
}
