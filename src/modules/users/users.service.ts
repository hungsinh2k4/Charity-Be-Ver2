import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role, VerificationStatus } from '../../common/enums';
import { RequestUserVerificationDto } from './dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(userData: {
    email: string;
    passwordHash: string;
    name: string;
    phone?: string;
    address?: string;
  }) {
    const user = new this.userModel(userData);
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-passwordHash').exec();
  }

  async updateProfile(userId: string, updateData: Partial<User>) {
    return this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-passwordHash')
      .exec();
  }

  async updateVerificationStatus(
    userId: string,
    status: VerificationStatus,
  ): Promise<UserDocument | null> {
    const updateData: any = { verificationStatus: status };
    if (status === VerificationStatus.VERIFIED) {
      updateData.verifiedAt = new Date();
    }
    return this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-passwordHash')
      .exec();
  }

  async updateRole(userId: string, role: Role): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { role }, { new: true })
      .select('-passwordHash')
      .exec();
  }

  /**
   * Request verification for a user
   * Requires identity document and selfie with document
   */
  async requestVerification(
    userId: string,
    dto: RequestUserVerificationDto,
  ): Promise<UserDocument | null> {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if already verified or pending
    if (user.verificationStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('User is already verified');
    }
    if (user.verificationStatus === VerificationStatus.PENDING) {
      throw new BadRequestException('Verification request is already pending');
    }

    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          identityDocument: dto.identityDocument,
          selfieWithDocument: dto.selfieWithDocument,
          verificationNote: dto.verificationNote,
          verificationStatus: VerificationStatus.PENDING,
        },
        { new: true },
      )
      .select('-passwordHash')
      .exec();
  }

  /**
   * Get all users with pending verification (for auditor)
   */
  async findPendingVerifications(): Promise<UserDocument[]> {
    return this.userModel
      .find({ verificationStatus: VerificationStatus.PENDING })
      .select('-passwordHash')
      .exec();
  }

  /**
   * Get user verification details by ID (for auditor)
   */
  async getVerificationDetails(userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(userId)
      .select(
        '_id email name identityDocument selfieWithDocument verificationNote verificationStatus createdAt',
      )
      .exec();
  }
}
