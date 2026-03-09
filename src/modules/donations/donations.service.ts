import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Donation, DonationDocument, PaymentStatus } from './schemas/donation.schema';
import { CreateDonationDto } from './dto';
import { DonationsQrService, DonationQRResult } from './donations-qr.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class DonationsService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
    private campaignsService: CampaignsService,
    private blockchainService: BlockchainService,
    private organizationsService: OrganizationsService,
    private usersService: UsersService,
    private donationsQrService: DonationsQrService,
  ) { }

  async create(createDto: CreateDonationDto, userId?: string): Promise<DonationDocument> {
    // Verify campaign exists
    const campaign = await this.campaignsService.findById(createDto.campaignId);
    if (!campaign.isActive) {
      throw new NotFoundException('Campaign is not active');
    }

    // Generate blockchain transaction ID
    const blockchainTxId = uuidv4();

    // Sinh mã tham chiếu chuyển khoản độc nhất
    const transferCode = this.donationsQrService.generateTransferCode();

    // Hash donor email for privacy on blockchain
    const donorHash = createDto.donorEmail
      ? crypto.createHash('sha256').update(createDto.donorEmail).digest('hex')
      : 'anonymous';

    // Helper extract ID an toàn (dùng chung, tránh [object Object] khi populate)
    const extractIdStr = (value: any): string | null => {
      if (!value) return null;
      if (typeof value.id === 'string' && value.id.length === 24) return value.id;
      if (typeof value.toHexString === 'function') return value.toHexString();
      if (value._id && typeof value._id.toHexString === 'function') return value._id.toHexString();
      const s = String(value);
      return s === '[object Object]' ? null : s;
    };

    // Extract organizationId safely (findById uses populate, so campaign.organizationId may be a Document)
    let orgId: Types.ObjectId | undefined;
    if (campaign.organizationId) {
      const idStr = extractIdStr(campaign.organizationId);
      if (idStr) orgId = new Types.ObjectId(idStr);
    }

    const donation = new this.donationModel({
      ...createDto,
      transferCode,
      blockchainTxId,
      campaignId: new Types.ObjectId(createDto.campaignId),
      ...(orgId ? { organizationId: orgId } : {}),
      donorName: createDto.donorName || 'Anonymous',
      isAnonymous: createDto.isAnonymous !== false,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: 'bank_transfer',
      // Liên kết với tài khoản nếu user đang đăng nhập
      ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
    });

    const saved = await donation.save();

    // Update campaign amount (chỉ khi đã confirmed — để sau khi verify)
    // await this.campaignsService.updateDonationAmount(createDto.campaignId, createDto.amount);

    // Record on blockchain
    if (campaign.blockchainId) {
      try {
        await this.blockchainService.recordDonation({
          id: blockchainTxId,
          mongoId: saved._id.toString(),
          campaignId: campaign.blockchainId,
          organizationId: campaign.blockchainId,
          amount: createDto.amount,
          donorHash,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Blockchain recording failed:', error);
      }
    }

    return saved;
  }

  /**
   * Lấy QR Code ngân hàng để thanh toán cho một donation.
   * Tìm bank info từ: Organization (nếu campaign có org) → User (creator cá nhân).
   */
  async getDonationQR(donationId: string): Promise<{
    donation: DonationDocument;
    qr: DonationQRResult;
    vietqrImageUrl: string;
  }> {
    const donation = await this.findById(donationId);

    if (donation.paymentStatus === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Donation này đã được xác nhận thanh toán.');
    }
    if (donation.paymentStatus === PaymentStatus.EXPIRED) {
      throw new BadRequestException('Donation này đã hết hạn.');
    }

    const campaign = await this.campaignsService.findById(donation.campaignId.toString());

    // ── Helper: lấy string ID từ populated Mongoose Document HOẶC raw ObjectId ──
    const extractIdStr = (value: any): string | null => {
      if (!value) return null;
      if (typeof value.id === 'string' && value.id.length === 24) return value.id;
      if (typeof value.toHexString === 'function') return value.toHexString();
      if (value._id && typeof value._id.toHexString === 'function') return value._id.toHexString();
      const s = String(value);
      return s === '[object Object]' ? null : s;
    };

    // ── Hybrid Approach C: Campaign → Organization → User creator ──────────────
    // Ưu tiên 1: TK ngân hàng riêng của Campaign
    let bankInfo: import('../organizations/schemas/organization.schema').BankInfo | null = null;
    let ownerName = 'chủ quỹ';

    if ((campaign as any).bankInfo) {
      bankInfo = (campaign as any).bankInfo;
      ownerName = `campaign "${campaign.title}"`;
    }

    // Ưu tiên 2: TK ngân hàng của Organization (nếu campaign thuộc tổ chức)
    if (!bankInfo && campaign.organizationId) {
      const orgId = extractIdStr(campaign.organizationId);
      if (orgId) {
        try {
          const org = await this.organizationsService.findById(orgId);
          if (org.bankInfo) {
            bankInfo = org.bankInfo;
            ownerName = `tổ chức "${org.name}"`;
          }
        } catch {
          // org không tìm được, fallback tiếp
        }
      }
    }

    // Ưu tiên 3: TK ngân hàng của User creator (campaign cá nhân)
    if (!bankInfo) {
      const creatorId = extractIdStr(campaign.creatorId);
      if (creatorId) {
        try {
          const creator = await this.usersService.findById(creatorId);
          if (creator && (creator as any).bankInfo) {
            bankInfo = (creator as any).bankInfo;
            ownerName = `người tạo quỹ "${creator.name}"`;
          }
        } catch {
          // không tìm được user
        }
      }
    }

    this.donationsQrService.validateBankInfo(bankInfo, ownerName);

    const qr = await this.donationsQrService.generateBankTransferQR({
      bankBin: bankInfo!.bankBin,
      accountNumber: bankInfo!.accountNumber,
      accountName: bankInfo!.accountName,
      amount: donation.amount,
      transferContent: donation.transferCode,
      campaignTitle: campaign.title,
    });

    const vietqrImageUrl = this.donationsQrService.buildVietQRImageUrl({
      bankBin: bankInfo!.bankBin,
      accountNumber: bankInfo!.accountNumber,
      accountName: bankInfo!.accountName,
      amount: donation.amount,
      transferContent: donation.transferCode,
    });

    return { donation, qr, vietqrImageUrl };
  }

  /**
   * Xác nhận chuyển khoản theo mã tham chiếu (dùng cho admin hoặc auto-verify).
   * Admin nhìn vào lịch sử giao dịch ngân hàng, thấy mã DON... thì gọi API này.
   */
  async confirmTransferByCode(transferCode: string, adminNote?: string): Promise<DonationDocument> {
    const donation = await this.donationModel
      .findOne({ transferCode: transferCode.toUpperCase() })
      .exec();

    if (!donation) {
      throw new NotFoundException(`Không tìm thấy donation với mã "${transferCode}"`);
    }
    if (donation.paymentStatus === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Donation này đã được xác nhận rồi.');
    }

    donation.paymentStatus = PaymentStatus.CONFIRMED;
    donation.verifiedAt = new Date();
    if (adminNote) {
      donation.paymentReference = adminNote;
    }
    const saved = await donation.save();

    // Cập nhật số tiền campaign sau khi xác nhận
    await this.campaignsService.updateDonationAmount(
      donation.campaignId.toString(),
      donation.amount,
    );

    return saved;
  }

  /**
   * Tìm donation theo mã tham chiếu CK — dùng để tra cứu khi đối soát.
   */
  async findByTransferCode(transferCode: string): Promise<DonationDocument> {
    const donation = await this.donationModel
      .findOne({ transferCode: transferCode.toUpperCase() })
      .populate('campaignId', 'title goalAmount currentAmount')
      .exec();

    if (!donation) {
      throw new NotFoundException(`Không tìm thấy donation với mã "${transferCode}"`);
    }
    return donation;
  }

  async findById(id: string): Promise<DonationDocument> {
    const donation = await this.donationModel.findById(id).exec();
    if (!donation) {
      throw new NotFoundException('Donation not found');
    }
    return donation;
  }

  async findByCampaign(campaignId: string): Promise<DonationDocument[]> {
    return this.donationModel
      .find({ campaignId: new Types.ObjectId(campaignId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByOrganization(organizationId: string): Promise<DonationDocument[]> {
    return this.donationModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUser(userId: string): Promise<DonationDocument[]> {
    return this.donationModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('campaignId', 'title goalAmount currentAmount')
      .sort({ createdAt: -1 })
      .exec();
  }

  async verifyOnBlockchain(id: string) {
    const donation = await this.findById(id);
    return this.blockchainService.getDonationHistory(donation.blockchainTxId);
  }

  async subscribeToUpdates(campaignId: string, email: string) {
    return {
      success: true,
      message: 'Successfully subscribed to campaign updates',
      campaignId,
      email,
    };
  }

  async getStats(campaignId?: string) {
    const match: { campaignId?: Types.ObjectId; paymentStatus?: string } = {};
    if (campaignId) {
      match.campaignId = new Types.ObjectId(campaignId);
    }
    // Chỉ đếm donation đã confirmed
    match.paymentStatus = PaymentStatus.CONFIRMED;

    const result = await this.donationModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$amount' },
          },
        },
      ])
      .exec();

    return result[0] || { totalAmount: 0, count: 0, avgAmount: 0 };
  }
}
