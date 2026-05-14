import { Module, forwardRef } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { DonationsModule } from '../donations/donations.module';
import { AuditorController } from './auditor.controller';

@Module({
  imports: [forwardRef(() => CampaignsModule), DonationsModule],
  controllers: [AuditorController],
})
export class AuditorModule {}
