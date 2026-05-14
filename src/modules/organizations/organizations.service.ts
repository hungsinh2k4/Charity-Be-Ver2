import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { BlockchainService } from '../blockchain/blockchain.service';
import { VerificationStatus } from '../../common/enums';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    private blockchainService: BlockchainService,
  ) {}

  private getOrganizationOwnerId(organization: OrganizationDocument): string {
    const userId = organization.userId as unknown;

    if (userId instanceof Types.ObjectId) {
      return userId.toString();
    }

    if (userId && typeof userId === 'object') {
      const populatedUser = userId as { _id?: Types.ObjectId | string };
      if (populatedUser._id) {
        return populatedUser._id.toString();
      }
    }

    return String(userId);
  }

  async create(
    createDto: CreateOrganizationDto,
    userId: string,
  ): Promise<OrganizationDocument> {
    const organization = new this.organizationModel({
      ...createDto,
      userId: new Types.ObjectId(userId),
    });
    const saved = await organization.save();

    // Record on blockchain
    try {
      const blockchainId = await this.blockchainService.createOrganization({
        mongoId: saved._id.toString(),
        name: saved.name,
        creatorUserId: userId,
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
    return this.organizationModel
      .find(query)
      .populate('userId', 'name email')
      .exec();
  }

  async findById(id: string): Promise<OrganizationDocument> {
    const organization = await this.organizationModel
      .findById(id)
      .populate('userId', 'name email')
      .exec();
    if (!organization || organization.isDeleted) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async findByUser(userId: string): Promise<OrganizationDocument[]> {
    return this.organizationModel
      .find({ userId: new Types.ObjectId(userId), isDeleted: false })
      .exec();
  }

  async update(
    id: string,
    updateDto: UpdateOrganizationDto,
    userId: string,
  ): Promise<OrganizationDocument> {
    const organization = await this.findById(id);
    if (this.getOrganizationOwnerId(organization) !== userId) {
      throw new ForbiddenException(
        'Only the creator can update this organization',
      );
    }
    Object.assign(organization, updateDto);
    return organization.save();
  }

  async softDelete(id: string, userId: string): Promise<OrganizationDocument> {
    const organization = await this.findById(id);
    if (this.getOrganizationOwnerId(organization) !== userId) {
      throw new ForbiddenException(
        'Only the creator can delete this organization',
      );
    }
    organization.isDeleted = true;
    return organization.save();
  }

  /**
   * Request verification for an organization
   * Requires legal documents to be uploaded first
   */
  async requestVerification(
    id: string,
    userId: string,
  ): Promise<OrganizationDocument> {
    const organization = await this.findById(id);

    // Check ownership
    if (this.getOrganizationOwnerId(organization) !== userId) {
      throw new ForbiddenException(
        'Only the organization owner can request verification',
      );
    }

    // Check if already verified or pending
    if (organization.verificationStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Organization is already verified');
    }
    if (organization.verificationStatus === VerificationStatus.PENDING) {
      throw new BadRequestException('Verification request is already pending');
    }

    // Check if legal documents are uploaded
    if (
      !organization.legalDocuments ||
      organization.legalDocuments.length === 0
    ) {
      throw new BadRequestException(
        'Legal documents are required for verification. Please upload your business license or registration certificate first.',
      );
    }

    organization.verificationStatus = VerificationStatus.PENDING;
    return organization.save();
  }

  /**
   * Update verification status (for moderator)
   */
  async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    adminId: string,
  ): Promise<OrganizationDocument> {
    const organization = await this.findById(id);
    organization.verificationStatus = status;

    // If verified, record on blockchain
    if (status === VerificationStatus.VERIFIED && organization.blockchainId) {
      try {
        await this.blockchainService.verifyOrganization(
          organization.blockchainId,
          adminId,
        );
      } catch (error) {
        console.error('Blockchain verification update failed:', error);
      }
    }

    return organization.save();
  }

  async getAuditTrail(id: string) {
    const organization = await this.findById(id);
    const blockchainStatus = this.blockchainService.getStatus();

    if (!organization.blockchainId) {
      return {
        entityType: 'organization',
        mongoRecord: organization,
        blockchain: {
          status: blockchainStatus,
          id: null,
          hasRecord: false,
        },
        auditTrail: [],
        message: 'No blockchain record available',
      };
    }

    const auditTrail = await this.blockchainService.getOrganizationHistory(
      organization.blockchainId,
    );

    return {
      entityType: 'organization',
      mongoRecord: organization,
      blockchain: {
        status: blockchainStatus,
        id: organization.blockchainId,
        hasRecord: auditTrail.length > 0,
      },
      auditTrail,
    };
  }

  /**
   * Get all organizations with pending verification (for moderator)
   */
  async findPendingVerifications(): Promise<OrganizationDocument[]> {
    return this.organizationModel
      .find({
        verificationStatus: VerificationStatus.PENDING,
        isDeleted: false,
      })
      .populate('userId', 'name email')
      .exec();
  }
}
