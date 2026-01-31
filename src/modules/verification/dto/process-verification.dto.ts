import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProcessVerificationDto {
  @ApiProperty({ description: 'Whether to approve the verification' })
  @IsBoolean()
  @IsNotEmpty()
  approved: boolean;

  @ApiProperty({ description: 'Review notes/comments', required: false })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
