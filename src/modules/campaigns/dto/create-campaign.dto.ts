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
    @ApiProperty({
        description: 'Campaign title',
        example: 'Clean Water for Rural Communities'
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: 'Campaign description (detailed information about the campaign)',
        example: 'This campaign aims to provide clean water access to 100 rural families in mountainous areas through building water filtration systems.'
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: 'Short summary of the campaign (1-2 sentences)',
        example: 'Help 100 families access clean water',
        required: false
    })
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiProperty({
        description: 'Cover image URL for the campaign',
        example: 'https://example.com/images/water-campaign.jpg',
        required: false
    })
    @IsString()
    @IsOptional()
    coverImage?: string;

    @ApiProperty({
        description: 'Target donation amount (goal)',
        example: 10000,
        minimum: 1
    })
    @IsNumber()
    @Min(1)
    goalAmount: number;

    @ApiProperty({
        description: 'Currency code (ISO 4217)',
        example: 'USD',
        default: 'USD'
    })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiProperty({
        description: 'Organization ID managing this campaign',
        example: '676a1b2c3d4e5f6a7b8c9d0e'
    })
    @IsString()
    @IsNotEmpty()
    organizationId: string;

    @ApiProperty({
        description: 'Campaign start date (ISO 8601 format)',
        example: '2025-01-01T00:00:00.000Z',
        type: String,
        format: 'date-time',
        required: false
    })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiProperty({
        description: 'Campaign end date (ISO 8601 format)',
        example: '2025-12-31T23:59:59.999Z',
        type: String,
        format: 'date-time',
        required: false
    })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiProperty({
        description: 'Campaign category/theme',
        example: 'Environment',
        required: false
    })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiProperty({
        description: 'Campaign tags for categorization and search',
        example: ['water', 'rural', 'health', 'environment'],
        type: [String],
        required: false,
        isArray: true
    })
    @IsArray()
    @IsOptional()
    tags?: string[];
}
