import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DonationsModule } from './modules/donations/donations.module';
import { VerificationModule } from './modules/verification/verification.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditorModule } from './modules/auditor/auditor.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { ModeratorModule } from './modules/moderator/moderator.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/charity',
      }),
      inject: [ConfigService],
    }),

    // Scheduler (cron jobs — polling tự động kiểm tra GD VietQR)
    ScheduleModule.forRoot(),

    // Feature Modules
    BlockchainModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CampaignsModule,
    DonationsModule,
    VerificationModule,
    AdminModule,
    AuditorModule,
    ModeratorModule,
    BlogsModule,
    UploadsModule,
    DashboardModule,
  ],
})
export class AppModule {}
