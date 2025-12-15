import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateOrganizationDto {
    @ApiProperty({ description: 'User ID', required: true })
    @IsString()
    @IsNotEmpty()
    userId: Types.ObjectId;

    @ApiProperty({ description: 'Organization name', example: 'Helping Hands Foundation' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Organization description', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Website URL', required: false })
    @IsString()
    @IsOptional()
    website?: string;

    @ApiProperty({ description: 'Contact email', required: false })
    @IsString()
    @IsOptional()
    contactEmail?: string;

    @ApiProperty({ description: 'Contact phone', required: false })
    @IsString()
    @IsOptional()
    contactPhone?: string;

    @ApiProperty({ description: 'Physical address', required: false })
    @IsString()
    @IsOptional()
    address?: string;
}
