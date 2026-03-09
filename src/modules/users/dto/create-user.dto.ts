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
import { Role } from '../../../common/enums';
import { BankInfoDto } from '../../../common/dto/bank-info.dto';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'User full name', example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Phone number', example: '0123456789' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'User address', example: 'Hà Nội' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'User role',
    example: 'USER',
    default: Role.USER,
  })
  @IsString()
  @IsNotEmpty()
  role: Role;

  @ApiProperty({
    description:
      'Thông tin tài khoản ngân hàng để nhận donate qua QR VietQR ' +
      '(dành cho user cá nhân tự tạo campaign — có thể cập nhật sau)',
    required: false,
    type: () => BankInfoDto,
    example: {
      bankName: 'Vietcombank',
      bankBin: '970436',
      accountNumber: '9876543210',
      accountName: 'NGUYEN VAN AN',
    },
  })
  @ValidateNested()
  @Type(() => BankInfoDto)
  @IsOptional()
  bankInfo?: BankInfoDto;
}
