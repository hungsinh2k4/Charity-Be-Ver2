import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type DonationDocument = Donation & Document;

export enum PaymentStatus {
  PENDING = 'pending',      // Chờ chuyển khoản
  CONFIRMED = 'confirmed',  // Đã xác nhận (admin/auto đối soát)
  EXPIRED = 'expired',      // Quá hạn (không chuyển)
  CANCELLED = 'cancelled',  // Hủy bởi user
}

@Schema({ timestamps: true })
export class Donation {
  @ApiProperty({ description: 'Mã tham chiếu chuyển khoản (nội dung CK) — DON + 8 ký tự. Dùng để đối soát.' })
  @Prop({ required: true, unique: true })
  transferCode: string;

  @ApiProperty({ description: 'Blockchain transaction ID' })
  @Prop({ required: true })
  blockchainTxId: string;

  @ApiProperty({ description: 'Campaign ID' })
  @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true })
  campaignId: Types.ObjectId;

  @ApiProperty({ description: 'Organization ID (denormalized for queries)', required: false })
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: false })
  organizationId?: Types.ObjectId;

  @ApiProperty({ description: 'User ID (if logged-in user donates)', required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @ApiProperty({ description: 'Donation amount', example: 100 })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'VND' })
  @Prop({ default: 'VND' })
  currency: string;

  @ApiProperty({ description: 'Donor email for updates', required: false })
  @Prop()
  donorEmail?: string;

  @ApiProperty({ description: 'Donor display name', default: 'Anonymous' })
  @Prop({ default: 'Anonymous' })
  donorName: string;

  @ApiProperty({ description: 'Whether to hide donor info publicly', default: true })
  @Prop({ default: true })
  isAnonymous: boolean;

  @ApiProperty({ description: 'Optional message from donor', required: false })
  @Prop()
  message?: string;

  @ApiProperty({ description: 'Payment method used', required: false })
  @Prop()
  paymentMethod?: string;

  @ApiProperty({ description: 'Trạng thái thanh toán', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: 'Thời điểm xác nhận chuyển khoản thành công', required: false })
  @Prop()
  verifiedAt?: Date;

  @ApiProperty({ description: 'Payment reference/transaction ID from bank (nếu có)', required: false })
  @Prop()
  paymentReference?: string;

  @ApiProperty({ description: 'Whether donor wants email updates' })
  @Prop({ default: false })
  subscribeToUpdates: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt?: Date;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);

// Index để tìm kiếm nhanh theo transferCode
DonationSchema.index({ transferCode: 1 }, { unique: true });
DonationSchema.index({ paymentStatus: 1 });
DonationSchema.index({ campaignId: 1, paymentStatus: 1 });
