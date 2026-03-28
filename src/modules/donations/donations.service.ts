import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Donation, DonationDocument, PaymentStatus } from './schemas/donation.schema';
import { BlockchainService } from '../blockchain/blockchain.service';

/**
 * DonationsService — chỉ đọc/query Donation đã CONFIRMED.
 *
 * Toàn bộ logic tạo donation, QR, xác nhận thanh toán đã được chuyển sang:
 *   - PendingDonationsService (luồng chính)
 *   - VietQRPaymentService (tích hợp ngân hàng)
 */
@Injectable()
export class DonationsService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
    private blockchainService: BlockchainService,
  ) {}

  async findById(id: string): Promise<DonationDocument> {
    const donation = await this.donationModel.findById(id).exec();
    if (!donation) throw new NotFoundException('Donation not found');
    return donation;
  }

  async findByTransferCode(transferCode: string): Promise<DonationDocument> {
    const donation = await this.donationModel
      .findOne({ transferCode: transferCode.toUpperCase() })
      .populate('campaignId', 'title goalAmount currentAmount')
      .exec();
    if (!donation)
      throw new NotFoundException(`Không tìm thấy donation với mã "${transferCode}"`);
    return donation;
  }

  async findByCampaign(campaignId: string): Promise<DonationDocument[]> {
    return this.donationModel
      .find({
        campaignId: new Types.ObjectId(campaignId),
        paymentStatus: PaymentStatus.CONFIRMED,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByOrganization(organizationId: string): Promise<DonationDocument[]> {
    return this.donationModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        paymentStatus: PaymentStatus.CONFIRMED,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUser(userId: string): Promise<DonationDocument[]> {
    return this.donationModel
      .find({
        userId: new Types.ObjectId(userId),
        paymentStatus: PaymentStatus.CONFIRMED,
      })
      .populate('campaignId', 'title goalAmount currentAmount')
      .sort({ createdAt: -1 })
      .exec();
  }

  async verifyOnBlockchain(id: string) {
    const donation = await this.findById(id);
    return this.blockchainService.getDonationHistory(donation.blockchainTxId);
  }

  async getStats(campaignId?: string) {
    const match: { campaignId?: Types.ObjectId; paymentStatus: string } = {
      paymentStatus: PaymentStatus.CONFIRMED,
    };
    if (campaignId) {
      match.campaignId = new Types.ObjectId(campaignId);
    }

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
