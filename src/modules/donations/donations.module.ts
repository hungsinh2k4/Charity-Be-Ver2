import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { DonationsQrService } from './donations-qr.service';
import { PendingDonationsService } from './pending-donations.service';
import { VietQRPaymentService } from './vietqr-payment.service';
import { Donation, DonationSchema } from './schemas/donation.schema';
import { PendingDonation, PendingDonationSchema } from './schemas/pending-donation.schema';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
      { name: PendingDonation.name, schema: PendingDonationSchema },
    ]),
    HttpModule,           // Cần cho VietQRPaymentService (gọi Sepay/Casso API)
    CampaignsModule,
    BlockchainModule,
    OrganizationsModule,
    UsersModule,
  ],
  controllers: [DonationsController],
  providers: [
    DonationsService,
    DonationsQrService,
    PendingDonationsService,
    VietQRPaymentService,
  ],
  exports: [DonationsService, PendingDonationsService],
})
export class DonationsModule {}
