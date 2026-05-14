import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces';
import { CampaignsService } from '../campaigns/campaigns.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsersService } from '../users/users.service';
import { ProcessVerificationDto } from '../verification/dto';
import { VerificationService } from '../verification/verification.service';
import { RequestStatus, Role } from '../../common/enums';

@ApiTags('Moderator')
@Controller('moderator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MODERATOR)
@ApiBearerAuth()
export class ModeratorController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly campaignsService: CampaignsService,
  ) {}

  @Get('verification/requests')
  @ApiOperation({ summary: 'Get all verification requests for moderation' })
  @ApiQuery({ name: 'status', enum: RequestStatus, required: false })
  @ApiResponse({ status: 200, description: 'Returns verification requests' })
  async getVerificationRequests(@Query('status') status?: RequestStatus) {
    return this.verificationService.findAll(status);
  }

  @Get('verification/requests/:id')
  @ApiOperation({ summary: 'Get verification request details for moderation' })
  @ApiResponse({ status: 200, description: 'Returns verification request details' })
  async getVerificationRequest(@Param('id') id: string) {
    return this.verificationService.findById(id);
  }

  @Post('verification/requests/:id/process')
  @ApiOperation({ summary: 'Approve or reject a verification request' })
  @ApiResponse({ status: 200, description: 'Verification request processed' })
  @ApiResponse({ status: 400, description: 'Request already processed' })
  async processVerificationRequest(
    @Param('id') id: string,
    @Body() processDto: ProcessVerificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verificationService.processRequest(id, processDto, user.userId);
  }

  @Get('verification/stats')
  @ApiOperation({ summary: 'Get verification statistics for moderation' })
  @ApiResponse({ status: 200, description: 'Returns verification statistics' })
  async getVerificationStats() {
    return this.verificationService.getStats();
  }

  @Get('users/pending-verifications')
  @ApiOperation({ summary: 'Get users pending verification' })
  @ApiResponse({ status: 200, description: 'Returns users pending verification' })
  async getPendingUserVerifications() {
    return this.usersService.findPendingVerifications();
  }

  @Get('users/:id/verification-details')
  @ApiOperation({ summary: 'Get user verification details' })
  @ApiResponse({ status: 200, description: 'Returns user verification details' })
  async getUserVerificationDetails(@Param('id') id: string) {
    return this.usersService.getVerificationDetails(id);
  }

  @Get('organizations/pending-verifications')
  @ApiOperation({ summary: 'Get organizations pending verification' })
  @ApiResponse({ status: 200, description: 'Returns organizations pending verification' })
  async getPendingOrganizationVerifications() {
    return this.organizationsService.findPendingVerifications();
  }

  @Get('campaigns/pending-verifications')
  @ApiOperation({ summary: 'Get campaigns pending verification' })
  @ApiResponse({ status: 200, description: 'Returns campaigns pending verification' })
  async getPendingCampaignVerifications() {
    return this.campaignsService.findPendingVerifications();
  }
}
