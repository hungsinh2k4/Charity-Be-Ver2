import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { DonationsQrService } from './donations-qr.service';
import { Donation, DonationSchema } from './schemas/donation.schema';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
    ]),
    CampaignsModule,
    BlockchainModule,
    OrganizationsModule,
    UsersModule,
  ],
  controllers: [DonationsController],
  providers: [DonationsService, DonationsQrService],
  exports: [DonationsService],
})
export class DonationsModule { }
