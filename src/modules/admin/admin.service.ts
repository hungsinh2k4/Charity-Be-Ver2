import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { DonationsService } from '../donations/donations.service';
import { VerificationService } from '../verification/verification.service';
import { Role } from '../../common/enums';

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private campaignsService: CampaignsService,
    private donationsService: DonationsService,
    private verificationService: VerificationService,
  ) {}

  async getDashboardStats() {
    const [verificationStats, donationStats, allOrganizations, allCampaigns] =
      await Promise.all([
        this.verificationService.getStats(),
        this.donationsService.getStats(),
        this.organizationsService.findAll(),
        this.campaignsService.findAll(),
      ]);

    return {
      verification: verificationStats,
      donations: donationStats,
      organizations: {
        total: allOrganizations.length,
      },
      campaigns: {
        total: allCampaigns.meta.total,
        active: allCampaigns.data.filter((c) => c.isActive).length,
        verified: allCampaigns.data.filter(
          (c) => c.verificationStatus === 'VERIFIED',
        ).length,
      },
    };
  }

  async getAllUsers() {
    return this.usersService.findAll();
  }

  async updateUserRole(userId: string, role: Role) {
    return this.usersService.updateRole(userId, role);
  }
}
