import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '../../../common/enums';

class DashboardUserDto {
  @ApiProperty({ example: '665f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.VERIFIED })
  verificationStatus: VerificationStatus;
}

class DashboardOrganizationsSummaryDto {
  @ApiProperty({ example: 1 })
  count: number;

  @ApiProperty({ example: 3 })
  campaignCount: number;
}

class DashboardDonatedSummaryDto {
  @ApiProperty({ example: 3 })
  count: number;

  @ApiProperty({ example: 15000 })
  totalAmount: number;

  @ApiProperty({ example: 'VND' })
  currency: string;
}

class DashboardVerificationSummaryDto {
  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.VERIFIED })
  status: VerificationStatus;

  @ApiProperty({ example: true })
  isVerified: boolean;
}

class DashboardSummaryDto {
  @ApiProperty({ type: DashboardOrganizationsSummaryDto })
  organizations: DashboardOrganizationsSummaryDto;

  @ApiProperty({ type: DashboardDonatedSummaryDto })
  donated: DashboardDonatedSummaryDto;

  @ApiProperty({ type: DashboardVerificationSummaryDto })
  verification: DashboardVerificationSummaryDto;
}

class DashboardOrganizationDto {
  @ApiProperty({ example: '665f1f77bcf86cd799439012' })
  id: string;

  @ApiProperty({ example: 'Quy Tu Thien Vong Tay Nhan Ai' })
  name: string;

  @ApiProperty({ example: 'Tan tam cai thien cuoc song thong qua cac sang kien giao duc va y te tai nong thon Viet Nam.' })
  description?: string;

  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.VERIFIED })
  verificationStatus: VerificationStatus;

  @ApiProperty({ example: 2 })
  campaignCount: number;

  @ApiProperty({ example: '2026-05-12T10:00:00.000Z' })
  createdAt?: Date;
}

class DashboardCampaignDto {
  @ApiProperty({ example: '665f1f77bcf86cd799439013' })
  id: string;

  @ApiProperty({ example: 'Nuoc Sach Cho Dong Bao Vung Cao' })
  title: string;

  @ApiProperty({ example: 'Cung cap nuoc sach cho 5.000 ho gia dinh tai cac ban lang vung sau vung xa.' })
  description: string;

  @ApiProperty({ example: 1250000000 })
  goalAmount: number;

  @ApiProperty({ example: 812500000 })
  currentAmount: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.VERIFIED })
  verificationStatus: VerificationStatus;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 65 })
  progressPercent: number;

  @ApiProperty({ example: 12 })
  donationCount: number;

  @ApiProperty({ example: 812500000 })
  receivedAmount: number;

  @ApiProperty({ example: '2026-05-12T10:00:00.000Z' })
  createdAt?: Date;
}

class DashboardDonationCampaignDto {
  @ApiProperty({ example: '665f1f77bcf86cd799439013' })
  id: string;

  @ApiProperty({ example: 'Nuoc Sach Cho Dong Bao Vung Cao' })
  title: string;
}

class DashboardRecentDonationDto {
  @ApiProperty({ example: '665f1f77bcf86cd799439014' })
  id: string;

  @ApiProperty({ example: '2026-05-12T10:00:00.000Z' })
  date: Date;

  @ApiProperty({ example: 'DON5QWMS96' })
  transferCode: string;

  @ApiProperty({ example: '0xabc123' })
  blockchainTxId: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ type: DashboardDonationCampaignDto, nullable: true })
  campaign: DashboardDonationCampaignDto | null;
}

export class DashboardBlockchainActivityDto {
  @ApiProperty({
    example: 'donation',
    enum: ['organization', 'campaign', 'donation'],
  })
  type: 'organization' | 'campaign' | 'donation';

  @ApiProperty({
    example: 'RECORD_DONATION',
    enum: ['CREATE_ORGANIZATION', 'CREATE_CAMPAIGN', 'RECORD_DONATION'],
  })
  action: 'CREATE_ORGANIZATION' | 'CREATE_CAMPAIGN' | 'RECORD_DONATION';

  @ApiProperty({ example: '665f1f77bcf86cd799439014' })
  entityId: string;

  @ApiProperty({ example: 'Nuoc Sach Cho Dong Bao Vung Cao' })
  title: string;

  @ApiProperty({ example: '0xabc123', required: false })
  blockchainTxId?: string;

  @ApiProperty({ example: '8a9227e7-4de3-4f2a-9f0d-8d1ff73fb69d', required: false })
  blockchainId?: string;

  @ApiProperty({ example: '2026-05-12T10:00:00.000Z' })
  timestamp: Date;

  @ApiProperty({ example: 5000, required: false })
  amount?: number;

  @ApiProperty({ example: 'VND', required: false })
  currency?: string;

  @ApiProperty({ type: DashboardDonationCampaignDto, nullable: true, required: false })
  campaign?: DashboardDonationCampaignDto | null;
}

class DashboardBlockchainActivityMetaDto {
  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class DashboardBlockchainActivityResponseDto {
  @ApiProperty({ type: [DashboardBlockchainActivityDto] })
  data: DashboardBlockchainActivityDto[];

  @ApiProperty({ type: DashboardBlockchainActivityMetaDto })
  meta: DashboardBlockchainActivityMetaDto;
}

export class DashboardResponseDto {
  @ApiProperty({ type: DashboardUserDto })
  user: DashboardUserDto;

  @ApiProperty({ type: DashboardSummaryDto })
  summary: DashboardSummaryDto;

  @ApiProperty({ type: [DashboardOrganizationDto] })
  organizations: DashboardOrganizationDto[];

  @ApiProperty({ type: [DashboardCampaignDto] })
  campaigns: DashboardCampaignDto[];

  @ApiProperty({ type: [DashboardRecentDonationDto] })
  recentDonations: DashboardRecentDonationDto[];
}
