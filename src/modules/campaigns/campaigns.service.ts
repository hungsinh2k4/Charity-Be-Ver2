import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument } from './schemas/campaign.schema';
import { CreateCampaignDto, UpdateCampaignDto } from './dto';
import { VerificationStatus } from '../../common/enums';
import { OrganizationsService } from '../organizations/organizations.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class CampaignsService {
    constructor(
        @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
        private organizationsService: OrganizationsService,
        private blockchainService: BlockchainService,
    ) { }

    async create(createDto: CreateCampaignDto, creatorId: string): Promise<CampaignDocument> {
        let organizationBlockchainId: string | undefined;

        // If organizationId is provided, verify user is the organization creator
        if (createDto.organizationId) {
            const organization = await this.organizationsService.findById(createDto.organizationId);
            if (organization.userId.toString() !== creatorId) {
                throw new ForbiddenException('Only organization creator can create campaigns for this organization');
            }
            organizationBlockchainId = organization.blockchainId;
        }

        const campaign = new this.campaignModel({
            ...createDto,
            organizationId: createDto.organizationId ? new Types.ObjectId(createDto.organizationId) : undefined,
            creatorId: new Types.ObjectId(creatorId),
            startDate: createDto.startDate ? new Date(createDto.startDate) : undefined,
            endDate: createDto.endDate ? new Date(createDto.endDate) : undefined,
        });
        const saved = await campaign.save();

        // Record on blockchain (only if organization has been recorded on blockchain)
        if (organizationBlockchainId) {
            try {
                const blockchainId = await this.blockchainService.createCampaign({
                    mongoId: saved._id.toString(),
                    organizationId: organizationBlockchainId,
                    title: saved.title,
                    goalAmount: saved.goalAmount,
                });
                saved.blockchainId = blockchainId;
                await saved.save();
            } catch (error) {
                console.error('Blockchain recording failed:', error);
            }
        }

        return saved;
    }

    async findAll(filters?: {
        organizationId?: string;
        verificationStatus?: VerificationStatus;
        isActive?: boolean;
    }): Promise<CampaignDocument[]> {
        const query: any = { isDeleted: false };
        if (filters?.organizationId) {
            query.organizationId = new Types.ObjectId(filters.organizationId);
        }
        if (filters?.verificationStatus) {
            query.verificationStatus = filters.verificationStatus;
        }
        if (filters?.isActive !== undefined) {
            query.isActive = filters.isActive;
        }
        return this.campaignModel
            .find(query)
            .populate('organizationId', 'name')
            .populate('creatorId', 'name email')
            .exec();
    }

    async findById(id: string): Promise<CampaignDocument> {
        const campaign = await this.campaignModel
            .findById(id)
            .populate('organizationId', 'name')
            .populate('creatorId', 'name email')
            .exec();
        if (!campaign || campaign.isDeleted) {
            throw new NotFoundException('Campaign not found');
        }
        return campaign;
    }

    async update(
        id: string,
        updateDto: UpdateCampaignDto,
        userId: string,
    ): Promise<CampaignDocument> {
        const campaign = await this.findById(id);
        if (campaign.creatorId.toString() !== userId) {
            throw new ForbiddenException('Only the creator can update this campaign');
        }
        Object.assign(campaign, {
            ...updateDto,
            startDate: updateDto.startDate ? new Date(updateDto.startDate) : campaign.startDate,
            endDate: updateDto.endDate ? new Date(updateDto.endDate) : campaign.endDate,
        });
        return campaign.save();
    }

    async softDelete(id: string, userId: string): Promise<CampaignDocument> {
        const campaign = await this.findById(id);
        if (campaign.creatorId.toString() !== userId) {
            throw new ForbiddenException('Only the creator can delete this campaign');
        }
        campaign.isDeleted = true;
        campaign.isActive = false;
        return campaign.save();
    }

    async updateDonationAmount(id: string, amount: number): Promise<CampaignDocument | null> {
        return this.campaignModel
            .findByIdAndUpdate(id, { $inc: { currentAmount: amount } }, { new: true })
            .exec();
    }

    async updateVerificationStatus(
        id: string,
        status: VerificationStatus,
        adminId: string,
    ): Promise<CampaignDocument> {
        const campaign = await this.findById(id);
        campaign.verificationStatus = status;
        if (status === VerificationStatus.VERIFIED && campaign.blockchainId) {
            try {
                await this.blockchainService.verifyCampaign(campaign.blockchainId, adminId);
            } catch (error) {
                console.error('Blockchain verification update failed:', error);
            }
        }
        return campaign.save();
    }

    async getAuditTrail(id: string) {
        const campaign = await this.findById(id);
        if (!campaign.blockchainId) {
            return { message: 'No blockchain record available' };
        }
        return this.blockchainService.getCampaignHistory(campaign.blockchainId);
    }
}
