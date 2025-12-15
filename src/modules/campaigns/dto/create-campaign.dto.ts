import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateCampaignDto {
    @ApiProperty({ description: 'Campaign title', example: 'Clean Water for Rural Communities' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: 'Campaign description' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ description: 'Short summary', required: false })
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiProperty({ description: 'Cover image URL', required: false })
    @IsString()
    @IsOptional()
    coverImage?: string;

    @ApiProperty({ description: 'Target donation amount', example: 10000 })
    @IsNumber()
    @Min(1)
    goalAmount: number;

    @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiProperty({ description: 'Organization ID' })
    @IsString()
    @IsNotEmpty()
    organizationId: string;

    @ApiProperty({ description: 'Campaign start date', required: false })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiProperty({ description: 'Campaign end date', required: false })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({ description: 'Campaign category', required: false })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiProperty({ description: 'Campaign tags', type: [String], required: false })
    @IsArray()
    @IsOptional()
    tags?: string[];
}
