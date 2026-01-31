import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DonationsModule } from './modules/donations/donations.module';
import { VerificationModule } from './modules/verification/verification.module';
import { AdminModule } from './modules/admin/admin.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';

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
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/charity',
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    BlockchainModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CampaignsModule,
    DonationsModule,
    VerificationModule,
    AdminModule,
  ],
})
export class AppModule {}
