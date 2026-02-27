import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import type { AuthenticatedUser } from '../auth/interfaces';

@ApiTags('Donations')
@Controller('donations')
export class DonationsController {
  constructor(private donationsService: DonationsService) { }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a donation (auth optional — links donation to account if logged in)' })
  @ApiResponse({ status: 201, description: 'Donation recorded successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found or inactive' })
  async create(
    @Body() createDto: CreateDonationDto,
    @Request() req: any,
  ) {
    // Lấy userId nếu có token hợp lệ (optional auth)
    const userId: string | undefined = req?.user?.userId;
    return this.donationsService.create(createDto, userId);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe email to campaign updates' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  async subscribeToUpdates(
    @Body() body: { campaignId: string; email: string },
  ) {
    return this.donationsService.subscribeToUpdates(
      body.campaignId,
      body.email,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get donations made by the logged-in user' })
  @ApiResponse({ status: 200, description: 'Returns list of donations by current user' })
  async findMyDonations(@CurrentUser() user: AuthenticatedUser) {
    return this.donationsService.findByUser(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get donation statistics' })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiResponse({ status: 200, description: 'Returns donation statistics' })
  async getStats(@Query('campaignId') campaignId?: string) {
    return this.donationsService.getStats(campaignId);
  }

  @Get('campaign/:campaignId')
  @ApiOperation({ summary: 'Get all donations for a campaign' })
  @ApiResponse({ status: 200, description: 'Returns list of donations' })
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.donationsService.findByCampaign(campaignId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get donation by ID' })
  @ApiResponse({ status: 200, description: 'Returns donation details' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  async findOne(@Param('id') id: string) {
    return this.donationsService.findById(id);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify donation on blockchain' })
  @ApiResponse({
    status: 200,
    description: 'Returns blockchain verification proof',
  })
  async verifyOnBlockchain(@Param('id') id: string) {
    return this.donationsService.verifyOnBlockchain(id);
  }
}
