import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { VerificationStatus } from '../../common/enums';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class OrganizationsService {
    constructor(
        @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
        private blockchainService: BlockchainService,
    ) { }

    async create(createDto: CreateOrganizationDto, creatorId: string): Promise<OrganizationDocument> {
        const organization = new this.organizationModel({
            ...createDto,
            creatorId: new Types.ObjectId(creatorId),
        });
        const saved = await organization.save();

        // Record on blockchain
        try {
            const blockchainId = await this.blockchainService.createOrganization({
                mongoId: saved._id.toString(),
                name: saved.name,
                creatorUserId: creatorId,
            });
            saved.blockchainId = blockchainId;
            await saved.save();
        } catch (error) {
            console.error('Blockchain recording failed:', error);
            // Continue without blockchain - can be synced later
        }

        return saved;
    }

    async findAll(includeDeleted = false): Promise<OrganizationDocument[]> {
        const query = includeDeleted ? {} : { isDeleted: false };
        return this.organizationModel.find(query).populate('creatorId', 'name email').exec();
    }

    async findById(id: string): Promise<OrganizationDocument> {
        const organization = await this.organizationModel
            .findById(id)
            .populate('creatorId', 'name email')
            .exec();
        if (!organization || organization.isDeleted) {
            throw new NotFoundException('Organization not found');
        }
        return organization;
    }

    async findByCreator(creatorId: string): Promise<OrganizationDocument[]> {
        return this.organizationModel
            .find({ creatorId: new Types.ObjectId(creatorId), isDeleted: false })
            .exec();
    }

    async update(
        id: string,
        updateDto: UpdateOrganizationDto,
        userId: string,
    ): Promise<OrganizationDocument> {
        const organization = await this.findById(id);
        if (organization.creatorId.toString() !== userId) {
            throw new ForbiddenException('Only the creator can update this organization');
        }
        Object.assign(organization, updateDto);
        return organization.save();
    }

    async softDelete(id: string, userId: string): Promise<OrganizationDocument> {
        const organization = await this.findById(id);
        if (organization.creatorId.toString() !== userId) {
            throw new ForbiddenException('Only the creator can delete this organization');
        }
        organization.isDeleted = true;
        return organization.save();
    }

    async updateVerificationStatus(
        id: string,
        status: VerificationStatus,
        adminId: string,
    ): Promise<OrganizationDocument> {
        const organization = await this.findById(id);
        organization.verificationStatus = status;
        if (status === VerificationStatus.VERIFIED) {
            organization.verifiedAt = new Date();
            // Update blockchain
            if (organization.blockchainId) {
                try {
                    await this.blockchainService.verifyOrganization(organization.blockchainId, adminId);
                } catch (error) {
                    console.error('Blockchain verification update failed:', error);
                }
            }
        }
        return organization.save();
    }

    async getAuditTrail(id: string) {
        const organization = await this.findById(id);
        if (!organization.blockchainId) {
            return { message: 'No blockchain record available' };
        }
        return this.blockchainService.getOrganizationHistory(organization.blockchainId);
    }
}
