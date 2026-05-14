import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards';
import type { AuthenticatedUser } from '../auth/interfaces';
import {
  DashboardBlockchainActivityResponseDto,
  DashboardResponseDto,
} from './dto/dashboard-response.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user dashboard data',
    description:
      'Returns summary cards, owned organizations, owned campaigns, recent confirmed donations, and quick actions for the dashboard screen.',
  })
  @ApiQuery({
    name: 'recentLimit',
    required: false,
    schema: {
      type: 'integer',
      default: 3,
      minimum: 1,
      maximum: 20,
    },
    description: 'Number of recent donations to return. Default: 3, max: 20.',
  })
  @ApiOkResponse({
    description: 'Dashboard data for the authenticated user',
    type: DashboardResponseDto,
  })
  async getMyDashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('recentLimit') recentLimit?: string,
  ) {
    const parsedRecentLimit = recentLimit ? parseInt(recentLimit, 10) : 3;

    return this.dashboardService.getMyDashboard(
      user.userId,
      Number.isFinite(parsedRecentLimit) ? parsedRecentLimit : 3,
    );
  }

  @Get('blockchain-activity')
  @ApiOperation({
    summary: 'Get recent blockchain activity',
    description:
      'Returns the latest blockchain-backed organization, campaign, and donation records for the dashboard activity feed.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: {
      type: 'integer',
      default: 1,
      minimum: 1,
    },
    description: 'Page number. Default: 1.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: {
      type: 'integer',
      default: 10,
      minimum: 1,
      maximum: 50,
    },
    description: 'Number of activities to return. Default: 10, max: 50.',
  })
  @ApiOkResponse({
    description: 'Paginated recent blockchain activity feed',
    type: DashboardBlockchainActivityResponseDto,
  })
  async getRecentBlockchainActivity(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    return this.dashboardService.getRecentBlockchainActivity({
      page: Number.isFinite(parsedPage) ? parsedPage : 1,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 10,
    });
  }
}
