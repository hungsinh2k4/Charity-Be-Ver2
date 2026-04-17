import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto';
import { JwtAuthGuard, VerifiedUserGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { VerificationStatus, Role } from '../../common/enums';
import type { AuthenticatedUser } from '../auth/interfaces';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, VerifiedUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new campaign (requires verified user)' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({
    status: 403,
    description: 'User must be verified to create campaign',
  })
  async create(
    @Body() createDto: CreateCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.create(createDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all campaigns with optional filters and pagination' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({
    name: 'verificationStatus',
    enum: VerificationStatus,
    required: false,
  })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of campaigns' })
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('verificationStatus') verificationStatus?: VerificationStatus,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.campaignsService.findAll({
      organizationId,
      verificationStatus,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    }, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaigns created by current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of campaigns created by current user',
  })
  async findMyCampaigns(@CurrentUser() user: AuthenticatedUser) {
    return this.campaignsService.findByCreator(user.userId);
  }

  // ==================== AUDITOR ENDPOINTS ====================

  @Get('pending-verifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDITOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Auditor] Get all campaigns with pending verification',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of campaigns pending verification',
  })
  async getPendingVerifications() {
    return this.campaignsService.findPendingVerifications();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Returns campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign (creator only)' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to update this campaign',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCampaignDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.update(id, updateDto, user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete campaign (soft delete, creator only)' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.softDelete(id, user.userId);
  }

  @Patch(':id/verification-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDITOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '[Auditor] Approve or reject campaign verification',
  })
  @ApiResponse({
    status: 200,
    description: 'Campaign verification status updated',
  })
  async updateVerificationStatus(
    @Param('id') id: string,
    @Body('status') status: VerificationStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.campaignsService.updateVerificationStatus(
      id,
      status,
      user.userId,
    );
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Get campaign blockchain audit trail' })
  @ApiResponse({ status: 200, description: 'Returns blockchain audit history' })
  async getAuditTrail(@Param('id') id: string) {
    return this.campaignsService.getAuditTrail(id);
  }
}
