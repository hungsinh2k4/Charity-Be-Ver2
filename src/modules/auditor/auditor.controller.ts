import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CampaignsService } from '../campaigns/campaigns.service';
import { DonationsService } from '../donations/donations.service';
import { Role } from '../../common/enums';

@ApiTags('Auditor')
@Controller('auditor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUDITOR, Role.ADMIN)
@ApiBearerAuth()
export class AuditorController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly donationsService: DonationsService,
  ) {}

  @Get('audit/campaigns/:id')
  @ApiOperation({ summary: 'Get campaign fundraising audit trail' })
  @ApiResponse({
    status: 200,
    description: 'Returns combined MongoDB and blockchain fundraising audit trail',
  })
  async getCampaignAudit(@Param('id') id: string) {
    return this.campaignsService.getAuditTrail(id);
  }

  @Get('audit/donations/:id')
  @ApiOperation({ summary: 'Get donation payment audit trail' })
  @ApiResponse({
    status: 200,
    description: 'Returns combined MongoDB and blockchain payment audit trail',
  })
  async getDonationAudit(@Param('id') id: string) {
    return this.donationsService.getAuditTrail(id);
  }
}
