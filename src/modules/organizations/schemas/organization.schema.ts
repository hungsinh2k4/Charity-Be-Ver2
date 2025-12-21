import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '../../../common/enums';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true })
export class Organization {
    @ApiProperty({ description: 'Blockchain record ID', required: false })
    @Prop({ unique: true, sparse: true })
    blockchainId?: string;

    @ApiProperty({ description: 'User ID', required: true })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @ApiProperty({ description: 'Organization name', example: 'Helping Hands Foundation' })
    @Prop({ required: true })
    name: string;

    @ApiProperty({ description: 'Organization description', required: false })
    @Prop()
    description?: string;

    @ApiProperty({ description: 'Website URL', required: false })
    @Prop()
    website?: string;

    @ApiProperty({ description: 'Contact email', required: false })
    @Prop()
    contactEmail?: string;

    @ApiProperty({ description: 'Contact phone', required: false })
    @Prop()
    contactPhone?: string;

    @ApiProperty({ description: 'Physical address', required: false })
    @Prop()
    address?: string;

    @ApiProperty({ description: 'Legal documents for verification (business license, registration certificate, etc.)', required: false })
    @Prop({ type: [String], default: [] })
    legalDocuments: string[];

    @ApiProperty({ description: 'Verification status of the organization', enum: VerificationStatus })
    @Prop({ type: String, enum: VerificationStatus, default: VerificationStatus.UNVERIFIED })
    verificationStatus: VerificationStatus;

    @ApiProperty({ description: 'Soft delete flag' })
    @Prop({ default: false })
    isDeleted: boolean;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt?: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt?: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
