import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role, VerificationStatus } from '../../common/enums';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async create(userData: { email: string; passwordHash: string; name: string }) {
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
}
