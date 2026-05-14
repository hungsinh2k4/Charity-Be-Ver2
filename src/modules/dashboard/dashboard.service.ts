import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VerificationStatus } from '../../common/enums';
import {
  Campaign,
  CampaignDocument,
} from '../campaigns/schemas/campaign.schema';
import {
  Donation,
  DonationDocument,
  PaymentStatus,
} from '../donations/schemas/donation.schema';
import {
  Organization,
  OrganizationDocument,
} from '../organizations/schemas/organization.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    @InjectModel(Donation.name) private donationModel: Model<DonationDocument>,
  ) {}

  async getMyDashboard(userId: string, recentLimit = 3) {
    const userObjectId = new Types.ObjectId(userId);
    const safeRecentLimit = Number.isFinite(recentLimit) ? recentLimit : 3;
    const normalizedLimit = Math.min(Math.max(safeRecentLimit, 1), 20);

    const [user, organizations, myCampaigns, donatedSummary, recentDonations] =
      await Promise.all([
        this.userModel
          .findById(userObjectId)
          .select('name email verificationStatus')
          .lean()
          .exec(),
        this.organizationModel
          .find({ userId: userObjectId, isDeleted: false })
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        this.campaignModel
          .find({ creatorId: userObjectId, isDeleted: false })
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
        this.donationModel
          .aggregate([
            {
              $match: {
                userId: userObjectId,
                paymentStatus: PaymentStatus.CONFIRMED,
              },
            },
            {
              $group: {
                _id: '$currency',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
              },
            },
          ])
          .exec(),
        this.donationModel
          .find({
            userId: userObjectId,
            paymentStatus: PaymentStatus.CONFIRMED,
          })
          .populate('campaignId', 'title')
          .sort({ paidAt: -1, createdAt: -1 })
          .limit(normalizedLimit)
          .lean()
          .exec(),
      ]);

    const organizationIds = organizations.map((organization) =>
      organization._id.toString(),
    );

    const [organizationCampaignCounts, campaignDonationCounts] =
      await Promise.all([
        this.campaignModel
          .aggregate([
            {
              $match: {
                organizationId: {
                  $in: organizationIds.map((id) => new Types.ObjectId(id)),
                },
                isDeleted: false,
              },
            },
            {
              $group: {
                _id: '$organizationId',
                campaignCount: { $sum: 1 },
              },
            },
          ])
          .exec(),
        this.donationModel
          .aggregate([
            {
              $match: {
                campaignId: {
                  $in: myCampaigns.map(
                    (campaign) => new Types.ObjectId(campaign._id.toString()),
                  ),
                },
                paymentStatus: PaymentStatus.CONFIRMED,
              },
            },
            {
              $group: {
                _id: '$campaignId',
                donationCount: { $sum: 1 },
                raisedAmount: { $sum: '$amount' },
              },
            },
          ])
          .exec(),
      ]);

    const organizationCampaignCountMap = new Map(
      organizationCampaignCounts.map((item) => [
        item._id.toString(),
        item.campaignCount,
      ]),
    );
    const campaignDonationMap = new Map(
      campaignDonationCounts.map((item) => [
        item._id.toString(),
        {
          donationCount: item.donationCount,
          raisedAmount: item.raisedAmount,
        },
      ]),
    );

    const donated = donatedSummary.reduce(
      (summary, item) => ({
        count: summary.count + item.count,
        totalAmount: summary.totalAmount + item.totalAmount,
        currency: summary.currency || item._id || 'VND',
      }),
      { count: 0, totalAmount: 0, currency: 'VND' },
    );

    return {
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        verificationStatus:
          user?.verificationStatus ?? VerificationStatus.UNVERIFIED,
      },
      summary: {
        organizations: {
          count: organizations.length,
          campaignCount: myCampaigns.length,
        },
        donated,
        verification: {
          status: user?.verificationStatus ?? VerificationStatus.UNVERIFIED,
          isVerified: user?.verificationStatus === VerificationStatus.VERIFIED,
        },
      },
      organizations: organizations.map((organization) => ({
        id: organization._id,
        name: organization.name,
        description: organization.description,
        verificationStatus: organization.verificationStatus,
        campaignCount:
          organizationCampaignCountMap.get(organization._id.toString()) ?? 0,
        createdAt: organization.createdAt,
      })),
      campaigns: myCampaigns.map((campaign) => {
        const donationStats = campaignDonationMap.get(campaign._id.toString());
        return {
          id: campaign._id,
          title: campaign.title,
          description: campaign.summary ?? campaign.description,
          goalAmount: campaign.goalAmount,
          currentAmount: campaign.currentAmount,
          currency: campaign.currency,
          verificationStatus: campaign.verificationStatus,
          isActive: campaign.isActive,
          progressPercent: this.calculateProgressPercent(
            campaign.currentAmount,
            campaign.goalAmount,
          ),
          donationCount: donationStats?.donationCount ?? 0,
          receivedAmount:
            donationStats?.raisedAmount ?? campaign.currentAmount ?? 0,
          createdAt: campaign.createdAt,
        };
      }),
      recentDonations: recentDonations.map((donation) => ({
        id: donation._id,
        date: donation.paidAt ?? donation.createdAt,
        transferCode: donation.transferCode,
        blockchainTxId: donation.blockchainTxId,
        amount: donation.amount,
        currency: donation.currency,
        campaign: this.normalizePopulatedCampaign(donation.campaignId),
      })),
    };
  }

  async getRecentBlockchainActivity(pagination?: {
    page?: number;
    limit?: number;
  }) {
    const safePage = Number.isFinite(pagination?.page)
      ? pagination?.page
      : 1;
    const safeLimit = Number.isFinite(pagination?.limit)
      ? pagination?.limit
      : 10;
    const page = Math.max(safePage ?? 1, 1);
    const limit = Math.min(Math.max(safeLimit ?? 10, 1), 50);
    const skip = (page - 1) * limit;
    const readLimit = skip + limit;

    const organizationQuery = {
      blockchainId: { $exists: true, $ne: null },
      isDeleted: false,
    };
    const campaignQuery = {
      blockchainId: { $exists: true, $ne: null },
      isDeleted: false,
    };
    const donationQuery = {
      blockchainTxId: { $exists: true, $ne: null },
      paymentStatus: PaymentStatus.CONFIRMED,
    };

    const [
      organizations,
      campaigns,
      donations,
      totalOrganizations,
      totalCampaigns,
      totalDonations,
    ] = await Promise.all([
      this.organizationModel
        .find(organizationQuery)
        .select('name blockchainId createdAt')
        .sort({ createdAt: -1 })
        .limit(readLimit)
        .lean()
        .exec(),
      this.campaignModel
        .find(campaignQuery)
        .select('title blockchainId createdAt')
        .sort({ createdAt: -1 })
        .limit(readLimit)
        .lean()
        .exec(),
      this.donationModel
        .find(donationQuery)
        .select('amount currency blockchainTxId campaignId paidAt createdAt')
        .populate('campaignId', 'title')
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(readLimit)
        .lean()
        .exec(),
      this.organizationModel.countDocuments(organizationQuery).exec(),
      this.campaignModel.countDocuments(campaignQuery).exec(),
      this.donationModel.countDocuments(donationQuery).exec(),
    ]);

    const total = totalOrganizations + totalCampaigns + totalDonations;
    const data = [
      ...organizations.map((organization) => ({
        type: 'organization' as const,
        action: 'CREATE_ORGANIZATION' as const,
        entityId: organization._id.toString(),
        title: organization.name,
        blockchainId: organization.blockchainId,
        timestamp: organization.createdAt,
      })),
      ...campaigns.map((campaign) => ({
        type: 'campaign' as const,
        action: 'CREATE_CAMPAIGN' as const,
        entityId: campaign._id.toString(),
        title: campaign.title,
        blockchainId: campaign.blockchainId,
        timestamp: campaign.createdAt,
      })),
      ...donations.map((donation) => ({
        type: 'donation' as const,
        action: 'RECORD_DONATION' as const,
        entityId: donation._id.toString(),
        title: 'Donation recorded',
        blockchainTxId: donation.blockchainTxId,
        timestamp: donation.paidAt ?? donation.createdAt,
        amount: donation.amount,
        currency: donation.currency,
        campaign: this.normalizePopulatedCampaign(donation.campaignId),
      })),
    ]
      .filter((activity) => activity.timestamp)
      .sort(
        (a, b) =>
          new Date(b.timestamp as Date).getTime() -
          new Date(a.timestamp as Date).getTime(),
      )
      .slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private calculateProgressPercent(currentAmount = 0, goalAmount = 0): number {
    if (!goalAmount || goalAmount <= 0) return 0;
    return Math.min(100, Math.round((currentAmount / goalAmount) * 1000) / 10);
  }

  private normalizePopulatedCampaign(campaign: unknown) {
    if (!campaign || campaign instanceof Types.ObjectId) return null;
    const value = campaign as { _id?: Types.ObjectId; title?: string };
    return {
      id: value._id,
      title: value.title,
    };
  }
}
