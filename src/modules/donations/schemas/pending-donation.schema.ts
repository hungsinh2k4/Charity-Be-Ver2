import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PendingDonationDocument = PendingDonation & Document;

export enum PendingStatus {
  WAITING_PAYMENT = 'waiting_payment', // Đang chờ user chuyển khoản
  CHECKING = 'checking',               // Đang poll VietQR kiểm tra
  PAYMENT_CONFIRMED = 'payment_confirmed', // VietQR xác nhận đã nhận tiền
  EXPIRED = 'expired',                 // Quá hạn (không CK trong thời gian quy định)
  FAILED = 'failed',                   // Thất bại (lỗi hệ thống)
}

/**
 * PendingDonation — bảng tạm lưu ý định donate.
 * Chỉ tồn tại cho đến khi:
 *   - VietQR xác nhận đã nhận tiền → tạo Donation thật → xóa bản ghi này
 *   - Hết hạn (EXPIRED) → không tạo Donation
 */
@Schema({ timestamps: true })
export class PendingDonation {
  @ApiProperty({ description: 'Mã tham chiếu CK — DON + 8 ký tự random (nội dung chuyển khoản)' })
  @Prop({ required: true, unique: true, uppercase: true })
  transferCode: string;

  @ApiProperty({ description: 'Campaign mà donor muốn donate vào' })
  @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true })
  campaignId: Types.ObjectId;

  @ApiProperty({ description: 'Organization ID (denormalized)', required: false })
  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @ApiProperty({ description: 'User ID nếu đã đăng nhập', required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @ApiProperty({ description: 'Số tiền donor muốn donate (VND)' })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ description: 'Currency', default: 'VND' })
  @Prop({ default: 'VND' })
  currency: string;

  @ApiProperty({ description: 'Email của donor (để thông báo)', required: false })
  @Prop()
  donorEmail?: string;

  @ApiProperty({ description: 'Tên hiển thị của donor', default: 'Anonymous' })
  @Prop({ default: 'Anonymous' })
  donorName: string;

  @ApiProperty({ description: 'Ẩn danh hay không', default: true })
  @Prop({ default: true })
  isAnonymous: boolean;

  @ApiProperty({ description: 'Lời nhắn gửi chiến dịch', required: false })
  @Prop()
  message?: string;

  @ApiProperty({ description: 'Subscribe cập nhật qua email', default: false })
  @Prop({ default: false })
  subscribeToUpdates: boolean;

  @ApiProperty({ description: 'Trạng thái pending donation', enum: PendingStatus })
  @Prop({ type: String, enum: PendingStatus, default: PendingStatus.WAITING_PAYMENT })
  status: PendingStatus;

  @ApiProperty({ description: 'Thời điểm hết hạn (mặc định 30 phút sau khi tạo)' })
  @Prop({ required: true })
  expiresAt: Date;

  @ApiProperty({ description: 'Số lần đã poll VietQR kiểm tra', default: 0 })
  @Prop({ default: 0 })
  pollCount: number;

  @ApiProperty({ description: 'Lần cuối poll kiểm tra trạng thái', required: false })
  @Prop()
  lastPolledAt?: Date;

  @ApiProperty({ description: 'Bank info snapshot tại thời điểm tạo QR (để hiển thị lại đúng TK)', required: false })
  @Prop({ type: Object })
  bankInfoSnapshot?: {
    bankBin: string;
    accountNumber: string;
    accountName: string;
    bankName: string;
  };

  @ApiProperty({ description: 'Thời điểm tạo', required: false })
  createdAt?: Date;
}

export const PendingDonationSchema = SchemaFactory.createForClass(PendingDonation);

PendingDonationSchema.index({ transferCode: 1 }, { unique: true });
PendingDonationSchema.index({ status: 1 });
PendingDonationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index: tự xóa sau khi hết hạn
PendingDonationSchema.index({ campaignId: 1 });
