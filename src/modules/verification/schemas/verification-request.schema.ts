import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EntityType, RequestStatus } from '../../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export type VerificationRequestDocument = VerificationRequest & Document;

@Schema({ timestamps: true })
export class VerificationRequest {
  @ApiProperty({
    enum: EntityType,
    description: 'Type of entity being verified',
  })
  @Prop({ type: String, enum: EntityType, required: true })
  entityType: EntityType;

  @ApiProperty({ description: 'ID of the entity being verified' })
  @Prop({ type: Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @ApiProperty({ description: 'User who submitted the verification request' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @ApiProperty({
    enum: RequestStatus,
    description: 'Current status of the request',
  })
  @Prop({ type: String, enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus;

  @ApiProperty({ description: 'Supporting documents/URLs', type: [String] })
  @Prop({ type: [String], default: [] })
  documents: string[];

  @ApiProperty({
    description: 'Additional notes from requester',
    required: false,
  })
  @Prop()
  notes?: string;

  @ApiProperty({
    description: 'Admin/Auditor who reviewed the request',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @ApiProperty({ description: 'Review comments from admin', required: false })
  @Prop()
  reviewNotes?: string;

  @ApiProperty({
    description: 'Date when request was reviewed',
    required: false,
  })
  @Prop()
  reviewedAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const VerificationRequestSchema =
  SchemaFactory.createForClass(VerificationRequest);
