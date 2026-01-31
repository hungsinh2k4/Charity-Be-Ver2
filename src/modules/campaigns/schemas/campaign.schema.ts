import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VerificationStatus } from '../../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export type CampaignDocument = Campaign & Document;

@Schema({ timestamps: true })
export class Campaign {
  @ApiProperty({ description: 'Blockchain record ID', required: false })
  @Prop({ unique: true, sparse: true })
  blockchainId?: string;

  @ApiProperty({
    description: 'Campaign title',
    example: 'Clean Water for Rural Communities',
  })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ description: 'Campaign description' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({
    description: 'Short summary of the campaign',
    required: false,
  })
  @Prop()
  summary?: string;

  @ApiProperty({ description: 'Campaign cover image URL', required: false })
  @Prop()
  coverImage?: string;

  @ApiProperty({ description: 'Target donation amount', example: 10000 })
  @Prop({ required: true })
  goalAmount: number;

  @ApiProperty({ description: 'Current raised amount', example: 2500 })
  @Prop({ default: 0 })
  currentAmount: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @Prop({ default: 'USD' })
  currency: string;

  @ApiProperty({
    description: 'Organization ID (optional for individual creators)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: false })
  organizationId?: Types.ObjectId;

  @ApiProperty({ description: 'Campaign creator user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creatorId: Types.ObjectId;

  @ApiProperty({ enum: VerificationStatus, description: 'Verification status' })
  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @ApiProperty({ description: 'Campaign start date', required: false })
  @Prop()
  startDate?: Date;

  @ApiProperty({ description: 'Campaign end date', required: false })
  @Prop()
  endDate?: Date;

  @ApiProperty({ description: 'Whether campaign is active', default: true })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ description: 'Campaign category', required: false })
  @Prop()
  category?: string;

  @ApiProperty({ description: 'Campaign tags', type: [String] })
  @Prop({ type: [String], default: [] })
  tags: string[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
