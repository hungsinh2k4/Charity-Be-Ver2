import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EntityType } from '../../../common/enums';

export class CreateVerificationRequestDto {
    @ApiProperty({ enum: EntityType, description: 'Type of entity to verify' })
    @IsEnum(EntityType)
    @IsNotEmpty()
    entityType: EntityType;

    @ApiProperty({ description: 'ID of the entity to verify' })
    @IsString()
    @IsNotEmpty()
    entityId: string;

    @ApiProperty({ description: 'Supporting documents/URLs', type: [String], required: false })
    @IsArray()
    @IsOptional()
    documents?: string[];

    @ApiProperty({ description: 'Additional notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}
