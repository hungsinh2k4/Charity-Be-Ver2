import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '../../../common/enums';

export type OrganizationDocument = Organization & Document;

/**
 * Thông tin tài khoản ngân hàng để nhận donate
 */
@Schema({ _id: false })
export class BankInfo {
  @ApiProperty({ description: 'Tên ngân hàng (VD: Vietcombank, MB Bank, Techcombank)', example: 'MB Bank' })
  @Prop({ required: true })
  bankName: string;

  @ApiProperty({ description: 'Mã BIN ngân hàng theo chuẩn VietQR (VD: 970422 cho MB Bank)', example: '970422' })
  @Prop({ required: true })
  bankBin: string;

  @ApiProperty({ description: 'Số tài khoản ngân hàng', example: '1234567890' })
  @Prop({ required: true })
  accountNumber: string;

  @ApiProperty({ description: 'Tên chủ tài khoản (in hoa, không dấu)', example: 'NGUYEN VAN AN' })
  @Prop({ required: true })
  accountName: string;
}

export const BankInfoSchema = SchemaFactory.createForClass(BankInfo);

@Schema({ timestamps: true })
export class Organization {
  @ApiProperty({ description: 'Blockchain record ID', required: false })
  @Prop({ unique: true, sparse: true })
  blockchainId?: string;

  @ApiProperty({ description: 'User ID', required: true })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({
    description: 'Organization name',
    example: 'Helping Hands Foundation',
  })
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

  @ApiProperty({
    description:
      'Legal documents for verification (business license, registration certificate, etc.)',
    required: false,
  })
  @Prop({ type: [String], default: [] })
  legalDocuments: string[];

  @ApiProperty({
    description: 'Verification status of the organization',
    enum: VerificationStatus,
  })
  @Prop({
    type: String,
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  verificationStatus: VerificationStatus;

  @ApiProperty({ description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ description: 'Thông tin ngân hàng để nhận donate (VietQR)', required: false, type: () => BankInfo })
  @Prop({ type: BankInfoSchema, required: false })
  bankInfo?: BankInfo;

  @ApiProperty({
    description:
      'SePay API Key riêng của tổ chức (lấy từ https://sepay.vn → Dashboard → API). ' +
      'Dùng để polling giao dịch chuyển khoản tự động. Bảo mật: không trả về trong response.',
    required: false,
    example: 'DBVPAXKV3EUXCLQMBEWYJVAKSPUOCODSTC097AJYRC6VRE4N0Q1',
  })
  @Prop({ required: false, select: false })
  sepayApiKey?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
