import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Donation, DonationDocument } from './schemas/donation.schema';
import { CreateDonationDto } from './dto';
import { CampaignsService } from '../campaigns/campaigns.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import * as crypto from 'crypto';

@Injectable()
export class DonationsService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
    private campaignsService: CampaignsService,
    private blockchainService: BlockchainService,
  ) {}

  async create(createDto: CreateDonationDto): Promise<DonationDocument> {
    // Verify campaign exists
    const campaign = await this.campaignsService.findById(createDto.campaignId);
    if (!campaign.isActive) {
      throw new NotFoundException('Campaign is not active');
    }

    // Generate blockchain transaction ID
    const blockchainTxId = uuidv4();

    // Hash donor email for privacy on blockchain
    const donorHash = createDto.donorEmail
      ? crypto.createHash('sha256').update(createDto.donorEmail).digest('hex')
      : 'anonymous';

    const donation = new this.donationModel({
      ...createDto,
      blockchainTxId,
      campaignId: new Types.ObjectId(createDto.campaignId),
      organizationId: campaign.organizationId,
      donorName: createDto.donorName || 'Anonymous',
      isAnonymous: createDto.isAnonymous !== false,
    });

    const saved = await donation.save();

    // Update campaign amount
    await this.campaignsService.updateDonationAmount(
      createDto.campaignId,
      createDto.amount,
    );

    // Record on blockchain (only if campaign has been recorded on blockchain)
    if (campaign.blockchainId) {
      try {
        await this.blockchainService.recordDonation({
          id: blockchainTxId,
          mongoId: saved._id.toString(),
          campaignId: campaign.blockchainId,
          organizationId: campaign.blockchainId, // Using campaign's blockchain reference
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

  async findByOrganization(
    organizationId: string,
  ): Promise<DonationDocument[]> {
    return this.donationModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async verifyOnBlockchain(id: string) {
    const donation = await this.findById(id);
    return this.blockchainService.getDonationHistory(donation.blockchainTxId);
  }

  async subscribeToUpdates(campaignId: string, email: string) {
    // This would typically integrate with an email service
    // For now, just return success
    return {
      success: true,
      message: 'Successfully subscribed to campaign updates',
      campaignId,
      email,
    };
  }

  async getStats(campaignId?: string) {
    const match: { campaignId?: Types.ObjectId } = {};
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
