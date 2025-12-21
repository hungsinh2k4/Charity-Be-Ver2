import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role, VerificationStatus } from '../../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @ApiProperty({ description: 'User email address', example: 'user@example.com' })
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    passwordHash: string;

    @ApiProperty({ description: 'User full name', example: 'John Doe' })
    @Prop({ required: true })
    name: string;

    @ApiProperty({ enum: Role, description: 'User role', example: Role.USER })
    @Prop({ type: String, enum: Role, default: Role.USER })
    role: Role;

    @ApiProperty({ enum: VerificationStatus, description: 'Verification status', example: VerificationStatus.UNVERIFIED })
    @Prop({ type: String, enum: VerificationStatus, default: VerificationStatus.UNVERIFIED })
    verificationStatus: VerificationStatus;

    @ApiProperty({ description: 'Date when user was verified', required: false })
    @Prop()
    verifiedAt?: Date;

    @ApiProperty({ description: 'Identity document URL (CCCD/Passport)', required: false })
    @Prop()
    identityDocument?: string;

    @ApiProperty({ description: 'Selfie photo URL holding identity document', required: false })
    @Prop()
    selfieWithDocument?: string;

    @ApiProperty({ description: 'Additional verification note from user', required: false })
    @Prop()
    verificationNote?: string;

    @ApiProperty({ description: 'User phone number', example: '0123456789' })
    @Prop()
    phone?: string;

    @ApiProperty({ description: 'User address', example: 'Hà Nội' })
    @Prop()
    address?: string;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt?: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
