import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  PendingDonation,
  PendingDonationDocument,
  PendingStatus,
} from './schemas/pending-donation.schema';
import { Donation, DonationDocument, PaymentStatus } from './schemas/donation.schema';
import { DonationsQrService, DonationQRResult } from './donations-qr.service';
import { VietQRPaymentService } from './vietqr-payment.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { CreateDonationDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class PendingDonationsService {
  private readonly logger = new Logger(PendingDonationsService.name);

  /** Thời gian chờ thanh toán tối đa (phút) */
  private readonly PAYMENT_TIMEOUT_MINUTES = 30;
  /** Số lần poll tối đa trước khi expire (15 lần × 2 phút = 30 phút) */
  private readonly MAX_POLL_COUNT = 15;

  constructor(
    @InjectModel(PendingDonation.name)
    private pendingModel: Model<PendingDonationDocument>,
    @InjectModel(Donation.name)
    private donationModel: Model<DonationDocument>,
    private campaignsService: CampaignsService,
    private organizationsService: OrganizationsService,
    private usersService: UsersService,
    private blockchainService: BlockchainService,
    private donationsQrService: DonationsQrService,
    private vietqrPaymentService: VietQRPaymentService,
    private configService: ConfigService,
  ) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 1: Tạo PendingDonation — ghi ý định donate (chưa lưu Donation thật)
  // ═══════════════════════════════════════════════════════════════════════════

  async initiateDonation(
    createDto: CreateDonationDto,
    userId?: string,
  ): Promise<{
    pendingId: string;
    transferCode: string;
    amount: number;
    currency: string;
    expiresAt: Date;
    message: string;
  }> {
    const campaign = await this.campaignsService.findById(createDto.campaignId);
    if (!campaign.isActive) {
      throw new BadRequestException('Chiến dịch không còn hoạt động.');
    }

    // Sinh mã tham chiếu chuyển khoản
    const transferCode = this.donationsQrService.generateTransferCode();

    // Helper extract ID an toàn
    const extractIdStr = (value: any): string | null => {
      if (!value) return null;
      if (typeof value.id === 'string' && value.id.length === 24) return value.id;
      if (typeof value.toHexString === 'function') return value.toHexString();
      if (value._id && typeof value._id.toHexString === 'function')
        return value._id.toHexString();
      const s = String(value);
      return s === '[object Object]' ? null : s;
    };

    // Resolve bank info (Campaign → Org → User creator)
    const bankInfo = await this.resolveBankInfo(campaign, extractIdStr);

    let orgId: Types.ObjectId | undefined;
    if (campaign.organizationId) {
      const idStr = extractIdStr(campaign.organizationId);
      if (idStr) orgId = new Types.ObjectId(idStr);
    }

    const expiresAt = new Date(
      Date.now() + this.PAYMENT_TIMEOUT_MINUTES * 60 * 1000,
    );

    const pending = new this.pendingModel({
      transferCode,
      campaignId: new Types.ObjectId(createDto.campaignId),
      ...(orgId ? { organizationId: orgId } : {}),
      ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
      amount: createDto.amount,
      currency: createDto.currency ?? 'VND',
      donorEmail: createDto.donorEmail,
      donorName: createDto.donorName || 'Anonymous',
      isAnonymous: createDto.isAnonymous !== false,
      message: createDto.message,
      subscribeToUpdates: createDto.subscribeToUpdates ?? false,
      status: PendingStatus.WAITING_PAYMENT,
      expiresAt,
      // Snapshot bankInfo để sau này sinh lại QR không cần re-query
      bankInfoSnapshot: bankInfo
        ? {
          bankBin: bankInfo.bankBin,
          accountNumber: bankInfo.accountNumber,
          accountName: bankInfo.accountName,
          bankName: bankInfo.bankName ?? '',
        }
        : undefined,
    });

    const saved = await pending.save();

    return {
      pendingId: saved._id.toString(),
      transferCode: saved.transferCode,
      amount: saved.amount,
      currency: saved.currency,
      expiresAt: saved.expiresAt,
      message: `Vui lòng chuyển khoản ${saved.amount.toLocaleString('vi-VN')} VND với nội dung: ${saved.transferCode}. Giao dịch hết hạn lúc ${expiresAt.toLocaleTimeString('vi-VN')}.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2A: Lấy QR để donor quét
  // ═══════════════════════════════════════════════════════════════════════════

  async getPendingDonationQR(pendingId: string): Promise<{
    pending: PendingDonationDocument;
    qr: DonationQRResult;
    vietqrImageUrl: string;
  }> {
    const pending = await this.findPendingById(pendingId);

    if (pending.status === PendingStatus.PAYMENT_CONFIRMED) {
      throw new BadRequestException('Donation này đã được xác nhận thanh toán.');
    }
    if (pending.status === PendingStatus.EXPIRED) {
      throw new BadRequestException('Donation này đã hết hạn. Vui lòng tạo donation mới.');
    }
    if (new Date() > pending.expiresAt) {
      await this.expirePending(pending);
      throw new BadRequestException('Donation đã hết hạn. Vui lòng tạo donation mới.');
    }

    if (!pending.bankInfoSnapshot) {
      throw new BadRequestException('Không tìm thấy thông tin tài khoản ngân hàng.');
    }

    // Auto-resolve bankBin nếu snapshot cũ chưa có (backward compat)
    if (!pending.bankInfoSnapshot.bankBin && pending.bankInfoSnapshot.bankName) {
      const resolved = this.donationsQrService.resolveBankBin(pending.bankInfoSnapshot.bankName);
      if (resolved) {
        (pending.bankInfoSnapshot as any).bankBin = resolved;
      }
    }

    if (!pending.bankInfoSnapshot.bankBin) {
      throw new BadRequestException(
        `Thông tin ngân hàng thiếu mã BIN. Vui lòng cập nhật bankInfo với bankBin ` +
        `(VD: BIDV=970418, MB=970422, VCB=970436) và tạo donation mới.`,
      );
    }

    const campaign = await this.campaignsService.findById(pending.campaignId.toString());

    const qr = await this.donationsQrService.generateBankTransferQR({
      bankBin: pending.bankInfoSnapshot.bankBin,
      bankName: pending.bankInfoSnapshot.bankName,
      accountNumber: pending.bankInfoSnapshot.accountNumber,
      accountName: pending.bankInfoSnapshot.accountName,
      amount: pending.amount,
      transferContent: pending.transferCode,
      campaignTitle: campaign.title,
    });

    const vietqrImageUrl = this.donationsQrService.buildVietQRImageUrl({
      bankBin: pending.bankInfoSnapshot.bankBin,
      accountNumber: pending.bankInfoSnapshot.accountNumber,
      accountName: pending.bankInfoSnapshot.accountName,
      amount: pending.amount,
      transferContent: pending.transferCode,
    });

    return { pending, qr, vietqrImageUrl };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2B: WEBHOOK — VietQR/ngân hàng chủ động báo về
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Xử lý webhook từ Sepay.
   * Sepay gọi endpoint này mỗi khi phát hiện GD mới trong TK đã liên kết.
   */
  async handleSepayWebhook(payload: any): Promise<{ processed: boolean; message: string }> {
    const parsed = this.vietqrPaymentService.parseSepayWebhook(payload);
    if (!parsed || !parsed.transferCode) {
      return { processed: false, message: 'Không parse được transferCode từ nội dung CK' };
    }

    return this.processPaymentConfirmation(
      parsed.transferCode,
      parsed.amount,
      parsed.txRef,
      parsed.transactedAt,
      'webhook:sepay',
    );
  }

  /**
   * Xử lý webhook từ Casso.
   */
  async handleCassoWebhook(payload: any): Promise<{ processed: boolean; message: string }> {
    const parsed = this.vietqrPaymentService.parseCassoWebhook(payload);
    if (!parsed || !parsed.transferCode) {
      return { processed: false, message: 'Không parse được transferCode từ nội dung CK' };
    }

    return this.processPaymentConfirmation(
      parsed.transferCode,
      parsed.amount,
      parsed.txRef,
      parsed.transactedAt,
      'webhook:casso',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2C: POLLING — Cron job tự kiểm tra mỗi 2 phút
  // ═══════════════════════════════════════════════════════════════════════════

  @Cron('0 */2 * * * *') // Mỗi 2 phút
  async pollPendingDonations(): Promise<void> {
    const isMock = this.configService.get<string>('PAYMENT_PROVIDER', 'mock') === 'mock';

    const pendings = await this.pendingModel
      .find({
        status: { $in: [PendingStatus.WAITING_PAYMENT, PendingStatus.CHECKING] },
        expiresAt: { $gt: new Date() },
        // Giới hạn số lần poll chỉ áp dụng với provider thật (gọi API tốn tiền)
        // Mock mode: poll không giới hạn vì không tốn API call
        ...(isMock ? {} : { pollCount: { $lt: this.MAX_POLL_COUNT } }),
      })
      .exec();

    if (!pendings.length) return;

    this.logger.debug(`Polling ${pendings.length} pending donations...`);

    for (const pending of pendings) {
      await this.pollSinglePending(pending);
    }
  }

  /**
   * Poll 1 PendingDonation — kiểm tra ngân hàng xem có GD khớp không.
   * SePay API key được lấy từ Campaign.
   */
  async pollSinglePending(pending: PendingDonationDocument): Promise<void> {
    if (!pending.bankInfoSnapshot) return;

    // Lấy Sepay API key từ Campaign
    const campaign = await this.campaignsService.findByIdWithApiKey(
      pending.campaignId.toString(),
    );
    const resolvedApiKey = campaign?.sepayApiKey;

    if (!resolvedApiKey) {
      this.logger.warn(
        `PendingDonation ${pending.transferCode}: không tìm thấy sepayApiKey ở Campaign`,
      );
      return;
    }

    try {
      pending.status = PendingStatus.CHECKING;
      pending.pollCount += 1;
      pending.lastPolledAt = new Date();
      await pending.save();

      const result = await this.vietqrPaymentService.checkTransaction(
        pending.bankInfoSnapshot.accountNumber,
        pending.transferCode,
        pending.amount,
        pending.createdAt!, // Chỉ tìm GD sau thời điểm tạo PendingDonation
        resolvedApiKey,
      );


      if (result.matched && result.transaction) {
        await this.confirmAndCreateDonation(pending, result.transaction, 'poll:auto');
      } else {
        // Chưa thấy GD → trả về WAITING
        pending.status = PendingStatus.WAITING_PAYMENT;
        if (pending.pollCount >= this.MAX_POLL_COUNT) {
          this.logger.warn(
            `PendingDonation ${pending.transferCode} đạt max poll count → EXPIRED`,
          );
          await this.expirePending(pending);
        } else {
          await pending.save();
        }
      }
    } catch (error) {
      this.logger.error(
        `Lỗi khi poll pending ${pending.transferCode}:`,
        error.message,
      );
      pending.status = PendingStatus.WAITING_PAYMENT;
      await pending.save();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BƯỚC 2D: ADMIN CONFIRM — Admin xác nhận thủ công (fallback)
  // ═══════════════════════════════════════════════════════════════════════════

  async adminConfirmByCode(
    transferCode: string,
    adminNote?: string,
  ): Promise<DonationDocument> {
    const pending = await this.pendingModel
      .findOne({ transferCode: transferCode.toUpperCase() })
      .exec();

    if (!pending) {
      // Kiểm tra xem đã confirmed chưa
      const existing = await this.donationModel
        .findOne({ transferCode: transferCode.toUpperCase() })
        .exec();
      if (existing) {
        throw new BadRequestException('Donation này đã được xác nhận rồi.');
      }
      throw new NotFoundException(`Không tìm thấy mã "${transferCode}"`);
    }

    if (pending.status === PendingStatus.EXPIRED) {
      throw new BadRequestException('Donation đã hết hạn, không thể xác nhận.');
    }

    const fakeTransaction = {
      txRef: `ADMIN-${Date.now()}`,
      amount: pending.amount,
      description: adminNote ?? `Admin confirm ${transferCode}`,
      transactedAt: new Date(),
      status: 1,
    };

    return this.confirmAndCreateDonation(pending, fakeTransaction, `admin:manual${adminNote ? ':' + adminNote : ''}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE: Tạo Donation thật sau khi xác nhận thanh toán
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Khi VietQR/ngân hàng xác nhận đã nhận tiền:
   *   1. Tạo Donation document trong MongoDB (immutable record)
   *   2. Cập nhật currentAmount của Campaign
   *   3. Ghi lên Hyperledger Fabric blockchain
   *   4. Xóa PendingDonation (đã hoàn thành nhiệm vụ)
   */
  private async confirmAndCreateDonation(
    pending: PendingDonationDocument,
    transaction: { txRef: string; amount: number; description: string; transactedAt: Date; status: number },
    confirmedBy: string,
  ): Promise<DonationDocument> {
    // Idempotent: không tạo 2 lần nếu webhook đến 2 lần
    const existing = await this.donationModel
      .findOne({ transferCode: pending.transferCode })
      .exec();
    if (existing) {
      this.logger.warn(
        `Donation ${pending.transferCode} đã tồn tại → bỏ qua xác nhận trùng lặp`,
      );
      return existing;
    }

    const blockchainTxId = uuidv4();
    const donorHash = pending.donorEmail
      ? crypto.createHash('sha256').update(pending.donorEmail).digest('hex')
      : 'anonymous';

    // ── 1. Tạo Donation chính thức ────────────────────────────────────────
    const donation = new this.donationModel({
      transferCode: pending.transferCode,
      blockchainTxId,
      campaignId: pending.campaignId,
      ...(pending.organizationId ? { organizationId: pending.organizationId } : {}),
      ...(pending.userId ? { userId: pending.userId } : {}),
      amount: pending.amount,
      currency: pending.currency,
      donorEmail: pending.donorEmail,
      donorName: pending.donorName,
      isAnonymous: pending.isAnonymous,
      message: pending.message,
      subscribeToUpdates: pending.subscribeToUpdates,
      paymentStatus: PaymentStatus.CONFIRMED,
      paymentMethod: 'bank_transfer',
      paidAt: transaction.transactedAt,
      vietqrTxRef: transaction.txRef,
      bankInfoSnapshot: pending.bankInfoSnapshot,
    });

    const savedDonation = await donation.save();
    this.logger.log(
      `✅ Donation CONFIRMED: ${pending.transferCode} | ${pending.amount.toLocaleString('vi-VN')} VND | by ${confirmedBy}`,
    );

    // ── 2. Cập nhật currentAmount của Campaign ────────────────────────────
    try {
      await this.campaignsService.updateDonationAmount(
        pending.campaignId.toString(),
        pending.amount,
      );
    } catch (e) {
      this.logger.error('updateDonationAmount failed', e.message);
    }

    // ── 3. Ghi lên Blockchain ─────────────────────────────────────────────
    try {
      const campaign = await this.campaignsService.findById(pending.campaignId.toString());
      if (campaign.blockchainId) {
        await this.blockchainService.recordDonation({
          id: blockchainTxId,
          mongoId: savedDonation._id.toString(),
          campaignId: campaign.blockchainId,
          organizationId: campaign.blockchainId,
          amount: pending.amount,
          donorHash,
          timestamp: transaction.transactedAt.toISOString(),
        });
      }
    } catch (e) {
      this.logger.error('Blockchain recording failed (non-fatal)', e.message);
    }

    // ── 4. Xóa PendingDonation ────────────────────────────────────────────
    try {
      pending.status = PendingStatus.PAYMENT_CONFIRMED;
      await pending.save();
      // Xóa sau 1 giờ (TTL index trên expiresAt sẽ tự clean up phần còn lại)
    } catch (e) {
      this.logger.warn('Không xóa được PendingDonation (không nghiêm trọng)', e.message);
    }

    return savedDonation;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Xử lý xác nhận thanh toán — dùng chung cho webhook và polling.
   */
  private async processPaymentConfirmation(
    transferCode: string,
    amount: number,
    txRef: string,
    transactedAt: Date,
    source: string,
  ): Promise<{ processed: boolean; message: string }> {
    const pending = await this.pendingModel
      .findOne({ transferCode: transferCode.toUpperCase() })
      .exec();

    if (!pending) {
      // Có thể đã được xác nhận rồi
      const existing = await this.donationModel
        .findOne({ transferCode: transferCode.toUpperCase() })
        .exec();
      if (existing) {
        return { processed: true, message: 'Donation đã được xác nhận trước đó.' };
      }
      this.logger.warn(`Không tìm thấy PendingDonation cho mã ${transferCode}`);
      return { processed: false, message: `Không tìm thấy mã ${transferCode}` };
    }

    if (pending.status === PendingStatus.EXPIRED) {
      return { processed: false, message: 'Donation đã hết hạn.' };
    }

    // Kiểm tra số tiền có khớp không (cho phép lệch ≤ 1000 VND)
    if (Math.abs(amount - pending.amount) > 1000) {
      this.logger.warn(
        `Số tiền không khớp: nhận ${amount}, cần ${pending.amount} (code: ${transferCode})`,
      );
      return {
        processed: false,
        message: `Số tiền không khớp (nhận: ${amount}, cần: ${pending.amount})`,
      };
    }

    await this.confirmAndCreateDonation(
      pending,
      { txRef, amount, description: transferCode, transactedAt, status: 1 },
      source,
    );

    return { processed: true, message: `Xác nhận thành công: ${transferCode}` };
  }

  private async expirePending(pending: PendingDonationDocument): Promise<void> {
    pending.status = PendingStatus.EXPIRED;
    await pending.save();
    this.logger.log(`PendingDonation ${pending.transferCode} → EXPIRED`);
  }

  async findPendingById(id: string): Promise<PendingDonationDocument> {
    const pending = await this.pendingModel.findById(id).exec();
    if (!pending) throw new NotFoundException('Không tìm thấy thông tin donation.');
    return pending;
  }

  async findPendingByTransferCode(code: string): Promise<PendingDonationDocument | null> {
    return this.pendingModel
      .findOne({ transferCode: code.toUpperCase() })
      .exec();
  }

  /** Cron: expire các PendingDonation quá hạn mỗi 5 phút */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireOldPendings(): Promise<void> {
    const result = await this.pendingModel
      .updateMany(
        { status: PendingStatus.WAITING_PAYMENT, expiresAt: { $lte: new Date() } },
        { $set: { status: PendingStatus.EXPIRED } },
      )
      .exec();

    if (result.modifiedCount > 0) {
      this.logger.log(`Expired ${result.modifiedCount} pending donations`);
    }
  }

  /**
   * Resolve bank info từ Campaign → Org → User creator.
   */
  private async resolveBankInfo(
    campaign: any,
    extractIdStr: (v: any) => string | null,
  ): Promise<{
    bankBin: string;
    accountNumber: string;
    accountName: string;
    bankName?: string;
  } | null> {
    if (campaign.bankInfo?.bankBin) return campaign.bankInfo;

    if (campaign.organizationId) {
      const orgId = extractIdStr(campaign.organizationId);
      if (orgId) {
        try {
          const org = await this.organizationsService.findById(orgId);
          if (org.bankInfo?.bankBin) return org.bankInfo;
        } catch { }
      }
    }

    const creatorId = extractIdStr(campaign.creatorId);
    if (creatorId) {
      try {
        const creator = await this.usersService.findById(creatorId);
        if ((creator as any).bankInfo?.bankBin) return (creator as any).bankInfo;
      } catch { }
    }

    return null;
  }
}
