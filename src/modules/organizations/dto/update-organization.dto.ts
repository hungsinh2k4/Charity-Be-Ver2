import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
    @ApiProperty({ description: 'Organization name', required: false })
    @IsString()
    @IsOptional()
    name?: string;

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
