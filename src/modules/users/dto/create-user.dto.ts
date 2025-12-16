import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../common/enums';

export class CreateUserDto {
    @ApiProperty({ description: 'User email address', example: 'user@example.com' })
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

    @ApiProperty({ description: 'User role', example: 'USER', default: Role.USER })
    @IsString()
    @IsNotEmpty()
    role: Role;
}
