import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type DonationDocument = Donation & Document;

@Schema({ timestamps: true })
export class Donation {
  @ApiProperty({ description: 'Blockchain transaction ID' })
  @Prop({ required: true })
  blockchainTxId: string;

  @ApiProperty({ description: 'Campaign ID' })
  @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true })
  campaignId: Types.ObjectId;

  @ApiProperty({ description: 'Organization ID (denormalized for queries)' })
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @ApiProperty({ description: 'Donation amount', example: 100 })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @Prop({ default: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Donor email for updates', required: false })
  @Prop()
  donorEmail?: string;

  @ApiProperty({ description: 'Donor display name', default: 'Anonymous' })
  @Prop({ default: 'Anonymous' })
  donorName: string;

  @ApiProperty({
    description: 'Whether to hide donor info publicly',
    default: true,
  })
  @Prop({ default: true })
  isAnonymous: boolean;

  @ApiProperty({ description: 'Optional message from donor', required: false })
  @Prop()
  message?: string;

  @ApiProperty({ description: 'Payment method used', required: false })
  @Prop()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Payment reference/transaction ID',
    required: false,
  })
  @Prop()
  paymentReference?: string;

  @ApiProperty({ description: 'Whether donor wants email updates' })
  @Prop({ default: false })
  subscribeToUpdates: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt?: Date;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);
