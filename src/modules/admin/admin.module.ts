import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { DonationsModule } from '../donations/donations.module';
import { VerificationModule } from '../verification/verification.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    UsersModule,
    OrganizationsModule,
    CampaignsModule,
    DonationsModule,
    VerificationModule,
    BlockchainModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
