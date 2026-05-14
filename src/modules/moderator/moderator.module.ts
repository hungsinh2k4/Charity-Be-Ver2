import { Module, forwardRef } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { VerificationModule } from '../verification/verification.module';
import { ModeratorController } from './moderator.controller';

@Module({
  imports: [
    VerificationModule,
    forwardRef(() => UsersModule),
    OrganizationsModule,
    forwardRef(() => CampaignsModule),
  ],
  controllers: [ModeratorController],
})
export class ModeratorModule {}
