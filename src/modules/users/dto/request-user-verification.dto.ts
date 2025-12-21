import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestUserVerificationDto {
    @ApiProperty({
        description: 'Identity document URL (CCCD/Passport image)',
        example: 'https://storage.example.com/docs/cccd.jpg',
        required: true
    })
    @IsString()
    @IsNotEmpty({ message: 'Giấy tờ tùy thân (CCCD/Passport) là bắt buộc' })
    identityDocument: string;

    @ApiProperty({
        description: 'Selfie photo URL holding the identity document',
        example: 'https://storage.example.com/docs/selfie-with-cccd.jpg',
        required: true
    })
    @IsString()
    @IsNotEmpty({ message: 'Ảnh selfie cầm giấy tờ tùy thân là bắt buộc' })
    selfieWithDocument: string;

    @ApiProperty({
        description: 'Additional note for verification (optional)',
        example: 'Thông tin bổ sung nếu cần',
        required: false
    })
    @IsString()
    @IsOptional()
    verificationNote?: string;
}
