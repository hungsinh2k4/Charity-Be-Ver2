import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDonationDto {
  @ApiProperty({ description: 'Campaign ID to donate to' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({ description: 'Donation amount', example: 100 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Donor email for updates', required: false })
  @IsEmail()
  @IsOptional()
  donorEmail?: string;

  @ApiProperty({ description: 'Donor display name', required: false })
  @IsString()
  @IsOptional()
  donorName?: string;

  @ApiProperty({
    description: 'Whether to hide donor info publicly',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @ApiProperty({ description: 'Optional message from donor', required: false })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ description: 'Payment method', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Payment reference/transaction ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiProperty({ description: 'Subscribe to campaign updates', default: false })
  @IsBoolean()
  @IsOptional()
  subscribeToUpdates?: boolean;
}
