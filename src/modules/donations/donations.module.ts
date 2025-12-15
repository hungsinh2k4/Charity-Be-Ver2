import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { Donation, DonationSchema } from './schemas/donation.schema';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Donation.name, schema: DonationSchema }]),
        CampaignsModule,
        BlockchainModule,
    ],
    controllers: [DonationsController],
    providers: [DonationsService],
    exports: [DonationsService],
})
export class DonationsModule { }
