import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

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

    @ApiProperty({ description: 'User phone number', example: '0123456789', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ description: 'User address', example: 'Hà Nội', required: false })
    @IsString()
    @IsOptional()
    address?: string;
}
