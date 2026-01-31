import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import {
  VerificationRequest,
  VerificationRequestSchema,
} from './schemas/verification-request.schema';
import { UsersModule } from '../users/users.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VerificationRequest.name, schema: VerificationRequestSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => CampaignsModule),
  ],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
