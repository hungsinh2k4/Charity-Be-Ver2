import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type DonationDocument = Donation & Document;

export enum PaymentStatus {
  CONFIRMED = 'confirmed',  // Đã xác nhận — VietQR hoặc Admin đã verify tiền về
  EXPIRED = 'expired',      // Donation bị huỷ do quá hạn (không có GD khớp)
  CANCELLED = 'cancelled',  // Hủy bởi user
}

/**
 * NOTE: Donation chỉ được tạo trong MongoDB khi VietQR xác nhận đã nhận tiền.
 * Trước đó, dữ liệu tạm được lưu trong PendingDonation.
 */

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

  @ApiProperty({ description: 'Trạng thái thanh toán — Donation chỉ tạo khi đã CONFIRMED', enum: PaymentStatus, default: PaymentStatus.CONFIRMED })
  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.CONFIRMED })
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: 'Thời điểm VietQR / ngân hàng xác nhận tiền đã về', required: false })
  @Prop()
  paidAt?: Date;

  @ApiProperty({ description: 'Mã giao dịch ngân hàng do VietQR trả về (để audit)', required: false })
  @Prop()
  vietqrTxRef?: string;

  @ApiProperty({ description: 'Bank info snapshot: TK nhận tiền tại thời điểm donate', required: false })
  @Prop({ type: Object })
  bankInfoSnapshot?: {
    bankBin: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
  };

  @ApiProperty({ description: 'Whether donor wants email updates' })
  @Prop({ default: false })
  subscribeToUpdates: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt?: Date;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);

// Indexes để tìm kiếm nhanh
// transferCode đã có unique index từ @Prop({ unique: true }) — không cần khai báo lại
DonationSchema.index({ paymentStatus: 1 });
DonationSchema.index({ campaignId: 1, paymentStatus: 1 });
