import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VerificationRequest, VerificationRequestDocument } from './schemas/verification-request.schema';
import { CreateVerificationRequestDto, ProcessVerificationDto } from './dto';
import { EntityType, RequestStatus, VerificationStatus } from '../../common/enums';
import { UsersService } from '../users/users.service';
import { CampaignsService } from '../campaigns/campaigns.service';

@Injectable()
export class VerificationService {
    constructor(
        @InjectModel(VerificationRequest.name) private verificationModel: Model<VerificationRequestDocument>,
        private usersService: UsersService,
        private campaignsService: CampaignsService,
    ) { }

    async create(
        createDto: CreateVerificationRequestDto,
        requesterId: string,
    ): Promise<VerificationRequestDocument> {
        // Check for existing pending request
        const existing = await this.verificationModel.findOne({
            entityType: createDto.entityType,
            entityId: new Types.ObjectId(createDto.entityId),
            status: RequestStatus.PENDING,
        }).exec();

        if (existing) {
            throw new BadRequestException('A pending verification request already exists');
        }

        const request = new this.verificationModel({
            ...createDto,
            entityId: new Types.ObjectId(createDto.entityId),
            requesterId: new Types.ObjectId(requesterId),
        });

        return request.save();
    }

    async findAll(status?: RequestStatus): Promise<VerificationRequestDocument[]> {
        const query = status ? { status } : {};
        return this.verificationModel
            .find(query)
            .populate('requesterId', 'name email')
            .populate('reviewedBy', 'name email')
            .sort({ createdAt: -1 })
            .exec();
    }

    async findById(id: string): Promise<VerificationRequestDocument> {
        const request = await this.verificationModel
            .findById(id)
            .populate('requesterId', 'name email')
            .populate('reviewedBy', 'name email')
            .exec();
        if (!request) {
            throw new NotFoundException('Verification request not found');
        }
        return request;
    }

    async findByEntity(entityType: EntityType, entityId: string): Promise<VerificationRequestDocument[]> {
        return this.verificationModel
            .find({
                entityType,
                entityId: new Types.ObjectId(entityId),
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async processRequest(
        id: string,
        processDto: ProcessVerificationDto,
        adminId: string,
    ): Promise<VerificationRequestDocument> {
        const request = await this.findById(id);

        if (request.status !== RequestStatus.PENDING) {
            throw new BadRequestException('This request has already been processed');
        }

        const newStatus = processDto.approved ? RequestStatus.APPROVED : RequestStatus.REJECTED;
        const verificationStatus = processDto.approved
            ? VerificationStatus.VERIFIED
            : VerificationStatus.REJECTED;

        // Update the entity's verification status
        switch (request.entityType) {
            case EntityType.USER:
                await this.usersService.updateVerificationStatus(
                    request.entityId.toString(),
                    verificationStatus,
                );
                break;
            case EntityType.CAMPAIGN:
                await this.campaignsService.updateVerificationStatus(
                    request.entityId.toString(),
                    verificationStatus,
                    adminId,
                );
                break;
        }

        // Update the request
        request.status = newStatus;
        request.reviewedBy = new Types.ObjectId(adminId);
        request.reviewNotes = processDto.reviewNotes;
        request.reviewedAt = new Date();

        return request.save();
    }

    async getStats() {
        const [pending, approved, rejected] = await Promise.all([
            this.verificationModel.countDocuments({ status: RequestStatus.PENDING }).exec(),
            this.verificationModel.countDocuments({ status: RequestStatus.APPROVED }).exec(),
            this.verificationModel.countDocuments({ status: RequestStatus.REJECTED }).exec(),
        ]);

        return { pending, approved, rejected, total: pending + approved + rejected };
    }
}
