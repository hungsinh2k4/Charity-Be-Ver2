import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class RequestUserVerificationDto {
  @ApiProperty({
    description: 'Verification document file keys/URLs',
    example: [
      'verification/user-id/cccd-front.jpg',
      'verification/user-id/cccd-back.jpg',
      'verification/user-id/selfie.jpg',
    ],
    required: true,
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Verification documents are required' })
  @IsString({ each: true })
  documents: string[];

  @ApiProperty({
    description: 'Additional note for verification (optional)',
    example: 'Additional verification information if needed',
    required: false,
  })
  @IsString()
  @IsOptional()
  verificationNote?: string;
}
